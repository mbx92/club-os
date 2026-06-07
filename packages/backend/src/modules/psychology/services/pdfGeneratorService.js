/**
 * PDF Generator Service - PDFKit Implementation
 * Generates clean, professional PDF reports for psychology test results
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// PDF output directory
const PDF_OUTPUT_DIR = path.join(__dirname, '../../../../uploads/psychology-reports');

// Ensure output directory exists
if (!fs.existsSync(PDF_OUTPUT_DIR)) {
  fs.mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
}

// Clean monochrome color palette for professional reports
const COLORS = {
  black: '#000000',
  darkGray: '#333333',
  gray: '#666666',
  lightGray: '#999999',
  border: '#cccccc',
  tableBorder: '#dddddd',
  tableHeader: '#f5f5f5',
  tableAlt: '#fafafa',
  white: '#ffffff'
};

// Font sizes
const FONT_SIZES = {
  title: 20,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 9
};

/**
 * Generate PDF report buffer
 * @param {Object} sessionData - Prepared session data from controller
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateReport(sessionData, options = {}) {
  const { reportType = 'full' } = options;

  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        autoFirstPage: false, // We'll add pages manually
        info: {
          Title: `Psychology Test Report - ${sessionData.testType.name}`,
          Author: 'Gym Membership System',
          Subject: 'Psychology Test Results',
          CreationDate: new Date()
        }
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (reportType === 'summary') {
        generateSummaryReport(doc, sessionData, options);
      } else {
        generateFullReport(doc, sessionData, options);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate full detailed report
 */
function generateFullReport(doc, sessionData, options) {
  let pageNum = 0;
  
  // Helper to add page with footer placeholder area
  const addNewPage = () => {
    doc.addPage();
    pageNum++;
    doc.y = doc.page.margins.top + 20;
  };
  
  // Cover Page
  addNewPage();
  drawCoverPage(doc, sessionData);

  // Patient Info Page
  addNewPage();
  drawPatientInfo(doc, sessionData);

  // Test Results Page - only add if there are scores
  if (sessionData.scores && sessionData.scores.length > 0) {
    addNewPage();
    // Pass addNewPage to allow internal page breaks
    drawTestResults(doc, sessionData, options, addNewPage);

    // Analysis by Aspect Page (grouped by psychological aspect)
    if (sessionData.aspectAnalysis && sessionData.aspectAnalysis.length > 0) {
      addNewPage();
      drawAspectAnalysis(doc, sessionData, addNewPage);
    }
  }

  // Interpretation Page
  if (sessionData.interpretations && sessionData.interpretations.length > 0) {
    addNewPage();
    drawInterpretation(doc, sessionData, addNewPage);
  }

  // Key Findings Page
  if (sessionData.keyFindings && sessionData.keyFindings.length > 0) {
    addNewPage();
    drawKeyFindings(doc, sessionData, addNewPage);
  }

  // Note: Footer will be added via a different approach
  // Since we can't go back to previous pages without bufferPages,
  // we'll just not add footers for now (or add them inline)
}

/**
 * Generate summary report (shorter version)
 */
function generateSummaryReport(doc, sessionData, options) {
  // Header
  drawHeader(doc, sessionData);

  // Quick Summary Section
  doc.moveDown(2);
  drawQuickSummary(doc, sessionData);

  // Key Scores Table
  if (sessionData.scores && sessionData.scores.length > 0) {
    doc.moveDown(2);
    drawKeyScores(doc, sessionData);
  }

  // Brief Interpretation
  if (sessionData.interpretations && sessionData.interpretations.length > 0) {
    doc.moveDown(2);
    drawBriefInterpretation(doc, sessionData);
  }

  // Footer
  drawFooter(doc, 1, 1);
}

/**
 * Draw cover page - Clean professional design
 */
