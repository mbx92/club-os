/**
 * Test LOVE calculation with scaleA/scaleB mapping
 * Verifies the new forced choice mapping logic
 */

// Sample questions from actual LOVE test structure
const questions = [
  { id: 1, scaleA: "A", scaleB: "E" },
  { id: 2, scaleA: "B", scaleB: "D" },
  { id: 3, scaleA: "E", scaleB: "B" },
  { id: 4, scaleA: "D", scaleB: "E" },
  { id: 5, scaleA: "E", scaleB: "C" },
  { id: 6, scaleA: "B", scaleB: "E" },
  { id: 7, scaleA: "C", scaleB: "A" },
  { id: 8, scaleA: "E", scaleB: "A" },
  { id: 9, scaleA: "B", scaleB: "C" },
  { id: 10, scaleA: "A", scaleB: "D" },
  { id: 11, scaleA: "B", scaleB: "A" },
  { id: 12, scaleA: "D", scaleB: "E" },
  { id: 13, scaleA: "A", scaleB: "C" },
  { id: 14, scaleA: "B", scaleB: "E" },
  { id: 15, scaleA: "A", scaleB: "D" },
  { id: 16, scaleA: "E", scaleB: "B" },
  { id: 17, scaleA: "D", scaleB: "C" },
  { id: 18, scaleA: "A", scaleB: "B" },
  { id: 19, scaleA: "E", scaleB: "D" },
  { id: 20, scaleA: "D", scaleB: "C" },
  { id: 21, scaleA: "B", scaleB: "D" },
  { id: 22, scaleA: "C", scaleB: "A" },
  { id: 23, scaleA: "C", scaleB: "D" },
  { id: 24, scaleA: "B", scaleB: "C" },
  { id: 25, scaleA: "D", scaleB: "B" },
  { id: 26, scaleA: "E", scaleB: "C" },
  { id: 27, scaleA: "A", scaleB: "B" },
  { id: 28, scaleA: "C", scaleB: "E" },
  { id: 29, scaleA: "D", scaleB: "A" },
  { id: 30, scaleA: "E", scaleB: "A" }
];

