'use strict';

/**
 * Scoring Service
 * 
 * Calculates and verifies test scores.
 * Ports Vue frontend scoring logic to backend for verification.
 * 
 * Architecture: Hybrid Scoring
 * - Frontend calculates for preview
 * - Backend recalculates for verification & storage
 * - This ensures score integrity and prevents manipulation
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract actual answer from various answer formats
 * Handles:
 * - String: "A"
 * - Object: { answer: "A", duration: 8 }
 * - Double nested: { answer: { answer: "A", duration: 8 }, duration: 0 }
 * - Triple nested or more
 */
function extractAnswer(answerData) {
  if (!answerData) return null;
  
  // If string, return directly
  if (typeof answerData === 'string') {
    return answerData;
  }
  
  // If object, extract answer property
  if (typeof answerData === 'object') {
    let current = answerData;
    let depth = 0;
    const maxDepth = 5; // Prevent infinite loop
    
    while (current && typeof current === 'object' && current.answer !== undefined && depth < maxDepth) {
      if (typeof current.answer === 'string') {
        return current.answer;
      }
      current = current.answer;
      depth++;
    }
    
    // If we got a string at any point
    if (typeof current === 'string') {
      return current;
    }
  }
  
  return null;
}

// Load CFIT norms
let CFIT_NORMS = null;
try {
  const normsPath = path.join(__dirname, '../../../../docs/soalPsikolog/data/cfit-norms.json');
  CFIT_NORMS = JSON.parse(fs.readFileSync(normsPath, 'utf8'));
} catch (error) {
  console.warn('Warning: CFIT norms file not found, CFIT IQ scoring will use fallback');
}

// CFIT Subtests configuration
const CFIT_SUBTESTS = {
  series: { questionCount: 12, maxScore: 12 },
  classification: { questionCount: 14, maxScore: 14 },
  matrices: { questionCount: 12, maxScore: 12 },
  topology: { questionCount: 8, maxScore: 8 }
};

// CFIT Classification ranges (fallback if norms file not loaded)
const CFIT_CLASSIFICATIONS = [
  { classification: 'GENIUS', minIQ: 170, maxIQ: null, description: 'Kemampuan intelektual sangat luar biasa' },
  { classification: 'VERY SUPERIOR', minIQ: 140, maxIQ: 169, description: 'Kemampuan intelektual sangat tinggi' },
  { classification: 'SUPERIOR', minIQ: 120, maxIQ: 139, description: 'Kemampuan intelektual di atas rata-rata' },
  { classification: 'AVERAGE', minIQ: 90, maxIQ: 119, description: 'Kemampuan intelektual rata-rata' },
  { classification: 'LOW AVERAGE', minIQ: 80, maxIQ: 89, description: 'Kemampuan intelektual di bawah rata-rata' },
  { classification: 'BORDERLINE', minIQ: 70, maxIQ: 79, description: 'Batas kemampuan intelektual' },
  { classification: 'MILD DEFICIT', minIQ: 50, maxIQ: 69, description: 'Kemampuan intelektual rendah' },
  { classification: 'SIGNIFICANT DEFICIT', minIQ: null, maxIQ: 49, description: 'Kemampuan intelektual sangat rendah' }
];

// PAPI Kostick 20 scales
const PAPI_SCALES = [
  'G', 'E', 'A', 'N', 'P', 'X', 'B', 'O', 'Z', 'K',
  'F', 'W', 'C', 'L', 'I', 'T', 'V', 'S', 'R', 'D'
];

// PAPI Scale labels (Indonesian)
const PAPI_SCALE_LABELS = {
  G: 'Hard Working',
  E: 'Emotional Control',
  A: 'Need to Achieve',
  N: 'Need for Rules',
  P: 'Need for Attention',
  X: 'Need for Change',
  B: 'Need to Belong',
  O: 'Need to be Noticed',
  Z: 'Need for Affection',
  K: 'Need for Closeness',
  F: 'Need for Fairness',
  W: 'Need for Independence',
  C: 'Composure',
  L: 'Leadership',
  I: 'Ease in Decision Making',
  T: 'Pace',
  V: 'Vigor',
  S: 'Social Extension',
  R: 'Need for Support',
  D: 'Attention to Detail'
};

