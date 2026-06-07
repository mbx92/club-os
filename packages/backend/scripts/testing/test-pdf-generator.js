/**
 * Test script for PDF Generator
 * Run with: node test-pdf-generator.js
 */

const pdfGeneratorService = require('./src/modules/psychology/services/pdfGeneratorService');
const fs = require('fs');
const path = require('path');

// Mock session data that simulates real PAPI test results
const mockSessionData = {
  id: 'test-session-12345678',
  status: 'completed',
  startedAt: new Date('2025-12-01T10:00:00'),
  completedAt: new Date('2025-12-01T11:30:00'),
  duration: 90,
  totalQuestions: 90,
  answeredQuestions: 90,
  
  participant: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    gender: 'male',
    age: 28
  },
  
  testType: {
    name: 'PAPI Kostick',
    code: 'PAPI',
    description: 'Personality and Preference Inventory'
  },
  
  // PAPI scores (20 scales)
  scores: [
    { name: 'G', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Hard Working' },
    { name: 'L', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Leadership Role' },
    { name: 'I', score: 5, maxScore: 9, percentile: 56, category: 'Sedang', description: 'Ease in Decision Making' },
    { name: 'T', score: 8, maxScore: 9, percentile: 89, category: 'Tinggi', description: 'Pace' },
    { name: 'V', score: 4, maxScore: 9, percentile: 44, category: 'Sedang', description: 'Vigorous Type' },
    { name: 'S', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Social Extension' },
    { name: 'R', score: 3, maxScore: 9, percentile: 33, category: 'Sedang-Rendah', description: 'Theoretical Type' },
    { name: 'D', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Interest in Detail' },
    { name: 'C', score: 5, maxScore: 9, percentile: 56, category: 'Sedang', description: 'Organized Type' },
    { name: 'E', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Emotional Control' },
    { name: 'N', score: 4, maxScore: 9, percentile: 44, category: 'Sedang', description: 'Need to Finish Task' },
    { name: 'A', score: 8, maxScore: 9, percentile: 89, category: 'Tinggi', description: 'Need to Achieve' },
    { name: 'P', score: 5, maxScore: 9, percentile: 56, category: 'Sedang', description: 'Need to Control Others' },
    { name: 'X', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Need to be Noticed' },
    { name: 'B', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Need to Belong' },
    { name: 'O', score: 4, maxScore: 9, percentile: 44, category: 'Sedang', description: 'Need for Closeness' },
    { name: 'Z', score: 3, maxScore: 9, percentile: 33, category: 'Sedang-Rendah', description: 'Need for Change' },
    { name: 'K', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Need to be Forceful' },
    { name: 'F', score: 5, maxScore: 9, percentile: 56, category: 'Sedang', description: 'Need to Support Authority' },
    { name: 'W', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Need for Rules' }
  ],
  
  // Aspect analysis (grouped)
  aspectAnalysis: [
    {
      name: 'Kepemimpinan',
      description: 'Kemampuan memimpin dan mempengaruhi orang lain',
      averageScore: 74,
      category: 'Sedang-Tinggi',
      scales: [
        { name: 'L', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Leadership Role' },
        { name: 'P', score: 5, maxScore: 9, percentile: 56, category: 'Sedang', description: 'Need to Control Others' },
        { name: 'A', score: 8, maxScore: 9, percentile: 89, category: 'Tinggi', description: 'Need to Achieve' }
      ]
    },
    {
      name: 'Motivasi Kerja',
      description: 'Dorongan untuk mencapai prestasi dan hasil kerja',
      averageScore: 78,
      category: 'Tinggi',
      scales: [
        { name: 'G', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Hard Working' },
        { name: 'A', score: 8, maxScore: 9, percentile: 89, category: 'Tinggi', description: 'Need to Achieve' },
        { name: 'T', score: 8, maxScore: 9, percentile: 89, category: 'Tinggi', description: 'Pace' },
        { name: 'V', score: 4, maxScore: 9, percentile: 44, category: 'Sedang', description: 'Vigorous Type' }
      ]
    },
    {
      name: 'Stabilitas Emosi',
      description: 'Kemampuan mengendalikan emosi dan tetap tenang',
      averageScore: 56,
      category: 'Sedang',
      scales: [
        { name: 'E', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Emotional Control' },
        { name: 'S', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Social Extension' },
        { name: 'K', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Need to be Forceful' }
      ]
    },
    {
      name: 'Hubungan Sosial',
      description: 'Kemampuan berinteraksi dengan orang lain',
      averageScore: 63,
      category: 'Sedang-Tinggi',
      scales: [
        { name: 'O', score: 4, maxScore: 9, percentile: 44, category: 'Sedang', description: 'Need for Closeness' },
        { name: 'B', score: 6, maxScore: 9, percentile: 67, category: 'Sedang-Tinggi', description: 'Need to Belong' },
        { name: 'X', score: 7, maxScore: 9, percentile: 78, category: 'Tinggi', description: 'Need to be Noticed' }
      ]
    }
  ],
  
  interpretations: [
    {
      title: 'Profil Kepribadian',
      description: 'Peserta menunjukkan profil kepribadian yang seimbang dengan kecenderungan yang kuat pada motivasi kerja dan kepemimpinan. Ini menandakan individu yang berorientasi pada hasil dan mampu memotivasi diri sendiri.'
    },
    {
      title: 'Kekuatan Utama',
      description: 'Peserta memiliki kekuatan dalam hal kecepatan kerja (T=89%), orientasi pencapaian (A=89%), dan ketekunan (G=78%). Kombinasi ini menunjukkan seseorang yang produktif dan berorientasi pada target.'
    }
  ],
  
  keyFindings: [
    'Dimensi tertinggi: T (Pace), A (Need to Achieve), G (Hard Working)',
    'Area pengembangan: Z (Need for Change), R (Theoretical Type)',
    '12 dimensi berada di kategori sedang-tinggi atau tinggi',
    'Profil menunjukkan kesesuaian untuk posisi yang membutuhkan kecepatan dan orientasi hasil'
  ]
};

async function testPdfGeneration() {
  console.log('Starting PDF generation test...');
  console.log('Session Data Summary:');
  console.log(`- Participant: ${mockSessionData.participant.name}`);
  console.log(`- Test Type: ${mockSessionData.testType.name}`);
  console.log(`- Scores: ${mockSessionData.scores.length} items`);
  console.log(`- Aspects: ${mockSessionData.aspectAnalysis.length} groups`);
  console.log(`- Interpretations: ${mockSessionData.interpretations.length} items`);
  console.log(`- Key Findings: ${mockSessionData.keyFindings.length} items`);
  console.log('');

  try {
    // Generate full report
    console.log('Generating full report...');
    const pdfBuffer = await pdfGeneratorService.generateReport(mockSessionData, {
      reportType: 'full',
      includeCharts: true,
      language: 'id'
    });

    // Save to test output
    const outputPath = path.join(__dirname, 'test-pdf-output.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✅ PDF generated successfully!`);
    console.log(`   File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Output: ${outputPath}`);
    console.log('');
    console.log('Please open the PDF file to check for empty pages.');

  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    console.error(error.stack);
  }
}

testPdfGeneration();