function calculateWithScaleMapping(answers, questions) {
  const answerToLoveLanguage = {
    'A': 'Words of Affirmation',
    'B': 'Quality Time',
    'C': 'Receiving Gifts',
    'D': 'Acts of Service',
    'E': 'Physical Touch'
  };

  const answerCount = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 };

  // Build question map
  const questionMap = {};
  questions.forEach(q => {
    questionMap[q.id] = q;
  });

  // Helper to extract answer value
  const getAnswerValue = (answerData) => {
    if (!answerData) return null;
    if (typeof answerData === 'string') return answerData.toUpperCase();
    if (typeof answerData === 'object' && answerData.answer) {
      return typeof answerData.answer === 'string' ? answerData.answer.toUpperCase() : null;
    }
    return null;
  };

  // Count with scale mapping
  let mappedAnswers = [];
  Object.entries(answers).forEach(([questionId, answerData]) => {
    const question = questionMap[questionId] || questionMap[parseInt(questionId)];
    if (!question) return;

    const userAnswer = getAnswerValue(answerData);
    if (!userAnswer) return;

    // Map A/B to scale
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

  // Calculate percentages
  const totalQuestions = questions.length;
  const loveLanguageScores = [];
  
  for (const [letter, count] of Object.entries(answerCount)) {
    const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
    loveLanguageScores.push({
      letter: letter,
      name: answerToLoveLanguage[letter],
      count: count,
      percentage: Math.round(percentage * 10) / 10
    });
  }

  loveLanguageScores.sort((a, b) => b.percentage - a.percentage);

  return {
    scores: loveLanguageScores,
    totalQuestions: totalQuestions,
    totalAnswered: mappedAnswers.length,
    answerCount: answerCount,
    mappedAnswers: mappedAnswers
  };
}

// Test Case 1: Nested object format (realistic from database)
console.log('\n========== TEST CASE 1: Nested Object Format ==========');
const testAnswers1 = {
  "1": { answer: "A", timestamp: "2025-12-16T10:00:00Z" },  // Q1 A -> scaleA=A
  "2": { answer: "B", timestamp: "2025-12-16T10:00:05Z" },  // Q2 B -> scaleB=D
  "3": { answer: "A", timestamp: "2025-12-16T10:00:10Z" },  // Q3 A -> scaleA=E
  "4": { answer: "A", timestamp: "2025-12-16T10:00:15Z" },  // Q4 A -> scaleA=D
  "5": { answer: "B", timestamp: "2025-12-16T10:00:20Z" },  // Q5 B -> scaleB=C
  "6": { answer: "A", timestamp: "2025-12-16T10:00:25Z" },  // Q6 A -> scaleA=B
  "7": { answer: "B", timestamp: "2025-12-16T10:00:30Z" },  // Q7 B -> scaleB=A
  "8": { answer: "A", timestamp: "2025-12-16T10:00:35Z" },  // Q8 A -> scaleA=E
  "9": { answer: "A", timestamp: "2025-12-16T10:00:40Z" },  // Q9 A -> scaleA=B
  "10": { answer: "B", timestamp: "2025-12-16T10:00:45Z" }, // Q10 B -> scaleB=D
  "11": { answer: "A", timestamp: "2025-12-16T10:00:50Z" }, // Q11 A -> scaleA=B
  "12": { answer: "B", timestamp: "2025-12-16T10:00:55Z" }, // Q12 B -> scaleB=E
  "13": { answer: "A", timestamp: "2025-12-16T10:01:00Z" }, // Q13 A -> scaleA=A
  "14": { answer: "A", timestamp: "2025-12-16T10:01:05Z" }, // Q14 A -> scaleA=B
  "15": { answer: "A", timestamp: "2025-12-16T10:01:10Z" }, // Q15 A -> scaleA=A
  "16": { answer: "B", timestamp: "2025-12-16T10:01:15Z" }, // Q16 B -> scaleB=B
  "17": { answer: "A", timestamp: "2025-12-16T10:01:20Z" }, // Q17 A -> scaleA=D
  "18": { answer: "B", timestamp: "2025-12-16T10:01:25Z" }, // Q18 B -> scaleB=B
  "19": { answer: "A", timestamp: "2025-12-16T10:01:30Z" }, // Q19 A -> scaleA=E
  "20": { answer: "B", timestamp: "2025-12-16T10:01:35Z" }, // Q20 B -> scaleB=C
  "21": { answer: "A", timestamp: "2025-12-16T10:01:40Z" }, // Q21 A -> scaleA=B
  "22": { answer: "B", timestamp: "2025-12-16T10:01:45Z" }, // Q22 B -> scaleB=A
  "23": { answer: "A", timestamp: "2025-12-16T10:01:50Z" }, // Q23 A -> scaleA=C
  "24": { answer: "A", timestamp: "2025-12-16T10:01:55Z" }, // Q24 A -> scaleA=B
  "25": { answer: "B", timestamp: "2025-12-16T10:02:00Z" }, // Q25 B -> scaleB=B
  "26": { answer: "A", timestamp: "2025-12-16T10:02:05Z" }, // Q26 A -> scaleA=E
  "27": { answer: "A", timestamp: "2025-12-16T10:02:10Z" }, // Q27 A -> scaleA=A
  "28": { answer: "B", timestamp: "2025-12-16T10:02:15Z" }, // Q28 B -> scaleB=E
  "29": { answer: "A", timestamp: "2025-12-16T10:02:20Z" }, // Q29 A -> scaleA=D
  "30": { answer: "B", timestamp: "2025-12-16T10:02:25Z" }  // Q30 B -> scaleB=A
};

const result1 = calculateWithScaleMapping(testAnswers1, questions);
console.log('\nAnswer Count by Scale:', result1.answerCount);
console.log('\nTop Results:');
result1.scores.slice(0, 5).forEach((lang, idx) => {
  console.log(`  ${idx + 1}. ${lang.name}: ${lang.percentage}% (${lang.count}/${result1.totalQuestions})`);
});
console.log('\nMapped Answers Sample:', result1.mappedAnswers.slice(0, 5));

// Test Case 2: Simple string format
console.log('\n\n========== TEST CASE 2: Simple String Format ==========');
const testAnswers2 = {
  "1": "A",  "2": "A",  "3": "B",  "4": "B",  "5": "A",
  "6": "B",  "7": "A",  "8": "B",  "9": "B",  "10": "A",
  "11": "B", "12": "A", "13": "B", "14": "B", "15": "B",
  "16": "A", "17": "B", "18": "A", "19": "B", "20": "A",
  "21": "B", "22": "A", "23": "B", "24": "B", "25": "A",
  "26": "B", "27": "B", "28": "A", "29": "B", "30": "A"
};

const result2 = calculateWithScaleMapping(testAnswers2, questions);
console.log('\nAnswer Count by Scale:', result2.answerCount);
console.log('\nTop Results:');
result2.scores.slice(0, 5).forEach((lang, idx) => {
  console.log(`  ${idx + 1}. ${lang.name}: ${lang.percentage}% (${lang.count}/${result2.totalQuestions})`);
});

// Manual verification for Test Case 1
console.log('\n\n========== MANUAL VERIFICATION (Test Case 1) ==========');
console.log('Expected mapping:');
console.log('Q1: A → scaleA=A (Words of Affirmation)');
console.log('Q2: B → scaleB=D (Acts of Service)');
console.log('Q3: A → scaleA=E (Physical Touch)');
console.log('Q7: B → scaleB=A (Words of Affirmation)');
console.log('Q13: A → scaleA=A (Words of Affirmation)');
console.log('\nExpected totals should show mixed distribution across all 5 love languages.');

console.log('\n========== TEST COMPLETE ==========\n');