// EPPS 15 needs
const EPPS_NEEDS = [
  'ach', 'def', 'ord', 'exh', 'aut',
  'aff', 'int', 'suc', 'dom', 'aba',
  'nur', 'chg', 'end', 'het', 'agg'
];

/**
 * EPPS Matrix mapping
 * rowIdx (1-15) → needA
 * colIdx (1-15) → needB
 * Index 1 = ach, 2 = def, ..., 15 = agg
 */
const EPPS_INDEX_TO_NEED = {
  1: 'ach',
  2: 'def',
  3: 'ord',
  4: 'exh',
  5: 'aut',
  6: 'aff',
  7: 'int',
  8: 'suc',
  9: 'dom',
  10: 'aba',
  11: 'nur',
  12: 'chg',
  13: 'end',
  14: 'het',
  15: 'agg'
};

// EPPS Need labels (Indonesian)
const EPPS_NEED_LABELS = {
  ach: 'Achievement',
  def: 'Deference',
  ord: 'Order',
  exh: 'Exhibition',
  aut: 'Autonomy',
  aff: 'Affiliation',
  int: 'Intraception',
  suc: 'Succorance',
  dom: 'Dominance',
  aba: 'Abasement',
  nur: 'Nurturance',
  chg: 'Change',
  end: 'Endurance',
  het: 'Heterosexuality',
  agg: 'Aggression'
};

/**
 * Calculate PAPI Kostick scores
 * 
 * @param {Array|Object} answers - Array of { id, answer } OR Object { "1": "A", "2": "B" }
 * @param {Array} questions - Array of questions with scaleA, scaleB
 * @returns {Object} Scores for each scale (0-9)
 */
function calculatePAPIScores(answers, questions) {
  // Initialize scores
  const scores = {};
  PAPI_SCALES.forEach(scale => {
    scores[scale] = 0;
  });
  
  // Create question map for quick lookup
  const questionMap = new Map();
  questions.forEach(q => {
    questionMap.set(q.id, q);
    questionMap.set(String(q.id), q); // Also map string version
  });
  
  // Normalize answers to array format
  let normalizedAnswers = [];
  if (Array.isArray(answers)) {
    normalizedAnswers = answers.map(ans => ({
      id: ans.id,
      answer: extractAnswer(ans.answer || ans)
    }));
  } else if (answers && typeof answers === 'object') {
    // Convert object { "1": "A", "2": "B" } OR { "1": { answer: "A", duration: 8 } } to array
    normalizedAnswers = Object.entries(answers).map(([id, answerData]) => {
      // Handle all formats using extractAnswer helper
      const actualAnswer = extractAnswer(answerData);
      return {
        id: parseInt(id) || id,
        answer: actualAnswer
      };
    });
  }
  
  // Calculate scores
  normalizedAnswers.forEach(ans => {
    const question = questionMap.get(ans.id) || questionMap.get(String(ans.id));
    if (!question) return;
    
    const answer = (ans.answer || '').toString().toUpperCase();
    if (answer === 'A' && question.scaleA) {
      scores[question.scaleA] = (scores[question.scaleA] || 0) + 1;
    } else if (answer === 'B' && question.scaleB) {
      scores[question.scaleB] = (scores[question.scaleB] || 0) + 1;
    }
  });
  
  return scores;
}

/**
 * Calculate EPPS scores
 * Uses matrix lookup: rowIdx → needA, colIdx → needB
 * 
 * @param {Object} answers - Object { "1": "A", "2": "B", ... }
 * @param {Array} questions - Array of questions with rowIdx, colIdx, matrixGroup
 * @returns {Object} Scores with needs, BD, BH, S, and consistency
 */
