'use strict';

/**
 * Report Export Service
 * 
 * Generates CFIT session reports in XLSX and PDF formats
 */

const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Format date to Indonesian format
 */
function formatDate(date, includeTime = true) {
  if (!date) return '-';
  const d = new Date(date);
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }
  return d.toLocaleDateString('id-ID', options).replace(/\./g, ':');
}

/**
 * Calculate LOVE test results based on answer frequencies
 * Maps answer letters to Love Languages and calculates percentages
 * Uses scaleA/scaleB mapping from questions for forced choice format
 */
function calculateLoveLanguageScores(session, testType, questions) {
  console.log('🔍 [LOVE CALC] Starting calculation for session:', session.id);
  console.log('🔍 [LOVE CALC] Raw answers:', JSON.stringify(session.answers).substring(0, 200));
  
  // Mapping dari jawaban ke Love Language
  const answerToLoveLanguage = {
    'A': 'Words of Affirmation',
    'B': 'Quality Time',
    'C': 'Receiving Gifts',
    'D': 'Acts of Service',
    'E': 'Physical Touch'
  };

  // Parse answers dari session
  let answers = session.answers || {};

  console.log('🔍 [LOVE CALC] Initial answers type:', typeof answers);

  if (typeof answers === 'string') {
    try {
      answers = JSON.parse(answers);
      console.log('🔍 [LOVE CALC] Parsed string answers');
    } catch (e) {
      console.error('❌ [LOVE CALC] Failed to parse answers:', e.message);
      answers = {};
    }
  }
  
  console.log('🔍 [LOVE CALC] Answers type:', Array.isArray(answers) ? 'array' : 'object');
  console.log('🔍 [LOVE CALC] Answers keys/length:', Array.isArray(answers) ? answers.length : Object.keys(answers).length);

  // Initialize counters for each love language scale
  const answerCount = {
    'A': 0,
    'B': 0,
    'C': 0,
    'D': 0,
    'E': 0
  };

  // Parse questions if needed
  let parsedQuestions = questions || testType?.questions || [];
  if (typeof parsedQuestions === 'string') {
    try {
      parsedQuestions = JSON.parse(parsedQuestions);
    } catch (e) {
      console.error('❌ [LOVE CALC] Failed to parse questions:', e.message);
      parsedQuestions = [];
    }
  }

  console.log('🔍 [LOVE CALC] Questions count:', parsedQuestions.length);

  // Build question map for quick lookup (by id)
  const questionMap = {};
  parsedQuestions.forEach(q => {
    questionMap[q.id] = q;
  });

  console.log('🔍 [LOVE CALC] Question map keys:', Object.keys(questionMap).slice(0, 5));

  // Helper to extract answer value from different formats
  const getAnswerValue = (answerData) => {
    if (!answerData) return null;
    if (typeof answerData === 'string') return answerData.toUpperCase();
    if (typeof answerData === 'object' && answerData !== null && answerData.answer) {
      return typeof answerData.answer === 'string' ? answerData.answer.toUpperCase() : null;
    }
    return null;
  };

  // Count answers using scaleA/scaleB mapping
  let mappedAnswers = [];
  Object.entries(answers).forEach(([questionId, answerData]) => {
    const question = questionMap[questionId] || questionMap[parseInt(questionId)];
    if (!question) {
      console.warn('⚠️  [LOVE CALC] Question not found for id:', questionId);
      return;
    }

    const userAnswer = getAnswerValue(answerData);
    if (!userAnswer) return;

    // Map A/B choice to actual scale (scaleA or scaleB)
    let scale = null;
    if (userAnswer === 'A' && question.scaleA) {
      scale = question.scaleA.toUpperCase();
    } else if (userAnswer === 'B' && question.scaleB) {
      scale = question.scaleB.toUpperCase();
    }

    if (scale && answerCount.hasOwnProperty(scale)) {
      answerCount[scale]++;
      mappedAnswers.push({ questionId, userAnswer, scale });
    }
  });
  
  console.log('🔍 [LOVE CALC] Mapped answers sample:', mappedAnswers.slice(0, 5));
  console.log('🔍 [LOVE CALC] Answer count by scale:', answerCount);

  // Get total number of questions
  let totalQuestions = parsedQuestions.length || 30; // Default 30 for LOVE test
  if (testType && testType.questionCount && testType.questionCount > 0) {
    totalQuestions = testType.questionCount;
  }
  
  console.log('🔍 [LOVE CALC] Total questions:', totalQuestions);
  console.log('🔍 [LOVE CALC] Total answered:', mappedAnswers.length);

  // Calculate percentages and map to Love Languages
  const loveLanguageScores = [];
  for (const [letter, count] of Object.entries(answerCount)) {
    const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
    const loveLanguage = answerToLoveLanguage[letter];
    
    loveLanguageScores.push({
      letter: letter,
      name: loveLanguage,
      count: count,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      score: count // For compatibility
    });
  }

  // Sort by percentage (highest first)
  loveLanguageScores.sort((a, b) => b.percentage - a.percentage);
  
  console.log('🔍 [LOVE CALC] Top 3 results:');
  loveLanguageScores.slice(0, 3).forEach((lang, idx) => {
    console.log(`  ${idx + 1}. ${lang.name}: ${lang.percentage}% (${lang.count}/${totalQuestions})`);
  });

  return {
    scores: loveLanguageScores,
    totalQuestions: totalQuestions,
    totalAnswered: mappedAnswers.length,
    answerCount: answerCount,
    mappedAnswers: mappedAnswers // For debugging
  };
}

/**
 * Calculate age from birthDate
 */
