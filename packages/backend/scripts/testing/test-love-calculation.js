/**
 * Test Love Language Calculation
 * 
 * Test file to verify the LOVE test calculation logic
 */

// Simulate the calculation function
function calculateLoveLanguageScores(answers, totalQuestions = 30) {
  // Mapping dari jawaban ke Love Language
  const answerToLoveLanguage = {
    'A': 'Words of Affirmation',
    'B': 'Quality Time',
    'C': 'Receiving Gifts',
    'D': 'Acts of Service',
    'E': 'Physical Touch'
  };

  // Initialize counters for each answer
  const answerCount = {
    'A': 0,
    'B': 0,
    'C': 0,
    'D': 0,
    'E': 0
  };

  // Get answer collection as array
  let answerCollection = [];
  if (Array.isArray(answers)) {
    answerCollection = answers.map(a => {
      if (typeof a === 'object' && a.answer) {
        return a.answer.toUpperCase();
      }
      return typeof a === 'string' ? a.toUpperCase() : '';
    });
  } else if (typeof answers === 'object' && answers !== null) {
    // Format: { "1": "A", "2": "B", ... }
    // Or: { "q1": { answer: "A" }, "q2": { answer: "B" } }
    const values = Object.values(answers);
    answerCollection = values.map(a => {
      if (typeof a === 'string') {
        return a.toUpperCase();
      } else if (typeof a === 'object' && a !== null && a.answer) {
        return typeof a.answer === 'string' ? a.answer.toUpperCase() : '';
      }
      return '';
    });
  }

  // Loop through the answers and count occurrences
  answerCollection.forEach(answer => {
    if (answerCount.hasOwnProperty(answer)) {
      answerCount[answer]++;
    }
  });

  // Calculate percentages and map to Love Languages
  const loveLanguageScores = [];
  for (const [letter, count] of Object.entries(answerCount)) {
    const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
    const loveLanguage = answerToLoveLanguage[letter];
    
    loveLanguageScores.push({
      letter: letter,
      name: loveLanguage,
      count: count,
      percentage: Math.round(percentage * 10) / 10
    });
  }

  // Sort by percentage (highest first)
  loveLanguageScores.sort((a, b) => b.percentage - a.percentage);

  return {
    scores: loveLanguageScores,
    totalQuestions: totalQuestions,
    totalAnswered: answerCollection.filter(a => a !== '').length,
    answerCount: answerCount
  };
}

// Test cases
console.log('='.repeat(80));
console.log('LOVE LANGUAGE CALCULATION TEST');
console.log('='.repeat(80));
console.log('');

// Test Case 1: Array format with objects
console.log('Test Case 1: Array format (object with answer property)');
console.log('-'.repeat(80));
const test1Answers = [
  { id: 1, answer: 'A' },
  { id: 2, answer: 'B' },
  { id: 3, answer: 'A' },
  { id: 4, answer: 'C' },
  { id: 5, answer: 'A' },
  { id: 6, answer: 'D' },
  { id: 7, answer: 'B' },
  { id: 8, answer: 'A' },
  { id: 9, answer: 'E' },
  { id: 10, answer: 'A' },
  { id: 11, answer: 'A' },
  { id: 12, answer: 'B' },
  { id: 13, answer: 'A' },
  { id: 14, answer: 'C' },
  { id: 15, answer: 'A' },
  { id: 16, answer: 'D' },
  { id: 17, answer: 'B' },
  { id: 18, answer: 'A' },
  { id: 19, answer: 'E' },
  { id: 20, answer: 'A' },
  { id: 21, answer: 'A' },
  { id: 22, answer: 'B' },
  { id: 23, answer: 'A' },
  { id: 24, answer: 'C' },
  { id: 25, answer: 'B' },
  { id: 26, answer: 'D' },
  { id: 27, answer: 'B' },
  { id: 28, answer: 'C' },
  { id: 29, answer: 'B' },
  { id: 30, answer: 'C' }
];

