'use strict';

/**
 * Question Parser Service
 * 
 * Parses and validates test questions from JSON input.
 * Supports PAPI Kostick and EPPS question formats.
 */

/**
 * PAPI Kostick question schema
 * Each question has 2 choices (A, B) with different scale assignments
 */
const PAPI_QUESTION_SCHEMA = {
  id: 'number',          // 1-90
  textA: 'string',       // Choice A text
  textB: 'string',       // Choice B text
  scaleA: 'string',      // Scale for choice A (e.g., 'G', 'E')
  scaleB: 'string'       // Scale for choice B (e.g., 'N', 'P')
};

/**
 * EPPS question schema
 * Each question has 2 statements to compare with matrix positioning
 * The needs are determined by matrix lookup (rowIdx → needA, colIdx → needB)
 */
const EPPS_QUESTION_SCHEMA = {
  id: 'number',          // 1-225
  textA: 'string',       // Statement A
  textB: 'string',       // Statement B
  rowIdx: 'number',      // Row index in EPPS matrix (1-15) - determines needA
  colIdx: 'number',      // Column index in EPPS matrix (1-15) - determines needB
  matrixGroup: 'number'  // Matrix group (1, 2, or 3)
};

/**
 * Valid PAPI scales (20 scales)
 */
const VALID_PAPI_SCALES = [
  'G', 'E', 'A', 'N', 'P', 'X', 'B', 'O', 'Z', 'K',
  'F', 'W', 'C', 'L', 'I', 'T', 'V', 'S', 'R', 'D'
];

/**
 * Valid EPPS needs (15 needs)
 */
const VALID_EPPS_NEEDS = [
  'ach', 'def', 'ord', 'exh', 'aut',
  'aff', 'int', 'suc', 'dom', 'aba',
  'nur', 'chg', 'end', 'het', 'agg'
];

/**
 * Parse and validate PAPI questions
 */