function calculateAge(birthDate) {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get subtest display name
 */
function getSubtestName(subtest) {
  const names = {
    'series': 'Series',
    'classification': 'Classification',
    'matrices': 'Matrices',
    'topology': 'Conditions',
    'conditions': 'Conditions'
  };
  return names[subtest?.toLowerCase()] || subtest;
}

/**
 * Prepare report data from session
 */
function prepareReportData(session, patient, testType, questions) {
  // Parse questions if string
  let parsedQuestions = questions;
  if (typeof parsedQuestions === 'string') {
    try {
      parsedQuestions = JSON.parse(parsedQuestions);
    } catch (e) {
      parsedQuestions = [];
    }
  }

  // Parse answers - handle both string and object
  let answers = session.answers || {};
  if (typeof answers === 'string') {
    try {
      answers = JSON.parse(answers);
    } catch (e) {
      answers = {};
    }
  }
  
  // Build question map for quick lookup
  const questionMap = {};
  parsedQuestions.forEach(q => {
    questionMap[q.id] = q;
  });

  // Helper to extract answer value (support all nested formats)
  const getAnswerValue = (answerData) => {
    if (!answerData) return null;
    
    // If string, return directly
    if (typeof answerData === 'string') {
      return answerData;
    }
    
    // If object, extract answer property recursively
    if (typeof answerData === 'object') {
      let current = answerData;
      let depth = 0;
      const maxDepth = 5;
      
      while (current && typeof current === 'object' && current.answer !== undefined && depth < maxDepth) {
        if (typeof current.answer === 'string') {
          return current.answer;
        }
        current = current.answer;
        depth++;
      }
      
      if (typeof current === 'string') {
        return current;
      }
    }
    
    return null;
  };

  // Helper to get answer timestamp (check at root level)
  const getAnswerTimestamp = (answerData) => {
    if (!answerData) return null;
    if (typeof answerData === 'object' && answerData.timestamp) {
      return answerData.timestamp;
    }
    return null;
  };

  // Helper to get answer duration in seconds (check at root level)
  const getAnswerDuration = (answerData) => {
    if (!answerData) return 0;
    if (typeof answerData === 'object' && answerData.duration !== undefined) {
      return answerData.duration;
    }
    return 0;
  };

  // Calculate duration in minutes
  const durationMinutes = session.completedAt && session.startedAt
    ? Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000)
    : 0;

  // Calculate scores per subtest
  const subtestStats = {};
  const subtestOrder = ['series', 'classification', 'matrices', 'topology'];
  
  subtestOrder.forEach(subtest => {
    subtestStats[subtest] = {
      name: getSubtestName(subtest),
      totalQuestions: 0,
      answered: 0,
      correct: 0,
      timeMinutes: 0,
      accuracy: 0,
      status: 'Selesai'
    };
  });

  // Calculate stats from questions (exclude instruction items)
  parsedQuestions
    .filter(q => q.type === 'question') // Only count actual questions, not instructions
    .forEach(q => {
      const subtest = q.subtest?.toLowerCase();
      if (subtestStats[subtest]) {
        subtestStats[subtest].totalQuestions++;
        
        const answerData = answers[q.id];
        const userAnswer = getAnswerValue(answerData);
        const duration = getAnswerDuration(answerData);
        
        if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
          subtestStats[subtest].answered++;
          subtestStats[subtest].timeMinutes += Math.round(duration / 60); // Convert seconds to minutes
          
          if (userAnswer === q.answer) {
            subtestStats[subtest].correct++;
          }
        }
      }
    });

  // Calculate accuracy per subtest
  Object.keys(subtestStats).forEach(subtest => {
    const stats = subtestStats[subtest];
    if (stats.totalQuestions > 0) {
      stats.accuracy = Math.round((stats.correct / stats.totalQuestions) * 100);
    }
    if (stats.answered < stats.totalQuestions) {
      stats.status = 'Belum Selesai';
    }
  });

  // Calculate totals
  let totalQuestions = 0;
  let totalAnswered = 0;
  let totalCorrect = 0;

  Object.values(subtestStats).forEach(stats => {
    totalQuestions += stats.totalQuestions;
    totalAnswered += stats.answered;
    totalCorrect += stats.correct;
  });

  const overallAccuracy = totalQuestions > 0 
    ? Math.round((totalCorrect / totalQuestions) * 100) 
    : 0;

  // Get IQ results from session scores
  const scores = session.scores || {};
  const interpretation = session.interpretation || {};

  // Build detail answers (exclude instruction items)
  const detailAnswers = [];
  let rowNum = 1;

  // Filter actual questions (not instructions)
  const actualQuestions = parsedQuestions.filter(q => q.type === 'question');
  
  // Debug: log if no questions found
  if (actualQuestions.length === 0) {
    console.warn('⚠️  No actual questions found in test type. Total items:', parsedQuestions.length);
  }
  
  // Debug: log if no answers found
  if (Object.keys(answers).length === 0) {
    console.warn('⚠️  No answers found in session');
  }

  actualQuestions.forEach(q => {
    const answerData = answers[q.id];
    const userAnswer = getAnswerValue(answerData) || '-';
    const correctAnswer = q.answer || '-';
    const isCorrect = userAnswer === correctAnswer;
    const duration = getAnswerDuration(answerData);
    const timestamp = getAnswerTimestamp(answerData);
    
    // Extract question number from id (e.g., "series_1" -> 1)
    const qNum = parseInt(q.id.split('_')[1]) || rowNum;
    
    detailAnswers.push({
      no: rowNum,
      subtest: getSubtestName(q.subtest),
      questionNo: qNum,
      question: q.imagePath ? q.imagePath.replace('/psychology/cfit/', '') : `Soal ${qNum}`,
      userAnswer: userAnswer,
      correctAnswer: correctAnswer,
      result: isCorrect ? 'Benar' : 'Salah',
      timeSeconds: duration,
      answerTime: timestamp ? formatDate(new Date(timestamp)) : formatDate(session.completedAt)
    });
    rowNum++;
  });

  return {
    patient: {
      fullName: patient?.fullName || '-',
      sex: patient?.sex || '-',
      age: calculateAge(patient?.birthDate),
      birthDate: formatDate(patient?.birthDate, false),
      email: patient?.email || '-',
      phone: patient?.phone || '-'
    },
    session: {
      id: session.id || session.sessionToken || '-',
      sessionNumber: session.sessionNumber || '-',
      testName: testType?.name || 'Test Intelegensi',
      startedAt: formatDate(session.startedAt),
      completedAt: formatDate(session.completedAt),
      status: (session.status || 'unknown').toUpperCase(),
      durationMinutes: durationMinutes
    },
    summary: {
      totalQuestions,
      totalAnswered,
      totalCorrect,
      overallAccuracy,
      totalTimeMinutes: durationMinutes
    },
    iqResult: {
      score: scores.iq || scores.IQ || scores.rawScore || '-',
      category: interpretation.category || interpretation.iqCategory || '-',
      normUsed: interpretation.normUsed || interpretation.ageGroup || '-'
    },
    subtestStats: Object.values(subtestStats),
    detailAnswers
  };
}