function calculateEPPSScores(answers, questions) {
  // Initialize need scores
  const needs = {};
  EPPS_NEEDS.forEach(need => {
    needs[need] = 0;
  });
  
  // Create question map
  const questionMap = new Map();
  questions.forEach(q => {
    questionMap.set(q.id, q);
  });
  
  // Calculate need scores using matrix lookup
  Object.entries(answers).forEach(([qId, answerData]) => {
    const question = questionMap.get(parseInt(qId));
    if (!question) return;
    
    // Extract answer using helper to handle nested formats
    const answer = extractAnswer(answerData);
    const choice = answer?.toUpperCase();
    
    // Determine needs from matrix indices
    const needA = EPPS_INDEX_TO_NEED[question.rowIdx];
    const needB = EPPS_INDEX_TO_NEED[question.colIdx];
    
    if (choice === 'A' && needA) {
      needs[needA] = (needs[needA] || 0) + 1;
    } else if (choice === 'B' && needB) {
      needs[needB] = (needs[needB] || 0) + 1;
    }
  });
  
  // Calculate BD (same choice for repeated pairs)
  // In EPPS, some pairs repeat - BD counts consistent choices
  const BD = calculateEPPSConsistency(answers, questions, 'BD');
  
  // Calculate BH (different choice for repeated pairs)
  const BH = calculateEPPSConsistency(answers, questions, 'BH');
  
  // S = Total score should equal specific value based on matrix
  const S = Object.values(needs).reduce((sum, n) => sum + n, 0);
  
  // Consistency index
  const consistency = {
    BD,
    BH,
    S,
    valid: S === 225 && (BD + BH) === 15 // Standard EPPS validation
  };
  
  return {
    needs,
    consistency,
    totalScore: S
  };
}

/**
 * Calculate EPPS consistency (BD/BH)
 * EPPS has 15 repeated question pairs to check consistency
 */
function calculateEPPSConsistency(answers, questions, type) {
  // This is a simplified version
  // Full implementation would track repeated pairs
  // and compare answers for consistency
  return 0; // Placeholder - implement based on actual repeated pairs
}

/**
 * Calculate CFIT (Culture Fair Intelligence Test) scores
 * 
 * CFIT has 4 subtests: Series, Classification, Matrices, Topology
 * Each correct answer = 1 point
 * Total raw score is converted to IQ using age-based norms
 * 
 * @param {Object} answers - Object with subtest answers { series: { "1": "C", "2": "D" }, ... }
 * @param {Array} questions - Array of questions from testType
 * @param {Object} patientInfo - Patient info including birthDate and testDate for age calculation
 * @returns {Object} Scores including subtestScores, rawScore, iqScore, classification
 */
function calculateCFITScores(answers, questions, patientInfo = {}) {
  // Initialize subtest scores
  const subtestScores = {
    series: 0,
    classification: 0,
    matrices: 0,
    topology: 0
  };
  
  // Create answer key map from questions
  const answerKeyMap = new Map();
  questions.forEach(q => {
    // Questions have format: { id: "series_1", subtest: "series", answer: "C" }
    if (q.type === 'question' && q.answer) {
      answerKeyMap.set(q.id, {
        subtest: q.subtest,
        answer: q.answer.toUpperCase()
      });
    }
  });
  
  // Calculate raw scores per subtest
  // Answers format: { "series_1": "C", "series_2": "D", ... } 
  // OR new format: { "series_1": { answer: "C", duration: 8, timestamp: "..." } }
  // OR double nested: { "series_1": { answer: { answer: "C", duration: 8 }, duration: 0 } }
  // OR nested format: { series: { "1": "C" }, ... }
  if (answers && typeof answers === 'object') {
    // Handle flat format: { "series_1": "C", "classification_1": "B" }
    if (!answers.series && !answers.classification) {
      Object.entries(answers).forEach(([questionId, userAnswerData]) => {
        const key = answerKeyMap.get(questionId);
        if (!key) return;
        
        // Extract actual answer - handle multiple nested formats
        const userAnswer = extractAnswer(userAnswerData);
        
        if (userAnswer && userAnswer.toString().toUpperCase() === key.answer) {
          subtestScores[key.subtest]++;
        }
      });
    } else {
      // Handle nested format: { series: { "1": "C" }, classification: { "1": "B" } }
      Object.entries(answers).forEach(([subtest, subtestAnswers]) => {
        if (subtestAnswers && typeof subtestAnswers === 'object') {
          Object.entries(subtestAnswers).forEach(([qNum, userAnswerData]) => {
            const questionId = `${subtest}_${qNum}`;
            const key = answerKeyMap.get(questionId);
            if (!key) return;
            
            // Extract actual answer
            const userAnswer = extractAnswer(userAnswerData);
            
            if (userAnswer && userAnswer.toString().toUpperCase() === key.answer) {
              subtestScores[key.subtest]++;
            }
          });
        }
      });
    }
  }
  
  // Calculate total raw score
  const rawScore = Object.values(subtestScores).reduce((sum, s) => sum + s, 0);
  
  // Calculate age in months for norm lookup
  let ageInMonths = null;
  let ageGroup = '14-0_14-11'; // Default age group
  
  if (patientInfo.birthDate) {
    const birthDate = new Date(patientInfo.birthDate);
    const testDate = patientInfo.testDate ? new Date(patientInfo.testDate) : new Date();
    
    const years = testDate.getFullYear() - birthDate.getFullYear();
    const months = testDate.getMonth() - birthDate.getMonth();
    ageInMonths = (years * 12) + months;
    
    // Determine age group from ageInMonths
    ageGroup = getAgeGroup(ageInMonths);
  }
  
  // Convert raw score to IQ using norms
  const { iqScore, classification } = convertRawToIQ(rawScore, ageGroup);
  
  // Calculate percentile scores for each subtest
  const subtestPercentiles = {};
  Object.entries(subtestScores).forEach(([subtest, score]) => {
    const maxScore = CFIT_SUBTESTS[subtest]?.maxScore || 12;
    subtestPercentiles[subtest] = Math.round((score / maxScore) * 100);
  });
  
  return {
    subtestScores,
    subtestPercentiles,
    rawScore,
    maxRawScore: 46,
    iqScore,
    classification,
    ageInMonths,
    ageGroup,
    totalPercentile: Math.round((rawScore / 46) * 100)
  };
}