function drawCoverPage(doc, sessionData) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const marginLeft = doc.page.margins.left;

  // Title
  doc.fillColor(COLORS.black)
    .fontSize(FONT_SIZES.title)
    .font('Helvetica-Bold')
    .text('LAPORAN HASIL TES PSIKOLOGI', marginLeft, 120, {
      width: pageWidth,
      align: 'center'
    });

  // Horizontal line
  doc.save();
  doc.moveTo(marginLeft + 80, 155)
    .lineTo(doc.page.width - doc.page.margins.right - 80, 155)
    .strokeColor(COLORS.black)
    .lineWidth(1)
    .stroke();
  doc.restore();

  // Test type name
  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.subtitle)
    .font('Helvetica-Bold')
    .text(sessionData.testType?.name || 'Psychology Test', marginLeft, 180, {
      width: pageWidth,
      align: 'center'
    });

  // Test code
  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.body)
    .font('Helvetica')
    .text(`(${sessionData.testType?.code || 'TEST'})`, marginLeft, 200, {
      width: pageWidth,
      align: 'center'
    });

  // Participant section
  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.body)
    .text('Nama Peserta:', marginLeft, 280, {
      width: pageWidth,
      align: 'center'
    });

  doc.fillColor(COLORS.black)
    .fontSize(FONT_SIZES.subtitle)
    .font('Helvetica-Bold')
    .text(sessionData.participant?.name || 'Unknown Participant', marginLeft, 300, {
      width: pageWidth,
      align: 'center'
    });

  // Test details box
  const boxY = 360;
  const boxHeight = 80;
  
  doc.save();
  doc.rect(marginLeft + 100, boxY, pageWidth - 200, boxHeight)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  doc.restore();

  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .font('Helvetica')
    .text('Tanggal Tes', marginLeft + 120, boxY + 15)
    .text('Durasi', marginLeft + 120, boxY + 35)
    .text('Status', marginLeft + 120, boxY + 55);

  doc.fillColor(COLORS.darkGray)
    .text(`: ${formatDate(sessionData.completedAt || sessionData.startedAt || new Date())}`, marginLeft + 200, boxY + 15)
    .text(`: ${sessionData.duration ? sessionData.duration + ' menit' : '-'}`, marginLeft + 200, boxY + 35)
    .text(`: ${(sessionData.status || 'completed').toUpperCase()}`, marginLeft + 200, boxY + 55);

  // Confidential notice at bottom
  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .font('Helvetica-Oblique')
    .text('RAHASIA - HANYA UNTUK KEPENTINGAN RESMI', marginLeft, doc.page.height - 80, {
      width: pageWidth,
      align: 'center'
    });
}

/**
 * Draw header for pages - Clean minimal header
 */
function drawHeader(doc, sessionData) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const marginLeft = doc.page.margins.left;

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.small)
    .font('Helvetica')
    .text(`${sessionData.testType?.name || 'Psychology Test'} - ${sessionData.participant?.name || ''}`, 
      marginLeft, doc.page.margins.top - 20, {
      width: pageWidth,
      align: 'left'
    });

  // Thin line under header
  doc.save();
  doc.moveTo(marginLeft, doc.page.margins.top)
    .lineTo(doc.page.width - doc.page.margins.right, doc.page.margins.top)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  doc.restore();
}

/**
 * Draw patient information section - Clean table format
 */