/**
 * Generate XLSX report
 */
function generateXLSX(reportData) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Informasi Peserta
  const sheet1Data = [
    ['Nama Peserta', reportData.patient.fullName],
    ['Jenis Kelamin', reportData.patient.sex],
    ['Umur', reportData.patient.age],
    ['Tanggal Lahir', reportData.patient.birthDate],
    ['Email', reportData.patient.email],
    ['Telepon', reportData.patient.phone],
    [''],
    ['Informasi Tes'],
    ['ID Sesi', reportData.session.id],
    ['Nama Tes', reportData.session.testName],
    ['Waktu Mulai', reportData.session.startedAt],
    ['Waktu Selesai', reportData.session.completedAt],
    ['Status', reportData.session.status],
    ['Durasi (menit)', reportData.session.durationMinutes],
    [''],
    ['Ringkasan Hasil'],
    ['Total Soal', reportData.summary.totalQuestions],
    ['Total Terjawab', reportData.summary.totalAnswered],
    ['Total Benar', reportData.summary.totalCorrect],
    ['Akurasi Keseluruhan (%)', reportData.summary.overallAccuracy],
    ['Total Waktu (menit)', reportData.summary.totalTimeMinutes],
    [''],
    ['Hasil IQ'],
    ['Skor IQ', reportData.iqResult.score],
    ['Kategori', reportData.iqResult.category],
    ['Norma Digunakan', reportData.iqResult.normUsed]
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  
  // Set column widths
  ws1['!cols'] = [{ wch: 25 }, { wch: 40 }];
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Informasi Peserta');

  // Sheet 2: Progress Subtes
  const sheet2Header = ['No', 'Nama Subtes', 'Total Soal', 'Terjawab', 'Benar', 'Waktu (menit)', 'Akurasi (%)', 'Status'];
  const sheet2Data = [sheet2Header];
  
  reportData.subtestStats.forEach((stats, index) => {
    sheet2Data.push([
      index + 1,
      stats.name,
      stats.totalQuestions,
      stats.answered,
      stats.correct,
      stats.timeMinutes,
      stats.accuracy,
      stats.status
    ]);
  });
  
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // Nama Subtes
    { wch: 12 }, // Total Soal
    { wch: 12 }, // Terjawab
    { wch: 8 },  // Benar
    { wch: 15 }, // Waktu
    { wch: 12 }, // Akurasi
    { wch: 15 }  // Status
  ];
  
  XLSX.utils.book_append_sheet(wb, ws2, 'Progress Subtes');

  // Sheet 3: Detail Jawaban
  const sheet3Header = ['No', 'Subtes', 'No Soal', 'Pertanyaan', 'Jawaban User', 'Jawaban Benar', 'Benar/Salah', 'Waktu (detik)', 'Waktu Jawab'];
  const sheet3Data = [sheet3Header];
  
  reportData.detailAnswers.forEach(detail => {
    sheet3Data.push([
      detail.no,
      detail.subtest,
      detail.questionNo,
      detail.question,
      detail.userAnswer,
      detail.correctAnswer,
      detail.result,
      detail.timeSeconds,
      detail.answerTime
    ]);
  });
  
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Subtes
    { wch: 8 },  // No Soal
    { wch: 20 }, // Pertanyaan
    { wch: 15 }, // Jawaban User
    { wch: 15 }, // Jawaban Benar
    { wch: 12 }, // Benar/Salah
    { wch: 15 }, // Waktu (detik)
    { wch: 22 }  // Waktu Jawab
  ];
  
  XLSX.utils.book_append_sheet(wb, ws3, 'Detail Jawaban');

  return wb;
}

/**
 * Generate PDF report for LOVE test
 */
