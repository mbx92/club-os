'use strict';

/**
 * Transform PAPI Kostick questions from legacy format to API format
 * 
 * Usage:
 *   node scripts/transformPapiQuestions.js
 * 
 * Input: docs/soalPsikolog/papiKostick_test.json
 * Output: docs/soalPsikolog/papi-transformed.json
 */

const fs = require('fs');
const path = require('path');

// PAPI 20 scales
const PAPI_SCALES = [
  'G', 'E', 'A', 'N', 'P', 'X', 'B', 'O', 'Z', 'K',
  'F', 'W', 'C', 'L', 'I', 'T', 'V', 'S', 'R', 'D'
];

const PAPI_SCALE_LABELS = {
  G: 'Hard Working / Pekerja Keras',
  E: 'Emotional Control / Pengendalian Emosi',
  A: 'Need to Achieve / Kebutuhan Berprestasi',
  N: 'Need for Rules / Kebutuhan Mengikuti Aturan',
  P: 'Need for Attention / Kebutuhan diperhatikan',
  X: 'Need for Change / Kebutuhan Perubahan',
  B: 'Need to Belong / Kebutuhan Diterima Kelompok',
  O: 'Need to be Close / Kebutuhan Kedekatan',
  Z: 'Need for Affection / Kebutuhan Kasih Sayang',
  K: 'Need for Aggression / Kebutuhan Agresi',
  F: 'Need for Fairness / Kebutuhan Keadilan',
  W: 'Need for Independence / Kebutuhan Mandiri',
  C: 'Need for Order / Kerapihan',
  L: 'Leadership / Kepemimpinan',
  I: 'Ease in Decision Making / Kemudahan Mengambil Keputusan',
  T: 'Pace / Kecepatan Kerja',
  V: 'Vigor / Semangat Kerja',
  S: 'Social Extension / Keterbukaan Sosial',
  R: 'Need for Support / Kebutuhan Dukungan',
  D: 'Attention to Detail / Perhatian Detail'
};

function transformQuestion(q) {
  return {
    id: q.id,
    textA: q.pair.A.trim(),
    textB: q.pair.B.trim(),
    scaleA: q.scaleA,
    scaleB: q.scaleB
  };
}

function main() {
  const inputPath = path.join(__dirname, '../docs/soalPsikolog/papiKostick_test.json');
  const outputPath = path.join(__dirname, '../docs/soalPsikolog/papi-transformed.json');
  
  console.log('Reading PAPI questions from:', inputPath);
  
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const questions = JSON.parse(rawData);
  
  console.log(`Found ${questions.length} questions`);
  
  const transformed = questions.map(transformQuestion);
  
  // Validate scales
  const invalidScales = transformed.filter(q => 
    !PAPI_SCALES.includes(q.scaleA) || !PAPI_SCALES.includes(q.scaleB)
  );
  
  if (invalidScales.length > 0) {
    console.warn(`Warning: ${invalidScales.length} questions have invalid scales`);
    invalidScales.slice(0, 5).forEach(q => {
      console.warn(`  Question ${q.id}: scaleA=${q.scaleA}, scaleB=${q.scaleB}`);
    });
  }
  
  // Create output
  const output = {
    testType: 'PAPI_KOSTICK',
    description: 'Personality and Preference Inventory - 90 questions, 20 scales',
    totalQuestions: transformed.length,
    scales: PAPI_SCALES,
    scaleLabels: PAPI_SCALE_LABELS,
    questions: transformed
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('Transformed questions saved to:', outputPath);
  
  // Also print sample for Postman
  console.log('\n--- Sample API Request Body ---\n');
  console.log(JSON.stringify({
    code: 'PAPI_KOSTICK',
    name: 'PAPI Kostick',
    description: 'Personality and Preference Inventory - measures 20 personality dimensions',
    category: 'personality',
    estimatedMinutes: 30,
    questions: transformed.slice(0, 3),
    scoringConfig: {
      scales: PAPI_SCALES,
      scaleLabels: PAPI_SCALE_LABELS,
      maxPerScale: 9
    },
    isActive: true
  }, null, 2));
}

main();