function drawPatientInfo(doc, sessionData) {
  const participant = sessionData.participant || {};
  const testType = sessionData.testType || {};
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const marginLeft = doc.page.margins.left;

  // Section title
  drawSectionTitle(doc, 'Data Peserta');

  const startY = doc.y + 10;
  const labelWidth = 140;

  const patientData = [
    ['Nama Lengkap', participant.name || '-'],
    ['Email', participant.email || '-'],
    ['Jenis Kelamin', formatGender(participant.sex)],
    ['Usia', participant.age ? `${participant.age} tahun` : '-']
  ];

  let y = startY;
  doc.font('Helvetica');
  
  patientData.forEach(([label, value]) => {
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .text(label, marginLeft, y, { width: labelWidth });

    doc.fillColor(COLORS.darkGray)
      .text(`: ${value}`, marginLeft + labelWidth, y);

    y += 18;
  });

  // Test Information
  doc.y = y + 20;
  drawSectionTitle(doc, 'Informasi Tes');

  const testData = [
    ['Jenis Tes', testType.name || '-'],
    ['Kode Tes', testType.code || '-'],
    ['ID Sesi', sessionData.id ? sessionData.id.substring(0, 8).toUpperCase() : '-'],
    ['Status', (sessionData.status || '-').toUpperCase()],
    ['Waktu Mulai', formatDateTime(sessionData.startedAt)],
    ['Waktu Selesai', formatDateTime(sessionData.completedAt)],
    ['Durasi', sessionData.duration ? `${sessionData.duration} menit` : '-'],
    ['Total Soal', String(sessionData.totalQuestions || '-')],
    ['Soal Dijawab', String(sessionData.answeredQuestions || '-')]
  ];

  y = doc.y + 10;
  testData.forEach(([label, value]) => {
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .text(label, marginLeft, y, { width: labelWidth });

    doc.fillColor(COLORS.darkGray)
      .text(`: ${value || '-'}`, marginLeft + labelWidth, y);

    y += 18;
  });
  
  doc.y = y;
}

/**
 * Draw test results section - Clean table format
 */
function drawTestResults(doc, sessionData, options, addNewPage) {
  drawSectionTitle(doc, 'Ringkasan Hasil');

  const scores = sessionData.scores || [];
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const marginLeft = doc.page.margins.left;

  if (scores.length === 0) {
    doc.moveDown();
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text('Tidak ada skor tersedia untuk sesi ini.');
    return;
  }

  // Overall statistics
  const totalScore = scores.reduce((sum, s) => sum + (s.percentile || s.score || 0), 0);
  const avgScore = Math.round(totalScore / scores.length);

  doc.moveDown(0.5);
  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .font('Helvetica')
    .text(`Rata-rata Persentil: ${avgScore}%`, marginLeft);

  doc.moveDown(1);

  // Score table
  drawScoreTable(doc, scores, addNewPage);
}

/**
 * Draw score table - Clean professional table
 */