function parsePAPIQuestions(questionsData) {
  const errors = [];
  const questions = [];
  
  if (!Array.isArray(questionsData)) {
    return { valid: false, errors: ['Questions must be an array'], questions: [] };
  }
  
  if (questionsData.length !== 90) {
    errors.push(`Expected 90 questions, got ${questionsData.length}`);
  }
  
  const seenIds = new Set();
  
  questionsData.forEach((q, index) => {
    const qErrors = [];
    
    // Check required fields
    if (typeof q.id !== 'number') {
      qErrors.push(`Question ${index + 1}: id must be a number`);
    } else {
      if (seenIds.has(q.id)) {
        qErrors.push(`Question ${index + 1}: duplicate id ${q.id}`);
      }
      seenIds.add(q.id);
    }
    
    if (typeof q.textA !== 'string' || !q.textA.trim()) {
      qErrors.push(`Question ${q.id || index + 1}: textA is required`);
    }
    
    if (typeof q.textB !== 'string' || !q.textB.trim()) {
      qErrors.push(`Question ${q.id || index + 1}: textB is required`);
    }
    
    if (!VALID_PAPI_SCALES.includes(q.scaleA)) {
      qErrors.push(`Question ${q.id || index + 1}: invalid scaleA "${q.scaleA}"`);
    }
    
    if (!VALID_PAPI_SCALES.includes(q.scaleB)) {
      qErrors.push(`Question ${q.id || index + 1}: invalid scaleB "${q.scaleB}"`);
    }
    
    if (qErrors.length === 0) {
      questions.push({
        id: q.id,
        textA: q.textA.trim(),
        textB: q.textB.trim(),
        scaleA: q.scaleA,
        scaleB: q.scaleB
      });
    }
    
    errors.push(...qErrors);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    questions,
    stats: {
      total: questionsData.length,
      valid: questions.length,
      invalid: questionsData.length - questions.length
    }
  };
}

/**
 * Parse and validate EPPS questions
 * EPPS uses matrix-based scoring with rowIdx/colIdx to determine needs
 */
function parseEPPSQuestions(questionsData) {
  const errors = [];
  const questions = [];
  
  if (!Array.isArray(questionsData)) {
    return { valid: false, errors: ['Questions must be an array'], questions: [] };
  }
  
  if (questionsData.length !== 225) {
    errors.push(`Expected 225 questions, got ${questionsData.length}`);
  }
  
  const seenIds = new Set();
  
  questionsData.forEach((q, index) => {
    const qErrors = [];
    
    // Check required fields
    if (typeof q.id !== 'number') {
      qErrors.push(`Question ${index + 1}: id must be a number`);
    } else {
      if (seenIds.has(q.id)) {
        qErrors.push(`Question ${index + 1}: duplicate id ${q.id}`);
      }
      seenIds.add(q.id);
    }
    
    if (typeof q.textA !== 'string' || !q.textA.trim()) {
      qErrors.push(`Question ${q.id || index + 1}: textA is required`);
    }
    
    if (typeof q.textB !== 'string' || !q.textB.trim()) {
      qErrors.push(`Question ${q.id || index + 1}: textB is required`);
    }
    
    // Validate rowIdx (1-15)
    if (typeof q.rowIdx !== 'number' || q.rowIdx < 1 || q.rowIdx > 15) {
      qErrors.push(`Question ${q.id || index + 1}: rowIdx must be a number between 1-15, got "${q.rowIdx}"`);
    }
    
    // Validate colIdx (1-15)
    if (typeof q.colIdx !== 'number' || q.colIdx < 1 || q.colIdx > 15) {
      qErrors.push(`Question ${q.id || index + 1}: colIdx must be a number between 1-15, got "${q.colIdx}"`);
    }
    
    // Validate matrixGroup (1, 2, or 3)
    if (typeof q.matrixGroup !== 'number' || ![1, 2, 3].includes(q.matrixGroup)) {
      qErrors.push(`Question ${q.id || index + 1}: matrixGroup must be 1, 2, or 3, got "${q.matrixGroup}"`);
    }
    
    if (qErrors.length === 0) {
      questions.push({
        id: q.id,
        textA: q.textA.trim(),
        textB: q.textB.trim(),
        rowIdx: q.rowIdx,
        colIdx: q.colIdx,
        matrixGroup: q.matrixGroup
      });
    }
    
    errors.push(...qErrors);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    questions,
    stats: {
      total: questionsData.length,
      valid: questions.length,
      invalid: questionsData.length - questions.length
    }
  };
}

/**
 * Parse questions based on test type code
 */
function parseQuestions(testTypeCode, questionsData) {
  const code = testTypeCode.toLowerCase();
  
  if (code === 'papi' || code === 'papi_kostick' || code === 'papikostick') {
    return parsePAPIQuestions(questionsData);
  }
  
  if (code === 'epps' || code === 'edwards') {
    return parseEPPSQuestions(questionsData);
  }
  
  // Generic validation for custom tests
  return parseGenericQuestions(questionsData);
}

/**
 * Parse generic questions (for custom test types)
 */
function parseGenericQuestions(questionsData) {
  const errors = [];
  const questions = [];
  
  if (!Array.isArray(questionsData)) {
    return { valid: false, errors: ['Questions must be an array'], questions: [] };
  }
  
  const seenIds = new Set();
  
  questionsData.forEach((q, index) => {
    const qErrors = [];
    
    if (typeof q.id !== 'number' && typeof q.id !== 'string') {
      qErrors.push(`Question ${index + 1}: id is required`);
    } else {
      if (seenIds.has(q.id)) {
        qErrors.push(`Question ${index + 1}: duplicate id ${q.id}`);
      }
      seenIds.add(q.id);
    }
    
    // Require at least one text field
    if (!q.text && !q.textA) {
      qErrors.push(`Question ${q.id || index + 1}: text or textA is required`);
    }
    
    if (qErrors.length === 0) {
      questions.push(q);
    }
    
    errors.push(...qErrors);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    questions,
    stats: {
      total: questionsData.length,
      valid: questions.length,
      invalid: questionsData.length - questions.length
    }
  };
}

/**
 * Validate JSON string input
 */
function parseJSONInput(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return { valid: true, data, error: null };
  } catch (err) {
    return { valid: false, data: null, error: err.message };
  }
}

module.exports = {
  parsePAPIQuestions,
  parseEPPSQuestions,
  parseQuestions,
  parseGenericQuestions,
  parseJSONInput,
  VALID_PAPI_SCALES,
  VALID_EPPS_NEEDS,
  PAPI_QUESTION_SCHEMA,
  EPPS_QUESTION_SCHEMA
};