const result1 = calculateLoveLanguageScores(test1Answers, 30);
console.log('Input: Array of 30 answers');
console.log('Answer distribution:', result1.answerCount);
console.log('');
console.log('Results:');
result1.scores.forEach((lang, idx) => {
  console.log(`${idx + 1}. ${lang.name.padEnd(25)} ${lang.percentage.toFixed(1)}%  (${lang.count}/30)`);
});
console.log('');

// Test Case 2: Object format
console.log('Test Case 2: Object format (key-value pairs)');
console.log('-'.repeat(80));
const test2Answers = {
  "1": "A", "2": "A", "3": "A", "4": "A", "5": "A",
  "6": "A", "7": "A", "8": "A", "9": "A", "10": "A",
  "11": "A", "12": "A", // 12 x A = 40%
  "13": "B", "14": "B", "15": "B", "16": "B", 
  "17": "B", "18": "B", "19": "B", "20": "B", // 8 x B = 26.7%
  "21": "C", "22": "C", "23": "C", "24": "C", "25": "C", // 5 x C = 16.7%
  "26": "D", "27": "D", "28": "D", // 3 x D = 10%
  "29": "E", "30": "E" // 2 x E = 6.7%
};

const result2 = calculateLoveLanguageScores(test2Answers, 30);
console.log('Input: Object with 30 key-value pairs');
console.log('Answer distribution:', result2.answerCount);
console.log('');
console.log('Results:');
result2.scores.forEach((lang, idx) => {
  console.log(`${idx + 1}. ${lang.name.padEnd(25)} ${lang.percentage.toFixed(1)}%  (${lang.count}/30)`);
});
console.log('');

// Test Case 3: Balanced distribution
console.log('Test Case 3: Balanced distribution');
console.log('-'.repeat(80));
const test3Answers = {
  "1": "A", "2": "A", "3": "A", "4": "A", "5": "A", "6": "A",
  "7": "B", "8": "B", "9": "B", "10": "B", "11": "B", "12": "B",
  "13": "C", "14": "C", "15": "C", "16": "C", "17": "C", "18": "C",
  "19": "D", "20": "D", "21": "D", "22": "D", "23": "D", "24": "D",
  "25": "E", "26": "E", "27": "E", "28": "E", "29": "E", "30": "E"
};

const result3 = calculateLoveLanguageScores(test3Answers, 30);
console.log('Input: Perfectly balanced (6 each)');
console.log('Answer distribution:', result3.answerCount);
console.log('');
console.log('Results:');
result3.scores.forEach((lang, idx) => {
  console.log(`${idx + 1}. ${lang.name.padEnd(25)} ${lang.percentage.toFixed(1)}%  (${lang.count}/30)`);
});
console.log('');

// Test Case 4: Strong dominant language
console.log('Test Case 4: Strong dominant language');
console.log('-'.repeat(80));
const test4Answers = {
  "1": "E", "2": "E", "3": "E", "4": "E", "5": "E",
  "6": "E", "7": "E", "8": "E", "9": "E", "10": "E",
  "11": "E", "12": "E", "13": "E", "14": "E", "15": "E",
  "16": "E", "17": "E", "18": "E", "19": "E", "20": "E", // 20 x E
  "21": "A", "22": "A", "23": "A", "24": "A", "25": "A", // 5 x A
  "26": "B", "27": "B", "28": "C", "29": "D", "30": "D" // 2,2,1,1
};

const result4 = calculateLoveLanguageScores(test4Answers, 30);
console.log('Input: Strong Physical Touch preference (20/30)');
console.log('Answer distribution:', result4.answerCount);
console.log('');
console.log('Results:');
result4.scores.forEach((lang, idx) => {
  const indicator = idx === 0 ? '🔴' : idx === 1 ? '🔵' : idx === 2 ? '🟢' : '⚪';
  console.log(`${indicator} ${idx + 1}. ${lang.name.padEnd(25)} ${lang.percentage.toFixed(1)}%  (${lang.count}/30)`);
});
console.log('');