function drawScoreTable(doc, scores, addNewPage) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const tableLeft = doc.page.margins.left;
  const colWidths = [pageWidth * 0.40, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.30];
  const rowHeight = 22;

  // Table header
  let y = doc.y;
  
  doc.save();
  doc.rect(tableLeft, y, pageWidth, rowHeight)
    .fill(COLORS.tableHeader);
  doc.rect(tableLeft, y, pageWidth, rowHeight)
    .strokeColor(COLORS.tableBorder)
    .lineWidth(0.5)
    .stroke();
  doc.restore();

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.small)
    .font('Helvetica-Bold');

  let xPos = tableLeft + 5;
  doc.text('Skala/Dimensi', xPos, y + 6, { width: colWidths[0] - 10 });
  xPos += colWidths[0];
  doc.text('Skor', xPos, y + 6, { width: colWidths[1] - 10, align: 'center' });
  xPos += colWidths[1];
  doc.text('Persentil', xPos, y + 6, { width: colWidths[2] - 10, align: 'center' });
  xPos += colWidths[2];
  doc.text('Kategori', xPos, y + 6, { width: colWidths[3] - 10 });

  y += rowHeight;

  // Table rows
  doc.font('Helvetica');
  scores.forEach((scoreItem, index) => {
    // Check for page break
    if (y > doc.page.height - 80) {
      if (addNewPage) {
        addNewPage();
      } else {
        doc.addPage();
        doc.y = doc.page.margins.top + 20;
      }
      y = doc.page.margins.top + 20;

      // Re-draw header on new page
      doc.save();
      doc.rect(tableLeft, y, pageWidth, rowHeight)
        .fill(COLORS.tableHeader);
      doc.rect(tableLeft, y, pageWidth, rowHeight)
        .strokeColor(COLORS.tableBorder)
        .lineWidth(0.5)
        .stroke();
      doc.restore();

      doc.fillColor(COLORS.darkGray)
        .fontSize(FONT_SIZES.small)
        .font('Helvetica-Bold');

      let xH = tableLeft + 5;
      doc.text('Skala/Dimensi', xH, y + 6, { width: colWidths[0] - 10 });
      xH += colWidths[0];
      doc.text('Skor', xH, y + 6, { width: colWidths[1] - 10, align: 'center' });
      xH += colWidths[1];
      doc.text('Persentil', xH, y + 6, { width: colWidths[2] - 10, align: 'center' });
      xH += colWidths[2];
      doc.text('Kategori', xH, y + 6, { width: colWidths[3] - 10 });

      y += rowHeight;
      doc.font('Helvetica');
    }

    const bgColor = index % 2 === 0 ? COLORS.white : COLORS.tableAlt;

    doc.save();
    doc.rect(tableLeft, y, pageWidth, rowHeight)
      .fill(bgColor);
    doc.rect(tableLeft, y, pageWidth, rowHeight)
      .strokeColor(COLORS.tableBorder)
      .lineWidth(0.5)
      .stroke();
    doc.restore();

    doc.fillColor(COLORS.darkGray)
      .fontSize(FONT_SIZES.small);

    xPos = tableLeft + 5;
    doc.text(scoreItem.name || '-', xPos, y + 6, { width: colWidths[0] - 10 });
    xPos += colWidths[0];
    doc.text(String(scoreItem.score ?? '-'), xPos, y + 6, { width: colWidths[1] - 10, align: 'center' });
    xPos += colWidths[1];
    doc.text(scoreItem.percentile ? `${scoreItem.percentile}%` : '-', xPos, y + 6, { width: colWidths[2] - 10, align: 'center' });
    xPos += colWidths[2];
    doc.text(scoreItem.category || '-', xPos, y + 6, { width: colWidths[3] - 10 });

    y += rowHeight;
  });

  doc.y = y + 10;
}
/**
 * Draw score analysis section - Clean text-based analysis without colored bars
 */
function drawScoreAnalysis(doc, sessionData) {
  drawSectionTitle(doc, 'Analisis Skor');

  const scores = sessionData.scores || [];
  const marginLeft = doc.page.margins.left;

  doc.moveDown(0.5);
  doc.font('Helvetica');

  scores.forEach((scoreItem, index) => {
    if (doc.y > doc.page.height - 80) {
      doc.addPage();
      doc.y = doc.page.margins.top + 20;
    }

    const percentile = scoreItem.percentile || 50;

    // Scale name and score
    doc.fillColor(COLORS.darkGray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica-Bold')
      .text(`${index + 1}. ${scoreItem.name || 'Unknown Scale'}`, marginLeft, doc.y);

    doc.font('Helvetica')
      .fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.small)
      .text(`   Skor: ${scoreItem.score ?? '-'} | Persentil: ${percentile}% | Kategori: ${scoreItem.category || '-'}`, marginLeft);

    doc.moveDown(0.5);
  });
}

/**
 * Draw aspect analysis section - Clean table format per aspect
 */