function generatePDF_LOVE(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4'
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper functions
      const drawLine = (y) => {
        doc.moveTo(40, y).lineTo(555, y).stroke();
      };

      const addSectionTitle = (title, fontSize = 12) => {
        doc.fontSize(fontSize).font('Helvetica-Bold').text(title);
        drawLine(doc.y + 2);
        doc.moveDown(0.5);
      };

      const addKeyValue = (key, value, fontSize = 10) => {
        doc.fontSize(fontSize).font('Helvetica');
        doc.font('Helvetica-Bold').text(key, { continued: true, width: 150 });
        doc.font('Helvetica').text(`: ${value}`, { width: 400 });
      };

      // ===== HEADER =====
      doc.fontSize(16).font('Helvetica-Bold')
         .text('LAPORAN HASIL TES LOVE', { align: 'center' });
      doc.fontSize(10).font('Helvetica')
         .text('Love Language Test - Bahasa Cinta', { align: 'center' });
      doc.moveDown(2);

      // ===== INFORMASI PESERTA =====
      addSectionTitle('INFORMASI PESERTA');
      addKeyValue('Nama Lengkap', reportData.patient.fullName);
      addKeyValue('Jenis Kelamin', reportData.patient.sex === 'male' ? 'Laki-laki' : reportData.patient.sex === 'female' ? 'Perempuan' : reportData.patient.sex);
      addKeyValue('Tanggal Lahir', reportData.patient.birthDate);
      addKeyValue('Umur', `${reportData.patient.age} tahun`);
      if (reportData.patient.email !== '-') addKeyValue('Email', reportData.patient.email);
      if (reportData.patient.phone !== '-') addKeyValue('Telepon', reportData.patient.phone);
      doc.moveDown(1.5);

      // ===== INFORMASI TES =====
      addSectionTitle('INFORMASI TES');
      addKeyValue('Nomor Sesi', reportData.session.sessionNumber);
      addKeyValue('Nama Tes', reportData.session.testName);
      addKeyValue('Waktu Mulai', reportData.session.startedAt);
      addKeyValue('Waktu Selesai', reportData.session.completedAt);
      addKeyValue('Durasi', `${reportData.session.durationMinutes} menit`);
      addKeyValue('Status', reportData.session.status);
      doc.moveDown(1.5);

      // ===== RINGKASAN HASIL =====
      addSectionTitle('RINGKASAN HASIL');
      
      // Calculate LOVE scores from session data
      const loveResults = reportData.loveLanguageResults || {};
      const loveScores = loveResults.scores || [];
      
      const summaryData = [
        ['Total Soal', loveResults.totalQuestions || reportData.summary.totalQuestions],
        ['Soal Terjawab', loveResults.totalAnswered || reportData.summary.totalAnswered]
      ];
      
      summaryData.forEach(([key, value]) => {
        addKeyValue(key, value, 10);
      });
      doc.moveDown(1.5);

      // ===== BAHASA CINTA ANDA (HIGHLIGHTED BOX) =====
      addSectionTitle('BAHASA CINTA ANDA');

      // Display all 5 love languages with percentages
      if (loveScores.length > 0) {
        loveScores.forEach((lang, index) => {
          const boxY = doc.y + 5;
          const boxHeight = 60;
          
          // Color scheme - first 3 are highlighted, rest are muted
          const colors = [
            { bg: '#fce8e8', border: '#c92a2a', text: '#c92a2a' }, // 1st - Red
            { bg: '#e8f4f8', border: '#2c5aa0', text: '#2c5aa0' }, // 2nd - Blue
            { bg: '#e8f8f0', border: '#2d8659', text: '#2d8659' }, // 3rd - Green
            { bg: '#f5f5f5', border: '#868e96', text: '#495057' }, // 4th - Gray
            { bg: '#f5f5f5', border: '#868e96', text: '#495057' }  // 5th - Gray
          ];
          
          const color = colors[index] || colors[4];
          
          doc.rect(40, boxY, 515, boxHeight).fillAndStroke(color.bg, color.border);
          doc.fillColor('#000');
          
          // Ranking badge
          doc.fontSize(10).font('Helvetica-Bold')
             .fillColor(color.text)
             .text(`#${index + 1}`, 50, boxY + 12, { width: 40, align: 'center' });
          
          // Love language name
          doc.y = boxY + 12;
          doc.fontSize(12).font('Helvetica-Bold')
             .fillColor('#000')
             .text(lang.name, 100, doc.y, { align: 'left' });
          
          // Count and percentage
          doc.y = boxY + 32;
          doc.fontSize(20).font('Helvetica-Bold')
             .fillColor(color.text)
             .text(`${lang.percentage}%`, 100, doc.y, { align: 'left' });
          
          doc.fontSize(9).font('Helvetica')
             .fillColor('#666')
             .text(`(${lang.count} dari ${loveResults.totalQuestions} jawaban)`, 180, doc.y + 6);
          
          // Progress bar
          const barY = boxY + boxHeight - 12;
          const barWidth = 460;
          const barHeight = 8;
          const barX = 48;
          
          // Background bar
          doc.rect(barX, barY, barWidth, barHeight).fill('#e9ecef');
          
          // Filled bar based on percentage
          const fillWidth = (barWidth * lang.percentage) / 100;
          doc.rect(barX, barY, fillWidth, barHeight).fill(color.text);
          
          doc.y = boxY + boxHeight + 10;
        });
      } else {
        doc.fontSize(10).font('Helvetica')
           .text('Data bahasa cinta tidak tersedia', { align: 'center' });
      }
      
      doc.moveDown(1);

      // ===== INTERPRETASI =====
      doc.addPage();
      addSectionTitle('INTERPRETASI BAHASA CINTA', 13);
      
      const loveLanguageDesc = {
        'Words of Affirmation': {
          description: 'Anda merasa dicintai ketika pasangan memberikan pujian, kata-kata dukungan, dan afirmasi verbal yang tulus.',
          tips: 'Ekspresikan apresiasi Anda dengan kata-kata yang tulus. Tuliskan catatan cinta atau pesan singkat untuk pasangan.'
        },
        'Quality Time': {
          description: 'Anda merasa dicintai ketika pasangan memberikan perhatian penuh dan menghabiskan waktu berkualitas bersama Anda.',
          tips: 'Luangkan waktu khusus tanpa gangguan gadget. Lakukan aktivitas bersama yang Anda berdua nikmati.'
        },
        'Receiving Gifts': {
          description: 'Anda merasa dicintai ketika pasangan memberikan hadiah sebagai simbol perhatian dan kasih sayang.',
          tips: 'Hadiah tidak harus mahal. Perhatikan hal-hal kecil yang diinginkan pasangan dan berikan sebagai kejutan.'
        },
        'Acts of Service': {
          description: 'Anda merasa dicintai ketika pasangan membantu Anda melakukan hal-hal yang meringankan beban Anda.',
          tips: 'Bantu pasangan dengan tugas sehari-hari. Tindakan kecil seperti menyiapkan makan atau membereskan rumah sangat berarti.'
        },
        'Physical Touch': {
          description: 'Anda merasa dicintai melalui sentuhan fisik seperti pelukan, ciuman, dan kedekatan fisik lainnya.',
          tips: 'Tunjukkan kasih sayang melalui sentuhan - genggam tangan, peluk, atau duduk berdekatan saat bersama.'
        }
      };

      if (loveScores.length > 0) {
        loveScores.forEach((lang, index) => {
          // Title with ranking and percentage
          doc.fontSize(12).font('Helvetica-Bold')
             .fillColor('#000')
             .text(`${index + 1}. ${lang.name}`, { underline: true });
          
          doc.fontSize(10).font('Helvetica-Bold')
             .fillColor(index < 3 ? '#c92a2a' : '#666')
             .text(`${lang.percentage}% (${lang.count} dari ${loveResults.totalQuestions} jawaban)`, { underline: false });
          doc.moveDown(0.3);
          
          // Description
          const langInfo = loveLanguageDesc[lang.name];
          if (langInfo) {
            doc.fontSize(10).font('Helvetica')
               .fillColor('#000')
               .text(langInfo.description, { align: 'justify' });
            doc.moveDown(0.5);
            
            // Tips for top 3
            if (index < 3) {
              doc.fontSize(9).font('Helvetica-Oblique')
                 .fillColor('#495057')
                 .text(`💡 Tips: ${langInfo.tips}`, { align: 'justify' });
            }
          } else {
            doc.fontSize(10).font('Helvetica')
               .text('Deskripsi tidak tersedia.', { align: 'justify' });
          }
          
          doc.moveDown(1);
        });
      }

      // ===== REKOMENDASI =====
      doc.moveDown(1);
      addSectionTitle('REKOMENDASI');
      
      doc.fontSize(10).font('Helvetica')
         .text('Berdasarkan hasil tes bahasa cinta Anda:', { align: 'justify' });
      doc.moveDown(0.5);
      
      if (loveScores.length > 0) {
        const primary = loveScores[0];
        const secondary = loveScores[1];
        
        doc.fontSize(10).font('Helvetica');
        const recommendations = [
          `Bahasa cinta utama Anda adalah "${primary.name}" (${primary.percentage}%). Pastikan pasangan Anda memahami dan mempraktikkan ini.`,
          secondary ? `Bahasa cinta kedua Anda adalah "${secondary.name}" (${secondary.percentage}%). Ini juga penting untuk kepuasan emosional Anda.` : null,
          'Komunikasikan kebutuhan emosional Anda dengan jelas kepada pasangan.',
          'Pelajari dan praktikkan bahasa cinta pasangan Anda, meskipun berbeda dengan Anda.',
          'Ingat bahwa setiap orang memiliki kombinasi unik dari kelima bahasa cinta.',
          'Lakukan tes ini secara berkala karena bahasa cinta dapat berubah seiring waktu.'
        ].filter(r => r !== null);
        
        doc.list(recommendations, { bulletRadius: 2 });
      }
      
      doc.moveDown(1.5);
      
      // ===== STATISTIK DISTRIBUSI =====
      addSectionTitle('DISTRIBUSI BAHASA CINTA');
      
      if (loveScores.length > 0) {
        doc.fontSize(9).font('Helvetica')
           .text('Grafik distribusi persentase kelima bahasa cinta Anda:', { align: 'left' });
        doc.moveDown(0.5);
        
        // Simple bar chart
        const chartStartY = doc.y + 10;
        const chartHeight = 150;
        const chartWidth = 450;
        const chartX = 60;
        const barSpacing = 5;
        const barWidth = (chartWidth - (barSpacing * 4)) / 5;
        
        loveScores.forEach((lang, index) => {
          const x = chartX + (index * (barWidth + barSpacing));
          const barHeight = (chartHeight * lang.percentage) / 100;
          const y = chartStartY + chartHeight - barHeight;
          
          // Bar colors
          const colors = ['#c92a2a', '#2c5aa0', '#2d8659', '#868e96', '#adb5bd'];
          const color = colors[index] || '#dee2e6';
          
          // Draw bar
          doc.rect(x, y, barWidth, barHeight).fill(color);
          
          // Percentage label on top of bar
          doc.fontSize(9).font('Helvetica-Bold')
             .fillColor('#000')
             .text(`${lang.percentage}%`, x, y - 15, { width: barWidth, align: 'center' });
          
          // Language name below chart (rotated or abbreviated)
          doc.fontSize(7).font('Helvetica')
             .fillColor('#000');
          
          // Abbreviate long names
          const shortName = lang.name
            .replace('Words of Affirmation', 'Words')
            .replace('Quality Time', 'Quality')
            .replace('Receiving Gifts', 'Gifts')
            .replace('Acts of Service', 'Service')
            .replace('Physical Touch', 'Touch');
          
          doc.text(shortName, x, chartStartY + chartHeight + 5, { 
            width: barWidth, 
            align: 'center' 
          });
        });
        
        doc.y = chartStartY + chartHeight + 30;
      }
      
      doc.moveDown(1);

      // ===== DETAIL JAWABAN =====
      if (reportData.detailAnswers && reportData.detailAnswers.length > 0) {
        doc.addPage();
        addSectionTitle('DETAIL JAWABAN', 13);
        doc.fontSize(8).font('Helvetica')
           .text('Berikut adalah rincian jawaban Anda dalam tes Love Language.', { align: 'left' });
        doc.moveDown(0.5);

        // Detail table
        const detailStartY = doc.y + 5;
        const detailRowHeight = 20;
        const detailColWidths = [30, 300, 100];
        const detailHeaders = ['No', 'Pertanyaan', 'Jawaban'];
        
        // Header background
        doc.rect(40, detailStartY, 515, detailRowHeight).fillAndStroke('#c92a2a', '#c92a2a');
        
        // Header text
        doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
        let xPos = 45;
        detailHeaders.forEach((header, i) => {
          doc.text(header, xPos, detailStartY + 6, { 
            width: detailColWidths[i], 
            align: 'left' 
          });
          xPos += detailColWidths[i];
        });
        
        doc.fillColor('#000');
        let currentY = detailStartY + detailRowHeight;

        // Detail rows
        doc.fontSize(8).font('Helvetica');
        reportData.detailAnswers.forEach((detail, index) => {
          // Check if need new page
          if (currentY > 750) {
            doc.addPage();
            
            // Redraw header on new page
            doc.rect(40, 40, 515, detailRowHeight).fillAndStroke('#c92a2a', '#c92a2a');
            doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
            xPos = 45;
            detailHeaders.forEach((header, i) => {
              doc.text(header, xPos, 46, { width: detailColWidths[i], align: 'left' });
              xPos += detailColWidths[i];
            });
            
            currentY = 40 + detailRowHeight;
            doc.fillColor('#000').fontSize(8).font('Helvetica');
          }

          // Alternate row colors
          if (index % 2 === 0) {
            doc.rect(40, currentY, 515, detailRowHeight).fill('#fff0f0');
          }
          
          xPos = 45;
          const detailRowData = [
            detail.no.toString(),
            detail.question.length > 60 ? detail.question.substring(0, 57) + '...' : detail.question,
            detail.userAnswer.toString()
          ];
          
          detailRowData.forEach((cell, i) => {
            doc.fillColor('#000').font('Helvetica').text(cell, xPos, currentY + 5, { 
              width: detailColWidths[i], 
              align: 'left' 
            });
            xPos += detailColWidths[i];
          });
          
          currentY += detailRowHeight;
        });
        
        doc.y = currentY + 20;
      }

      // ===== FOOTER =====
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < (range.start + range.count); i++) {
        doc.switchToPage(i);
        const pageNum = i + 1;
        const totalPages = range.count;
        doc.fontSize(7).font('Helvetica').fillColor('#666');
        doc.text(
          `Digenerate pada ${formatDate(new Date())} | Halaman ${pageNum} dari ${totalPages}`,
          40, 780, { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF report for CFIT test
 */
function generatePDF_CFIT(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4'
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper functions
      const drawLine = (y) => {
        doc.moveTo(40, y).lineTo(555, y).stroke();
      };

      const addSectionTitle = (title, fontSize = 12) => {
        doc.fontSize(fontSize).font('Helvetica-Bold').text(title);
        drawLine(doc.y + 2);
        doc.moveDown(0.5);
      };

      const addKeyValue = (key, value, fontSize = 10) => {
        doc.fontSize(fontSize).font('Helvetica');
        doc.font('Helvetica-Bold').text(key, { continued: true, width: 150 });
        doc.font('Helvetica').text(`: ${value}`, { width: 400 });
      };

      // ===== HEADER =====
      doc.fontSize(16).font('Helvetica-Bold')
         .text('LAPORAN HASIL TES CFIT', { align: 'center' });
      doc.fontSize(10).font('Helvetica')
         .text('Culture Fair Intelligence Test', { align: 'center' });
      doc.moveDown(2);

      // ===== INFORMASI PESERTA =====
      addSectionTitle('INFORMASI PESERTA');
      addKeyValue('Nama Lengkap', reportData.patient.fullName);
      addKeyValue('Jenis Kelamin', reportData.patient.sex === 'male' ? 'Laki-laki' : reportData.patient.sex === 'female' ? 'Perempuan' : reportData.patient.sex);
      addKeyValue('Tanggal Lahir', reportData.patient.birthDate);
      addKeyValue('Umur', `${reportData.patient.age} tahun`);
      if (reportData.patient.email !== '-') addKeyValue('Email', reportData.patient.email);
      if (reportData.patient.phone !== '-') addKeyValue('Telepon', reportData.patient.phone);
      doc.moveDown(1.5);

      // ===== INFORMASI TES =====
      addSectionTitle('INFORMASI TES');
      addKeyValue('Nomor Sesi', reportData.session.sessionNumber);
      addKeyValue('Nama Tes', reportData.session.testName);
      addKeyValue('Waktu Mulai', reportData.session.startedAt);
      addKeyValue('Waktu Selesai', reportData.session.completedAt);
      addKeyValue('Durasi', `${reportData.session.durationMinutes} menit`);
      addKeyValue('Status', reportData.session.status);
      doc.moveDown(1.5);

      // ===== RINGKASAN HASIL =====
      addSectionTitle('RINGKASAN HASIL');
      const summaryData = [
        ['Total Soal', reportData.summary.totalQuestions],
        ['Soal Terjawab', reportData.summary.totalAnswered],
        ['Jawaban Benar', reportData.summary.totalCorrect],
        ['Akurasi Keseluruhan', `${reportData.summary.overallAccuracy}%`]
      ];
      
      summaryData.forEach(([key, value]) => {
        addKeyValue(key, value, 10);
      });
      doc.moveDown(1.5);

      // ===== HASIL IQ (HIGHLIGHTED BOX) =====
      addSectionTitle('HASIL IQ');
      const iqBoxY = doc.y + 5;
      doc.rect(40, iqBoxY, 515, 70).fillAndStroke('#e8f4f8', '#2c5aa0');
      doc.fillColor('#000');
      
      doc.y = iqBoxY + 15;
      doc.fontSize(24).font('Helvetica-Bold')
         .fillColor('#2c5aa0')
         .text(`Skor IQ: ${reportData.iqResult.score}`, 60, doc.y, { align: 'left' });
      
      doc.y = iqBoxY + 50;
      doc.fontSize(11).font('Helvetica').fillColor('#000')
         .text(`Kategori: ${reportData.iqResult.category}`, 60, doc.y);
      doc.fontSize(9).font('Helvetica').fillColor('#666')
         .text(`Norma yang digunakan: ${reportData.iqResult.normUsed}`, 60, doc.y + 15);
      
      doc.y = iqBoxY + 80;
      doc.moveDown(1);

      // ===== PROGRESS PER SUBTES =====
      doc.addPage();
      addSectionTitle('PROGRESS PER SUBTES', 13);
      
      // Table styling
      const tableStartY = doc.y + 5;
      const rowHeight = 25;
      const colWidths = [35, 110, 60, 60, 60, 70, 80];
      const headers = ['No', 'Nama Subtes', 'Total', 'Dijawab', 'Benar', 'Akurasi', 'Status'];
      
      // Table header background
      doc.rect(40, tableStartY, 515, rowHeight).fillAndStroke('#4682b4', '#4682b4');
      
      // Table header text
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
      let xPos = 45;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableStartY + 8, { 
          width: colWidths[i], 
          align: i === 0 ? 'center' : 'left' 
        });
        xPos += colWidths[i];
      });
      
      doc.fillColor('#000');
      let currentY = tableStartY + rowHeight;

      // Table rows
      doc.fontSize(9).font('Helvetica');
      reportData.subtestStats.forEach((stats, index) => {
        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(40, currentY, 515, rowHeight).fill('#f9f9f9');
        }
        
        xPos = 45;
        const rowData = [
          (index + 1).toString(),
          stats.name,
          stats.totalQuestions.toString(),
          stats.answered.toString(),
          stats.correct.toString(),
          `${stats.accuracy}%`,
          stats.status
        ];
        
        rowData.forEach((cell, i) => {
          doc.fillColor('#000').text(cell, xPos, currentY + 8, { 
            width: colWidths[i], 
            align: i === 0 ? 'center' : 'left' 
          });
          xPos += colWidths[i];
        });
        
        currentY += rowHeight;
      });
      
      // Table border
      doc.rect(40, tableStartY, 515, rowHeight * (reportData.subtestStats.length + 1)).stroke('#4682b4');
      
      doc.y = currentY + 20;

      // ===== DETAIL JAWABAN =====
      doc.addPage();
      addSectionTitle('DETAIL JAWABAN', 13);
      doc.fontSize(8).font('Helvetica')
         .text('Berikut adalah rincian jawaban per soal dalam tes CFIT.', { align: 'left' });
      doc.moveDown(0.5);

      // Check if we have detail answers
      if (!reportData.detailAnswers || reportData.detailAnswers.length === 0) {
        doc.fontSize(10).font('Helvetica')
           .text('Tidak ada data jawaban yang tersedia.', { align: 'center' });
        doc.moveDown(1);
      } else {
        // Detail table header
        const detailStartY = doc.y + 5;
        const detailRowHeight = 20;
        const detailColWidths = [30, 90, 40, 120, 60, 60, 65];
        const detailHeaders = ['No', 'Subtes', 'Soal', 'Pertanyaan', 'Jawaban', 'Benar', 'Status'];
        
        // Header background
        doc.rect(40, detailStartY, 515, detailRowHeight).fillAndStroke('#4682b4', '#4682b4');
        
        // Header text
        doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
        xPos = 45;
        detailHeaders.forEach((header, i) => {
          doc.text(header, xPos, detailStartY + 6, { 
            width: detailColWidths[i], 
            align: 'left' 
          });
          xPos += detailColWidths[i];
        });
        
        doc.fillColor('#000');
        currentY = detailStartY + detailRowHeight;

        // Detail rows
        doc.fontSize(7).font('Helvetica');
        reportData.detailAnswers.forEach((detail, index) => {
        // Check if need new page
        if (currentY > 750) {
          doc.addPage();
          
          // Redraw header on new page
          doc.rect(40, 40, 515, detailRowHeight).fillAndStroke('#4682b4', '#4682b4');
          doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
          xPos = 45;
          detailHeaders.forEach((header, i) => {
            doc.text(header, xPos, 46, { width: detailColWidths[i], align: 'left' });
            xPos += detailColWidths[i];
          });
          
          currentY = 40 + detailRowHeight;
          doc.fillColor('#000').fontSize(7).font('Helvetica');
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(40, currentY, 515, detailRowHeight).fill('#f9f9f9');
        }

        // Color for correct/wrong
        const statusColor = detail.result === 'Benar' ? '#28a745' : '#dc3545';
        
        xPos = 45;
        const detailRowData = [
          detail.no.toString(),
          detail.subtest,
          detail.questionNo.toString(),
          detail.question.length > 25 ? detail.question.substring(0, 22) + '...' : detail.question,
          detail.userAnswer.toString(),
          detail.correctAnswer.toString(),
          detail.result
        ];
        
        detailRowData.forEach((cell, i) => {
          const color = (i === 6) ? statusColor : '#000';
          const font = (i === 6) ? 'Helvetica-Bold' : 'Helvetica';
          
          doc.fillColor(color).font(font).text(cell, xPos, currentY + 5, { 
            width: detailColWidths[i], 
            align: 'left' 
          });
          xPos += detailColWidths[i];
        });
        
        currentY += detailRowHeight;
        });
        
        // No border for detail table - cleaner look
        
        // Move to end
        doc.y = currentY + 20;
      } // End if detailAnswers check

      // ===== FOOTER =====
      // Add footer to all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < (range.start + range.count); i++) {
        doc.switchToPage(i);
        const pageNum = i + 1;
        const totalPages = range.count;
        doc.fontSize(7).font('Helvetica').fillColor('#666');
        doc.text(
          `Digenerate pada ${formatDate(new Date())} | Halaman ${pageNum} dari ${totalPages}`,
          40, 780, { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF based on test type code
 */
function generatePDF(reportData, testTypeCode) {
  // Normalize test type code
  const code = (testTypeCode || '').toUpperCase().trim();
  
  // Select appropriate template
  if (code.includes('LOVE') || code.includes('BAHASA CINTA')) {
    return generatePDF_LOVE(reportData);
  } else if (code.includes('CFIT')) {
    return generatePDF_CFIT(reportData);
  } else {
    // Default to CFIT template for unknown test types
    return generatePDF_CFIT(reportData);
  }
}

/**
 * Export session report to XLSX buffer
 */
async function exportToXLSX(session, patient, testType, questions) {
  const reportData = prepareReportData(session, patient, testType, questions);
  const workbook = generateXLSX(reportData);
  
  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Export session report to PDF buffer
 */
async function exportToPDF(session, patient, testType, questions) {
  console.log('📄 [PDF EXPORT] Starting PDF export');
  console.log('📄 [PDF EXPORT] Test Type Code:', testType?.code);
  console.log('📄 [PDF EXPORT] Session ID:', session?.id);
  
  const testTypeCode = testType?.code || testType?.name || '';
  const normalizedCode = testTypeCode.toUpperCase();
  
  // Validate test type - only CFIT and LOVE_LANGUAGE are supported
  const isCFIT = normalizedCode === 'CFIT' || normalizedCode.includes('CFIT');
  const isLOVE = normalizedCode === 'LOVE_LANGUAGE' || normalizedCode.includes('LOVE') || normalizedCode.includes('BAHASA CINTA');
  
  if (!isCFIT && !isLOVE) {
    const error = new Error(`Test type '${testTypeCode}' is not supported for PDF export. Only CFIT and LOVE_LANGUAGE tests are supported.`);
    error.statusCode = 404;
    error.code = 'TEST_TYPE_NOT_SUPPORTED';
    console.error('❌ [PDF EXPORT] Unsupported test type:', testTypeCode);
    throw error;
  }
  
  const reportData = prepareReportData(session, patient, testType, questions);
  
  // If CFIT test, data already calculated in prepareReportData
  if (isCFIT) {
    console.log('🧠 [PDF EXPORT] Detected CFIT test');
    console.log('🧠 [PDF EXPORT] IQ Score:', reportData.iqResult?.score);
    console.log('🧠 [PDF EXPORT] Subtests:', reportData.subtestStats?.length);
    console.log('🧠 [PDF EXPORT] Total Questions:', reportData.summary?.totalQuestions);
    
    // CFIT data is already prepared in reportData:
    // - iqResult: { score, category, normUsed }
    // - subtestStats: [{ name, totalQuestions, answered, correct, accuracy, status }]
    // - summary: { totalQuestions, totalAnswered, totalCorrect, overallAccuracy }
    // - detailAnswers: [{ no, subtest, questionNo, userAnswer, correctAnswer, result }]
  }
  
  // If LOVE test, calculate love language scores with scaleA/scaleB mapping
  else if (isLOVE) {
    console.log('💕 [PDF EXPORT] Detected LOVE test, calculating scores...');
    const loveResults = calculateLoveLanguageScores(session, testType, questions);
    reportData.loveLanguageResults = loveResults;
    
    console.log('💕 [PDF EXPORT] Love results calculated:', {
      totalQuestions: loveResults.totalQuestions,
      totalAnswered: loveResults.totalAnswered,
      scoresCount: loveResults.scores?.length
    });
    
    // Update summary with LOVE-specific data
    reportData.summary.totalQuestions = loveResults.totalQuestions;
    reportData.summary.totalAnswered = loveResults.totalAnswered;
  }
  
  // Generate PDF with appropriate template
  const buffer = await generatePDF(reportData, testTypeCode);
  console.log('📄 [PDF EXPORT] PDF generated, size:', buffer.length, 'bytes');
  return buffer;
}

/**
 * Generate filename for report
 */
function generateFilename(session, patient, format, testType) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const patientName = (patient?.fullName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const sessionNum = session.sessionNumber || session.id?.slice(0, 8) || 'session';
  
  // Get test type code for filename
  let testPrefix = 'Psychology';
  if (testType?.code) {
    const code = testType.code.toUpperCase();
    if (code.includes('CFIT')) testPrefix = 'CFIT';
    else if (code.includes('LOVE')) testPrefix = 'LOVE';
    else testPrefix = code.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  return `${testPrefix}_Report_${patientName}_${sessionNum}_${timestamp}.${format}`;
}

module.exports = {
  prepareReportData,
  generateXLSX,
  generatePDF,
  exportToXLSX,
  exportToPDF,
  generateFilename
};
