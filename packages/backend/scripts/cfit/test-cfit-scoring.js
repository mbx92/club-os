/**
 * Test CFIT Scoring Service
 * Validasi scoring dengan sample data dari Output CFIT.xlsx
 */

const cfitScoringService = require('./src/services/psychology/cfitScoringService');
const { calculateAge, getAgeGroup } = require('./src/utils/ageCalculator');
const { Sequelize } = require('sequelize');
const config = require('./src/config/config.js');
const fs = require('fs');
const path = require('path');

const sequelize = new Sequelize(config.development);

async function testScoring() {
  try {
    console.log('=== CFIT Scoring Service Test ===\n');

    // Load questions from database
    const [testTypes] = await sequelize.query(`
      SELECT questions FROM "PsychologyTestTypes" WHERE code = 'CFIT'
    `);

    if (testTypes.length === 0) {
      console.error('CFIT test type not found in database!');
      process.exit(1);
    }

    const questions = testTypes[0].questions;

    // Test Case 1: Sample dari responden pertama (Output CFIT.xlsx)
    // Nama: Putu Meyta irmawanti
    // Jawaban: a,c,d,e,c,b,e,a,c,d,d,d,e | c,d,d,d,d,c,d,d,d,c,c,d,d,d | c,c,c,d,e,a,c,d,b,d,c,d | c,c,d,c,b,c,e,e
    
    console.log('Test Case 1: Putu Meyta Irmawanti');
    const answers1 = [
      // Series (12 soal) - jawaban: a,c,d,e,c,b,e,a,c,d,d,d,e (salah terus)
      { questionId: 'series_1', answer: 'A' },
      { questionId: 'series_2', answer: 'C' },
      { questionId: 'series_3', answer: 'D' },
      { questionId: 'series_4', answer: 'E' },
      { questionId: 'series_5', answer: 'C' },
      { questionId: 'series_6', answer: 'B' },
      { questionId: 'series_7', answer: 'E' },
      { questionId: 'series_8', answer: 'A' },
      { questionId: 'series_9', answer: 'C' },
      { questionId: 'series_10', answer: 'D' },
      { questionId: 'series_11', answer: 'D' },
      { questionId: 'series_12', answer: 'D' },
      // Classification (14 soal) - jawaban: c,d,d,d,d,c,d,d,d,c,c,d,d,d
      { questionId: 'classification_1', answer: 'C' },
      { questionId: 'classification_2', answer: 'D' },
      { questionId: 'classification_3', answer: 'D' },
      { questionId: 'classification_4', answer: 'D' },
      { questionId: 'classification_5', answer: 'D' },
      { questionId: 'classification_6', answer: 'C' },
      { questionId: 'classification_7', answer: 'D' },
      { questionId: 'classification_8', answer: 'D' },
      { questionId: 'classification_9', answer: 'D' },
      { questionId: 'classification_10', answer: 'C' },
      { questionId: 'classification_11', answer: 'C' },
      { questionId: 'classification_12', answer: 'D' },
      { questionId: 'classification_13', answer: 'D' },
      { questionId: 'classification_14', answer: 'D' },
      // Matrices (12 soal) - jawaban: c,c,c,d,e,a,c,d,b,d,c,d
      { questionId: 'matrices_1', answer: 'C' },
      { questionId: 'matrices_2', answer: 'C' },
      { questionId: 'matrices_3', answer: 'C' },
      { questionId: 'matrices_4', answer: 'D' },
      { questionId: 'matrices_5', answer: 'E' },
      { questionId: 'matrices_6', answer: 'A' },
      { questionId: 'matrices_7', answer: 'C' },
      { questionId: 'matrices_8', answer: 'D' },
      { questionId: 'matrices_9', answer: 'B' },
      { questionId: 'matrices_10', answer: 'D' },
      { questionId: 'matrices_11', answer: 'C' },
      { questionId: 'matrices_12', answer: 'D' },
      // Topology (8 soal) - jawaban: c,c,d,c,b,c,e,e
      { questionId: 'topology_1', answer: 'C' },
      { questionId: 'topology_2', answer: 'C' },
      { questionId: 'topology_3', answer: 'D' },
      { questionId: 'topology_4', answer: 'C' },
      { questionId: 'topology_5', answer: 'B' },
      { questionId: 'topology_6', answer: 'C' },
      { questionId: 'topology_7', answer: 'E' },
      { questionId: 'topology_8', answer: 'E' }
    ];

    // Hitung scores
    const subtestScores1 = cfitScoringService.calculateSubtestScores(answers1, questions);
    const rawScore1 = cfitScoringService.calculateRawScore(subtestScores1);

    console.log('  Subtest Scores:', subtestScores1);
    console.log('  Raw Score:', rawScore1);

    // Test age calculation
    const birthDate1 = '1999-05-15'; // Approximate
    const testDate1 = '2025-12-08';
    const age1 = calculateAge(birthDate1, testDate1);
    const ageGroup1 = getAgeGroup(age1.totalMonths);
    
    console.log('  Age:', `${age1.years} years, ${age1.months} months (${age1.totalMonths} months)`);
    console.log('  Age Group:', ageGroup1);

    // Get tenant
    const [tenants] = await sequelize.query(`SELECT id FROM "Tenants" LIMIT 1`);
    const tenantId = tenants[0].id;

    // Convert to IQ
    const result1 = await cfitScoringService.convertToIQ(rawScore1, birthDate1, testDate1, tenantId);
    console.log('  IQ Score:', result1.iqScore);
    console.log('  Classification:', result1.classification);

    // Test validation
    const validation1 = cfitScoringService.validateAnswers(answers1, 46);
    console.log('  Validation:', validation1);

    console.log('\n--- Test Case 2: Perfect Score ---');
    
    // Create perfect answers (all correct)
    const perfectAnswers = [];
    const answerKey = {
      series: ['C', 'D', 'A', 'C', 'B', 'E', 'B', 'C', 'C', 'C', 'D', 'A'],
      classification: ['B', 'C', 'D', 'A', 'C', 'C', 'A', 'E', 'D', 'C', 'C', 'C', 'A', 'D'],
      matrices: ['A', 'C', 'B', 'E', 'C', 'A', 'B', 'D', 'E', 'A', 'B', 'B'],
      topology: ['C', 'B', 'A', 'D', 'C', 'C', 'A', 'B']
    };

    Object.entries(answerKey).forEach(([subtest, answers]) => {
      answers.forEach((answer, idx) => {
        perfectAnswers.push({
          questionId: `${subtest}_${idx + 1}`,
          answer
        });
      });
    });

    const subtestScoresPerfect = cfitScoringService.calculateSubtestScores(perfectAnswers, questions);
    const rawScorePerfect = cfitScoringService.calculateRawScore(subtestScoresPerfect);
    
    console.log('  Subtest Scores:', subtestScoresPerfect);
    console.log('  Raw Score:', rawScorePerfect, '/ 46');

    const resultPerfect = await cfitScoringService.convertToIQ(rawScorePerfect, birthDate1, testDate1, tenantId);
    console.log('  IQ Score:', resultPerfect.iqScore);
    console.log('  Classification:', resultPerfect.classification);

    console.log('\n--- Test Case 3: Generate Full Result ---');
    
    const sessionData = {
      name: 'Test User',
      gender: 'Laki-laki',
      birthDate: '2011-01-15', // Age 14
      testDate: '2025-12-08'
    };

    const fullResult = await cfitScoringService.generateResult(
      sessionData,
      perfectAnswers,
      questions,
      tenantId
    );

    console.log('  Full Result:');
    console.log('  - Participant:', fullResult.participant.name);
    console.log('  - Age:', fullResult.participant.age.formatted);
    console.log('  - Raw Score:', fullResult.results.rawScore);
    console.log('  - IQ Score:', fullResult.results.iqScore);
    console.log('  - Classification:', fullResult.results.classification);
    console.log('  - Score Breakdown:');
    Object.entries(fullResult.scoreBreakdown).forEach(([subtest, data]) => {
      console.log(`    ${subtest}: ${data.score}/${data.maxScore} (${data.percentage}%)`);
    });

    await sequelize.close();
    console.log('\n=== All Tests Passed ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testScoring();