function drawAspectAnalysis(doc, sessionData, addNewPage) {
  drawSectionTitle(doc, 'Analisis per Aspek');

  const aspects = sessionData.aspectAnalysis || [];
  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - marginLeft - doc.page.margins.right;

  doc.moveDown(0.5);

  if (aspects.length === 0) {
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text('Tidak ada data analisis aspek.');
    return;
  }

  aspects.forEach((aspect, aspectIndex) => {
    // Check page break
    if (doc.y > doc.page.height - 120) {
      if (addNewPage) {
        addNewPage();
      } else {
        doc.addPage();
        doc.y = doc.page.margins.top + 20;
      }
    }

    // Aspect header
    const headerY = doc.y;
    const headerHeight = 22;

    doc.save();
    doc.rect(marginLeft, headerY, pageWidth, headerHeight)
      .fill(COLORS.tableHeader);
    doc.rect(marginLeft, headerY, pageWidth, headerHeight)
      .strokeColor(COLORS.tableBorder)
      .lineWidth(0.5)
      .stroke();
    doc.restore();

    doc.fillColor(COLORS.darkGray)
      .fontSize(FONT_SIZES.heading)
      .font('Helvetica-Bold')
      .text(`${aspectIndex + 1}. ${aspect.name || 'Aspek'}`, marginLeft + 8, headerY + 5, {
        width: pageWidth - 120
      });

    if (aspect.averageScore !== undefined) {
      doc.fillColor(COLORS.gray)
        .fontSize(FONT_SIZES.small)
        .font('Helvetica')
        .text(`Rata-rata: ${aspect.averageScore}%`, marginLeft + pageWidth - 100, headerY + 6);
    }

    doc.y = headerY + headerHeight;

    // Scales within this aspect
    const scales = aspect.scales || [];

    if (scales.length === 0) {
      doc.fillColor(COLORS.gray)
        .fontSize(FONT_SIZES.small)
        .font('Helvetica')
        .text('   Tidak ada skala untuk aspek ini.', marginLeft, doc.y + 5);
      doc.y += 25;
      return;
    }

    // Draw scales as simple table rows
    scales.forEach((scale, scaleIndex) => {
      if (doc.y > doc.page.height - 60) {
        if (addNewPage) {
          addNewPage();
        } else {
          doc.addPage();
          doc.y = doc.page.margins.top + 20;
        }
      }

      const rowY = doc.y;
      const rowHeight = 20;
      const bgColor = scaleIndex % 2 === 0 ? COLORS.white : COLORS.tableAlt;

      doc.save();
      doc.rect(marginLeft, rowY, pageWidth, rowHeight)
        .fill(bgColor);
      doc.rect(marginLeft, rowY, pageWidth, rowHeight)
        .strokeColor(COLORS.tableBorder)
        .lineWidth(0.5)
        .stroke();
      doc.restore();

      const percentile = scale.percentile || scale.score || 0;
      const rawScore = scale.score !== undefined ? scale.score : null;
      const maxScore = scale.maxScore || 9;

      // Scale name with raw score
      let scaleLabel = scale.name || 'Scale';
      if (rawScore !== null) {
        scaleLabel = `${scale.name || 'Scale'} (${rawScore}/${maxScore})`;
      }

      doc.fillColor(COLORS.darkGray)
        .fontSize(FONT_SIZES.small)
        .font('Helvetica')
        .text(scaleLabel, marginLeft + 10, rowY + 5, { width: pageWidth * 0.45 });

      // Percentile
      doc.text(`${percentile}%`, marginLeft + pageWidth * 0.50, rowY + 5, { width: 50, align: 'center' });

      // Category
      doc.text(scale.category || '-', marginLeft + pageWidth * 0.65, rowY + 5, { width: pageWidth * 0.30 });

      doc.y = rowY + rowHeight;
    });

    doc.y += 10;
  });
}

/**
 * Draw interpretation section - Clean text format
 */
function drawInterpretation(doc, sessionData, addNewPage) {
  drawSectionTitle(doc, 'Interpretasi');

  const interpretations = sessionData.interpretations || [];
  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - marginLeft - doc.page.margins.right;

  doc.moveDown(0.5);

  if (interpretations.length === 0) {
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text('Tidak ada interpretasi tersedia.');
    return;
  }

  interpretations.forEach((item, index) => {
    if (doc.y > doc.page.height - 120) {
      if (addNewPage) {
        addNewPage();
      } else {
        doc.addPage();
        doc.y = doc.page.margins.top + 20;
      }
    }

    // Sub-heading (title)
    if (item.title) {
      doc.fillColor(COLORS.darkGray)
        .fontSize(FONT_SIZES.heading)
        .font('Helvetica-Bold')
        .text(`${index + 1}. ${item.title}`, marginLeft);

      doc.moveDown(0.3);
    }

    // Content (description)
    let descText = item.description || item;
    if (typeof descText === 'string') {
      doc.fillColor(COLORS.gray)
        .fontSize(FONT_SIZES.body)
        .font('Helvetica')
        .text(descText, marginLeft, doc.y, {
          width: pageWidth,
          align: 'justify',
          lineGap: 3
        });
    }

    doc.moveDown(1);
  });
}