/**
 * Get age group key for CFIT norms lookup
 */
function getAgeGroup(ageInMonths) {
  // Currently we only have norms for 14-0 to 14-11 (168-179 months)
  // In production, this would have more age ranges
  if (CFIT_NORMS && CFIT_NORMS.ageGroups) {
    for (const [key, group] of Object.entries(CFIT_NORMS.ageGroups)) {
      if (ageInMonths >= group.ageMonthsStart && ageInMonths <= group.ageMonthsEnd) {
        return key;
      }
    }
  }
  
  // Default to the only available age group
  return '14-0_14-11';
}

/**
 * Convert CFIT raw score to IQ using age-based norms
 */
function convertRawToIQ(rawScore, ageGroup) {
  // Try to find from norms file
  if (CFIT_NORMS && CFIT_NORMS.ageGroups && CFIT_NORMS.ageGroups[ageGroup]) {
    const norms = CFIT_NORMS.ageGroups[ageGroup].norms;
    
    // Find the norm entry for this raw score
    // Norms may have duplicate rawScores (different IQ values), take the first match
    const normEntry = norms.find(n => n.rawScore === rawScore);
    
    if (normEntry && normEntry.iqScore) {
      const iqScore = normEntry.iqScore;
      const classification = normEntry.classification || getIQClassification(iqScore);
      
      return {
        iqScore,
        classification
      };
    }
    
    // If exact match not found, find closest
    const sortedNorms = [...norms].sort((a, b) => 
      Math.abs(a.rawScore - rawScore) - Math.abs(b.rawScore - rawScore)
    );
    
    if (sortedNorms.length > 0 && sortedNorms[0].iqScore) {
      const iqScore = sortedNorms[0].iqScore;
      const classification = sortedNorms[0].classification || getIQClassification(iqScore);
      
      return {
        iqScore,
        classification
      };
    }
  }
  
  // Fallback: Estimate IQ using standard formula
  // IQ = (rawScore / maxRawScore) * 100 + 50 (rough approximation)
  const estimatedIQ = Math.round((rawScore / 46) * 70 + 60);
  const classification = getIQClassification(estimatedIQ);
  
  return {
    iqScore: estimatedIQ,
    classification,
    estimated: true
  };
}

/**
 * Get classification from IQ score
 */
function getIQClassification(iqScore) {
  const ranges = CFIT_NORMS?.classificationRanges || CFIT_CLASSIFICATIONS;
  
  for (const range of ranges) {
    const minCheck = range.minIQ === null || iqScore >= range.minIQ;
    const maxCheck = range.maxIQ === null || iqScore <= range.maxIQ;
    
    if (minCheck && maxCheck) {
      return range.classification;
    }
  }
  
  return 'AVERAGE';
}

/**
 * Generate CFIT interpretation
 */
