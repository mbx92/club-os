const fs = require('fs');
const path = require('path');

// Load data
const questions = JSON.parse(fs.readFileSync('docs/soalPsikolog/data/cfit-questions.json', 'utf8'));

// Validate structure
console.log('=== VALIDASI DATA CFIT ===\n');

// 1. Validasi jumlah soal
console.log('1. Validasi Jumlah Soal:');
questions.subtests.forEach(subtest => {
  const actualCount = subtest.questions.length;
  const expectedCount = subtest.questionCount;
  const status = actualCount === expectedCount ? 'OK' : 'FAIL';
  console.log(`   ${status} Subtes ${subtest.id} (${subtest.name}): ${actualCount}/${expectedCount} soal`);
});

// 2. Validasi jumlah contoh
console.log('\n2. Validasi Jumlah Contoh:');
questions.subtests.forEach(subtest => {
  const actualCount = subtest.examples.length;
  const expectedCount = subtest.exampleCount;
  const status = actualCount === expectedCount ? 'OK' : 'FAIL';
  console.log(`   ${status} Subtes ${subtest.id}: ${actualCount}/${expectedCount} contoh`);
});

// 3. Validasi total soal
const totalQuestions = questions.subtests.reduce((sum, s) => sum + s.questions.length, 0);
const expectedTotal = questions.testInfo.totalQuestions;
console.log(`\n3. Total Soal: ${totalQuestions}/${expectedTotal} ${totalQuestions === expectedTotal ? 'OK' : 'FAIL'}`);

// 4. Validasi total contoh
const totalExamples = questions.subtests.reduce((sum, s) => sum + s.examples.length, 0);
const expectedExamples = questions.testInfo.totalExamples;
console.log(`4. Total Contoh: ${totalExamples}/${expectedExamples} ${totalExamples === expectedExamples ? 'OK' : 'FAIL'}`);

// 5. Validasi kunci jawaban
console.log('\n5. Kunci Jawaban (dari Excel):');
const answerKeys = {
  1: ['C', 'D', 'A', 'C', 'B', 'E', 'B', 'C', 'C', 'C', 'D', 'A'],
  2: ['B', 'C', 'D', 'A', 'C', 'C', 'A', 'E', 'D', 'C', 'C', 'C', 'A', 'D'],
  3: ['A', 'C', 'B', 'E', 'C', 'A', 'B', 'D', 'E', 'A', 'B', 'B'],
  4: ['C', 'B', 'A', 'D', 'C', 'C', 'A', 'B']
};

let allMatch = true;
questions.subtests.forEach(subtest => {
  const subtestAnswers = subtest.questions.map(q => q.answer);
  const expectedAnswers = answerKeys[subtest.id];
  const match = JSON.stringify(subtestAnswers) === JSON.stringify(expectedAnswers);
  console.log(`   ${match ? 'OK' : 'FAIL'} Subtes ${subtest.id}: ${match ? 'COCOK' : 'TIDAK COCOK'}`);
  if (!match) {
    console.log(`      Expected: ${expectedAnswers.join(', ')}`);
    console.log(`      Got:      ${subtestAnswers.join(', ')}`);
    allMatch = false;
  }
});

// 6. Validasi file gambar
console.log('\n6. Validasi File Gambar:');
let missingFiles = 0;
questions.subtests.forEach(subtest => {
  // Check examples
  subtest.examples.forEach(ex => {
    const filePath = path.join('uploads', ex.imagePath);
    if (!fs.existsSync(filePath)) {
      console.log(`   MISSING: ${ex.imagePath}`);
      missingFiles++;
    }
  });
  // Check questions
  subtest.questions.forEach(q => {
    const filePath = path.join('uploads', q.imagePath);
    if (!fs.existsSync(filePath)) {
      console.log(`   MISSING: ${q.imagePath}`);
      missingFiles++;
    }
  });
});
console.log(`   Total file gambar: 57 (46 soal + 11 contoh)`);
console.log(`   Missing files: ${missingFiles} ${missingFiles === 0 ? 'OK' : 'FAIL'}`);

console.log('\n=== HASIL VALIDASI ===');
if (totalQuestions === expectedTotal && totalExamples === expectedExamples && allMatch && missingFiles === 0) {
  console.log('PASSED - Semua validasi berhasil!');
} else {
  console.log('FAILED - Ada validasi yang gagal, cek detail di atas.');
}