/**
 * Draw key findings section - Clean numbered list
 */
function drawKeyFindings(doc, sessionData, addNewPage) {
  drawSectionTitle(doc, 'Temuan Utama');

  const findings = sessionData.keyFindings || [];
  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - marginLeft - doc.page.margins.right;

  doc.moveDown(0.5);

  if (findings.length === 0) {
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text('Tidak ada temuan utama.');
    return;
  }

  findings.forEach((finding, index) => {
    if (doc.y > doc.page.height - 80) {
      if (addNewPage) {
        addNewPage();
      } else {
        doc.addPage();
        doc.y = doc.page.margins.top + 20;
      }
    }

    doc.fillColor(COLORS.darkGray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text(`${index + 1}. ${finding}`, marginLeft, doc.y, {
        width: pageWidth,
        lineGap: 2
      });

    doc.moveDown(0.6);
  });
}

/**
 * Draw quick summary for summary report - Clean box format
 */
function drawQuickSummary(doc, sessionData) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const marginLeft = doc.page.margins.left;
  const boxY = doc.y;

  // Info box with border
  doc.save();
  doc.rect(marginLeft, boxY, pageWidth, 90)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  doc.restore();

  const contentY = boxY + 12;
  const colWidth = pageWidth / 3;

  doc.font('Helvetica');

  // Column 1: Participant
  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .text('PESERTA', marginLeft + 15, contentY);

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .text(sessionData.participant?.name || '-', marginLeft + 15, contentY + 12);

  // Column 2: Test Date
  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .text('TANGGAL TES', marginLeft + colWidth + 15, contentY);

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .text(formatDate(sessionData.completedAt), marginLeft + colWidth + 15, contentY + 12);

  // Column 3: Status
  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .text('STATUS', marginLeft + (colWidth * 2) + 15, contentY);

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .text((sessionData.status || 'unknown').toUpperCase(), marginLeft + (colWidth * 2) + 15, contentY + 12);

  // Row 2
  const row2Y = contentY + 40;

  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .text('DURASI', marginLeft + 15, row2Y);

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .text(sessionData.duration ? `${sessionData.duration} menit` : '-', marginLeft + 15, row2Y + 12);

  doc.fillColor(COLORS.gray)
    .fontSize(FONT_SIZES.small)
    .text('SOAL', marginLeft + colWidth + 15, row2Y);

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .text(`${sessionData.answeredQuestions || 0}/${sessionData.totalQuestions || 0}`, marginLeft + colWidth + 15, row2Y + 12);

  doc.y = boxY + 100;
}

/**
 * Draw key scores for summary report - Clean table
 */
function drawKeyScores(doc, sessionData) {
  drawSectionTitle(doc, 'Skor Utama');

  const scores = sessionData.scores || [];
  const topScores = scores.slice(0, 5);

  if (topScores.length === 0) {
    doc.moveDown(0.5);
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text('Tidak ada skor tersedia');
    return;
  }

  doc.moveDown(0.5);
  drawScoreTable(doc, topScores);
}

/**
 * Draw brief interpretation for summary report
 */