console.log('='.repeat(80));
console.log('Legend:');
console.log('🔴 Primary Love Language   (Red highlight in PDF)');
console.log('🔵 Secondary Love Language (Blue highlight in PDF)');
console.log('🟢 Tertiary Love Language  (Green highlight in PDF)');
console.log('⚪ Other Languages         (Gray in PDF)');
console.log('='.repeat(80));
console.log('');

// Test Case 5: Nested object format (common in actual session data)
console.log('Test Case 5: Nested object format (session.answers format)');
console.log('-'.repeat(80));
const test5Answers = {
  "1": { answer: "A", timestamp: "2025-12-16T10:00:00Z" },
  "2": { answer: "B", timestamp: "2025-12-16T10:00:05Z" },
  "3": { answer: "A", timestamp: "2025-12-16T10:00:10Z" },
  "4": { answer: "C", timestamp: "2025-12-16T10:00:15Z" },
  "5": { answer: "A", timestamp: "2025-12-16T10:00:20Z" },
  "6": { answer: "D", timestamp: "2025-12-16T10:00:25Z" },
  "7": { answer: "B", timestamp: "2025-12-16T10:00:30Z" },
  "8": { answer: "A", timestamp: "2025-12-16T10:00:35Z" },
  "9": { answer: "E", timestamp: "2025-12-16T10:00:40Z" },
  "10": { answer: "A", timestamp: "2025-12-16T10:00:45Z" },
  "11": { answer: "A", timestamp: "2025-12-16T10:00:50Z" },
  "12": { answer: "B", timestamp: "2025-12-16T10:00:55Z" },
  "13": { answer: "A", timestamp: "2025-12-16T10:01:00Z" },
  "14": { answer: "C", timestamp: "2025-12-16T10:01:05Z" },
  "15": { answer: "A", timestamp: "2025-12-16T10:01:10Z" },
  "16": { answer: "D", timestamp: "2025-12-16T10:01:15Z" },
  "17": { answer: "B", timestamp: "2025-12-16T10:01:20Z" },
  "18": { answer: "A", timestamp: "2025-12-16T10:01:25Z" },
  "19": { answer: "E", timestamp: "2025-12-16T10:01:30Z" },
  "20": { answer: "A", timestamp: "2025-12-16T10:01:35Z" },
  "21": { answer: "A", timestamp: "2025-12-16T10:01:40Z" },
  "22": { answer: "B", timestamp: "2025-12-16T10:01:45Z" },
  "23": { answer: "A", timestamp: "2025-12-16T10:01:50Z" },
  "24": { answer: "C", timestamp: "2025-12-16T10:01:55Z" },
  "25": { answer: "B", timestamp: "2025-12-16T10:02:00Z" },
  "26": { answer: "D", timestamp: "2025-12-16T10:02:05Z" },
  "27": { answer: "B", timestamp: "2025-12-16T10:02:10Z" },
  "28": { answer: "C", timestamp: "2025-12-16T10:02:15Z" },
  "29": { answer: "B", timestamp: "2025-12-16T10:02:20Z" },
  "30": { answer: "C", timestamp: "2025-12-16T10:02:25Z" }
};

const result5 = calculateLoveLanguageScores(test5Answers, 30);
console.log('Input: Object with nested answer objects');
console.log('Answer distribution:', result5.answerCount);
console.log('');
console.log('Results:');
result5.scores.forEach((lang, idx) => {
  const indicator = idx === 0 ? '🔴' : idx === 1 ? '🔵' : idx === 2 ? '🟢' : '⚪';
  console.log(`${indicator} ${idx + 1}. ${lang.name.padEnd(25)} ${lang.percentage.toFixed(1)}%  (${lang.count}/30)`);
});
console.log('');

console.log('='.repeat(80));