function generateCFITInterpretation(scores) {
  const subtestInterpretations = {};
  
  Object.entries(scores.subtestScores).forEach(([subtest, score]) => {
    const maxScore = CFIT_SUBTESTS[subtest]?.maxScore || 12;
    const percentage = (score / maxScore) * 100;
    
    let level;
    if (percentage >= 80) level = 'high';
    else if (percentage >= 50) level = 'medium';
    else level = 'low';
    
    subtestInterpretations[subtest] = {
      score,
      maxScore,
      percentage: Math.round(percentage),
      level,
      description: getSubtestDescription(subtest, level)
    };
  });
  
  // Get classification description
  const classificationInfo = (CFIT_NORMS?.classificationRanges || CFIT_CLASSIFICATIONS)
    .find(c => c.classification === scores.classification);
  
  return {
    subtests: subtestInterpretations,
    overall: {
      rawScore: scores.rawScore,
      maxRawScore: scores.maxRawScore,
      iqScore: scores.iqScore,
      classification: scores.classification,
      classificationDescription: classificationInfo?.description || '',
      percentile: scores.totalPercentile
    },
    ageInfo: {
      ageInMonths: scores.ageInMonths,
      ageGroup: scores.ageGroup
    }
  };
}

/**
 * Get description for CFIT subtest performance
 */
function getSubtestDescription(subtest, level) {
  const descriptions = {
    series: {
      high: 'Kemampuan sangat baik dalam mengenali pola dan melanjutkan urutan',
      medium: 'Kemampuan cukup dalam mengenali pola dan melanjutkan urutan',
      low: 'Perlu pengembangan dalam mengenali pola dan melanjutkan urutan'
    },
    classification: {
      high: 'Kemampuan sangat baik dalam mengklasifikasi dan membedakan objek',
      medium: 'Kemampuan cukup dalam mengklasifikasi dan membedakan objek',
      low: 'Perlu pengembangan dalam mengklasifikasi dan membedakan objek'
    },
    matrices: {
      high: 'Kemampuan sangat baik dalam berpikir analogis dan melengkapi pola',
      medium: 'Kemampuan cukup dalam berpikir analogis dan melengkapi pola',
      low: 'Perlu pengembangan dalam berpikir analogis dan melengkapi pola'
    },
    topology: {
      high: 'Kemampuan sangat baik dalam memahami hubungan spasial',
      medium: 'Kemampuan cukup dalam memahami hubungan spasial',
      low: 'Perlu pengembangan dalam memahami hubungan spasial'
    }
  };
  
  return descriptions[subtest]?.[level] || '';
}

/**
 * Get interpretation for PAPI score
 */
function getPAPIInterpretation(scale, score) {
  // Score ranges: Low (0-3), Medium (4-6), High (7-9)
  let level;
  if (score <= 3) level = 'low';
  else if (score <= 6) level = 'medium';
  else level = 'high';
  
  return {
    scale,
    score,
    level,
    label: PAPI_SCALE_LABELS[scale] || scale,
    percentile: Math.round((score / 9) * 100)
  };
}

/**
 * Get interpretation for EPPS need
 */
function getEPPSInterpretation(need, score) {
  // EPPS scores typically range 0-28 per need
  // Normalized percentile calculation
  const maxScore = 28;
  let level;
  if (score <= 9) level = 'low';
  else if (score <= 18) level = 'medium';
  else level = 'high';
  
  return {
    need,
    score,
    level,
    label: EPPS_NEED_LABELS[need] || need,
    percentile: Math.round((score / maxScore) * 100)
  };
}

/**
 * Generate full PAPI interpretation
 */
function generatePAPIInterpretation(scores) {
  const interpretations = [];
  
  PAPI_SCALES.forEach(scale => {
    interpretations.push(getPAPIInterpretation(scale, scores[scale] || 0));
  });
  
  // Sort by score descending for profile
  const sortedByScore = [...interpretations].sort((a, b) => b.score - a.score);
  
  return {
    scales: interpretations,
    topScales: sortedByScore.slice(0, 5),
    lowScales: sortedByScore.slice(-5).reverse(),
    profile: generatePAPIProfile(scores)
  };
}

/**
 * Generate PAPI profile categories
 */