function drawBriefInterpretation(doc, sessionData) {
  drawSectionTitle(doc, 'Ringkasan');

  const interpretations = sessionData.interpretations || [];
  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - marginLeft - doc.page.margins.right;

  doc.moveDown(0.5);

  if (interpretations.length === 0) {
    doc.fillColor(COLORS.gray)
      .fontSize(FONT_SIZES.body)
      .font('Helvetica')
      .text('Tidak ada ringkasan tersedia.');
    return;
  }

  const firstInterp = interpretations[0];
  let text = typeof firstInterp === 'string' 
    ? firstInterp 
    : (firstInterp.description || firstInterp.title || '');

  doc.fillColor(COLORS.darkGray)
    .fontSize(FONT_SIZES.body)
    .font('Helvetica')
    .text(text, marginLeft, doc.y, {
      width: pageWidth,
      align: 'justify',
      lineGap: 3
    });
}

/**
 * Draw section title - Clean underlined style
 */
function drawSectionTitle(doc, title) {
  const marginLeft = doc.page.margins.left;
  
  doc.fillColor(COLORS.black)
    .fontSize(FONT_SIZES.subtitle)
    .font('Helvetica-Bold')
    .text(title, marginLeft, doc.y);

  const lineY = doc.y + 3;
  doc.save();
  doc.moveTo(marginLeft, lineY)
    .lineTo(marginLeft + 80, lineY)
    .strokeColor(COLORS.black)
    .lineWidth(1)
    .stroke();
  doc.restore();

  doc.y = lineY + 8;
}

/**
 * Draw footer - Clean minimal style
 */
function drawFooter(doc, pageNum, totalPages) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fillColor(COLORS.lightGray)
    .fontSize(FONT_SIZES.small)
    .font('Helvetica')
    .text(
      `Dibuat: ${formatDateTime(new Date())} | Halaman ${pageNum}`,
      doc.page.margins.left,
      doc.page.height - 30,
      { width: pageWidth, align: 'center' }
    );
}

// ============================================
// FILE MANAGEMENT FUNCTIONS
// ============================================

/**
 * Save PDF buffer to disk
 * @param {Buffer} buffer - PDF buffer
 * @param {string} tenantId - Tenant UUID
 * @param {string} sessionId - Session UUID
 * @param {string} reportType - 'full' or 'summary'
 * @param {string} participantName - Participant name for filename
 * @returns {Promise<{filePath: string, fileName: string, fileSize: number}>}
 */
async function saveToDisk(buffer, tenantId, sessionId, reportType, participantName) {
  // Create tenant-specific subdirectory
  const tenantDir = path.join(PDF_OUTPUT_DIR, tenantId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  // Sanitize participant name for filename
  const sanitizedName = participantName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 30);

  const timestamp = Date.now();
  const fileName = `report-${reportType}-${sanitizedName}-${timestamp}.pdf`;
  const filePath = path.join(tenantDir, fileName);

  // Write buffer to file
  await fs.promises.writeFile(filePath, buffer);

  // Get file size
  const stats = await fs.promises.stat(filePath);

  return {
    filePath,
    fileName,
    fileSize: stats.size
  };
}

/**
 * Check if file exists
 * @param {string} filePath - File path to check
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a PDF file
 * @param {string} filePath - File path to delete
 * @returns {Promise<boolean>}
 */
async function deleteReport(filePath) {
  try {
    if (await fileExists(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date
 */
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format datetime
 */
function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format gender
 */
function formatGender(gender) {
  if (!gender) return '-';
  const map = {
    'M': 'Laki-laki',
    'F': 'Perempuan',
    'male': 'Laki-laki',
    'female': 'Perempuan',
    'L': 'Laki-laki',
    'P': 'Perempuan'
  };
  return map[gender] || gender;
}

/**
 * Get category color - Now returns neutral dark color for clean look
 */
function getCategoryColor(category) {
  return COLORS.darkGray;
}

/**
 * Get score color - Now returns neutral dark color for clean look
 */
function getScoreColor(percentile) {
  return COLORS.gray;
}

module.exports = {
  generateReport,
  saveToDisk,
  fileExists,
  deleteReport,
  PDF_OUTPUT_DIR
};