function generatePAPIProfile(scores) {
  return {
    workStyle: {
      pace: scores.T || 0,
      vigor: scores.V || 0,
      detail: scores.D || 0,
      hardWorking: scores.G || 0
    },
    leadership: {
      leadership: scores.L || 0,
      decisionMaking: scores.I || 0,
      control: scores.E || 0
    },
    social: {
      socialExtension: scores.S || 0,
      attention: scores.P || 0,
      closeness: scores.K || 0
    },
    motivation: {
      achievement: scores.A || 0,
      change: scores.X || 0,
      independence: scores.W || 0
    }
  };
}

/**
 * Generate full EPPS interpretation
 */
function generateEPPSInterpretation(scores) {
  const interpretations = [];
  
  EPPS_NEEDS.forEach(need => {
    interpretations.push(getEPPSInterpretation(need, scores.needs[need] || 0));
  });
  
  // Sort by score descending
  const sortedByScore = [...interpretations].sort((a, b) => b.score - a.score);
  
  return {
    needs: interpretations,
    topNeeds: sortedByScore.slice(0, 5),
    lowNeeds: sortedByScore.slice(-5).reverse(),
    consistency: scores.consistency,
    profile: generateEPPSProfile(scores.needs)
  };
}

/**
 * Generate EPPS profile categories
 */
function generateEPPSProfile(needs) {
  return {
    achievement: {
      achievement: needs.ach || 0,
      endurance: needs.end || 0,
      order: needs.ord || 0
    },
    social: {
      affiliation: needs.aff || 0,
      nurturance: needs.nur || 0,
      succorance: needs.suc || 0
    },
    dominance: {
      dominance: needs.dom || 0,
      aggression: needs.agg || 0,
      autonomy: needs.aut || 0
    },
    selfExpression: {
      exhibition: needs.exh || 0,
      change: needs.chg || 0,
      heterosexuality: needs.het || 0
    }
  };
}

/**
 * Verify and score a session
 * Main entry point for backend scoring
 * 
 * @param {string} testTypeCode - Test type code (PAPI, EPPS, CFIT, etc.)
 * @param {Object} answers - User's answers
 * @param {Array} questions - Test questions
 * @param {Object} patientInfo - Optional patient info for age-based scoring (used by CFIT)
 */
function verifyAndScore(testTypeCode, answers, questions, patientInfo = {}) {
  const code = testTypeCode.toLowerCase();
  
  if (code === 'papi' || code === 'papi_kostick' || code === 'papikostick') {
    const scores = calculatePAPIScores(answers, questions);
    const interpretation = generatePAPIInterpretation(scores);
    return {
      testType: 'PAPI_KOSTICK',
      scores,
      interpretation,
      verifiedAt: new Date().toISOString()
    };
  }
  
  if (code === 'epps' || code === 'edwards') {
    const scores = calculateEPPSScores(answers, questions);
    const interpretation = generateEPPSInterpretation(scores);
    return {
      testType: 'EPPS',
      scores,
      interpretation,
      verifiedAt: new Date().toISOString()
    };
  }
  
  if (code === 'cfit' || code === 'culture_fair') {
    const scores = calculateCFITScores(answers, questions, patientInfo);
    const interpretation = generateCFITInterpretation(scores);
    return {
      testType: 'CFIT',
      scores,
      interpretation,
      verifiedAt: new Date().toISOString()
    };
  }
  
  // Unknown test type
  return {
    testType: code,
    scores: null,
    interpretation: null,
    error: `Scoring not implemented for test type: ${code}`,
    verifiedAt: new Date().toISOString()
  };
}

module.exports = {
  // Main functions
  calculatePAPIScores,
  calculateEPPSScores,
  calculateCFITScores,
  verifyAndScore,
  
  // Interpretation
  generatePAPIInterpretation,
  generateEPPSInterpretation,
  generateCFITInterpretation,
  getPAPIInterpretation,
  getEPPSInterpretation,
  
  // CFIT helpers
  convertRawToIQ,
  getIQClassification,
  getAgeGroup,
  
  // Constants
  PAPI_SCALES,
  PAPI_SCALE_LABELS,
  EPPS_NEEDS,
  EPPS_NEED_LABELS,
  EPPS_INDEX_TO_NEED,
  CFIT_SUBTESTS,
  CFIT_CLASSIFICATIONS
};
