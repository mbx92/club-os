/**
 * CFIT Scoring Service
 * Service untuk menghitung score, konversi IQ, dan klasifikasi hasil tes CFIT
 */

const { PsychologyNorm } = require('../../models');
const { calculateAge, getAgeGroup, formatAge } = require('../../utils/ageCalculator');
const logger = require('../../utils/logger');

class CFITScoringService {
  /**
   * Hitung skor per subtes
   * @param {Array} answers - Jawaban user [{questionId, answer}]
   * @param {Array} questions - Array questions dari test type
   * @returns {Object} {series: 8, classification: 10, matrices: 9, topology: 6}
   */
  calculateSubtestScores(answers, questions) {
    const subtestScores = {
      series: 0,
      classification: 0,
      matrices: 0,
      topology: 0
    };

    // Create answer map for quick lookup
    const answerMap = {};
    answers.forEach(a => {
      answerMap[a.questionId] = a.answer;
    });

    // Count correct answers per subtest
    questions.forEach(question => {
      // Skip examples
      if (question.type === 'example') return;

      const userAnswer = answerMap[question.id];
      const correctAnswer = question.answer;

      if (userAnswer && userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
        const subtest = question.subtest;
        if (subtestScores.hasOwnProperty(subtest)) {
          subtestScores[subtest]++;
        }
      }
    });

    return subtestScores;
  }

  /**
   * Hitung total raw score
   * @param {Object} subtestScores - Skor per subtes
   * @returns {number} Total jawaban benar (0-46)
   */
  calculateRawScore(subtestScores) {
    return Object.values(subtestScores).reduce((sum, score) => sum + score, 0);
  }

  /**
   * Konversi raw score ke IQ berdasarkan usia
   * @param {number} rawScore - Raw score dari tes
   * @param {Date|string} birthDate - Tanggal lahir peserta
   * @param {Date|string} testDate - Tanggal tes
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} { iqScore, classification }
   */
  async convertToIQ(rawScore, birthDate, testDate, tenantId) {
    try {
      // Calculate age
      const age = calculateAge(birthDate, testDate);
      const ageGroupLabel = getAgeGroup(age.totalMonths);

      logger.info(`[CFIT Scoring] Raw score: ${rawScore}, Age: ${age.years}y ${age.months}m, Group: ${ageGroupLabel}`);

      // Find norm in database
      const norm = await PsychologyNorm.findOne({
        where: {
          tenantId,
          testTypeCode: 'CFIT',
          ageGroupLabel,
          rawScore
        }
      });

      if (!norm) {
        logger.warn(`[CFIT Scoring] Norm not found for raw score ${rawScore} in age group ${ageGroupLabel}`);
        
        // Return approximate classification based on raw score ranges
        return {
          iqScore: null,
          classification: this.getApproximateClassification(rawScore)
        };
      }

      return {
        iqScore: norm.convertedScore,
        classification: norm.classification
      };
    } catch (error) {
      logger.error(`[CFIT Scoring] Error converting to IQ: ${error.message}`);
      throw error;
    }
  }

  /**
   * Dapatkan klasifikasi approximate jika norm tidak ditemukan
   * @param {number} rawScore - Raw score
   * @returns {string} Classification label
   */
  getApproximateClassification(rawScore) {
    if (rawScore >= 44) return 'VERY SUPERIOR';
    if (rawScore >= 28) return 'SUPERIOR';
    if (rawScore >= 17) return 'AVERAGE';
    if (rawScore >= 14) return 'LOW AVERAGE';
    if (rawScore >= 10) return 'BORDERLINE MENTAL RETARDATION';
    if (rawScore >= 4) return 'MILD MENTAL RETARDATION';
    return 'PROFOUND MENTAL RETARDATION';
  }

  /**
   * Dapatkan klasifikasi berdasarkan IQ score
   * @param {number} iqScore - IQ Score
   * @returns {string} Classification label
   */
  getClassificationByIQ(iqScore) {
    if (!iqScore) return 'UNKNOWN';
    
    if (iqScore >= 170) return 'GENIUS';
    if (iqScore >= 140) return 'VERY SUPERIOR';
    if (iqScore >= 120) return 'SUPERIOR';
    if (iqScore >= 90) return 'AVERAGE';
    if (iqScore >= 80) return 'LOW AVERAGE';
    if (iqScore >= 70) return 'BORDERLINE MENTAL RETARDATION';
    if (iqScore >= 50) return 'MILD MENTAL RETARDATION';
    return 'PROFOUND MENTAL RETARDATION';
  }

  /**
   * Generate hasil lengkap CFIT
   * @param {Object} sessionData - Data session lengkap
   * @param {Array} answers - Jawaban peserta
   * @param {Array} questions - Questions dari test type
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Complete result object
   */
  async generateResult(sessionData, answers, questions, tenantId) {
    try {
      const { birthDate, testDate, name, gender } = sessionData;

      // Calculate subtest scores
      const subtestScores = this.calculateSubtestScores(answers, questions);
      
      // Calculate raw score
      const rawScore = this.calculateRawScore(subtestScores);

      // Convert to IQ
      const { iqScore, classification } = await this.convertToIQ(
        rawScore,
        birthDate,
        testDate,
        tenantId
      );

      // Calculate age details
      const age = calculateAge(birthDate, testDate);

      const result = {
        testCode: 'CFIT',
        testName: 'Culture Fair Intelligence Test - Form 2A',
        participant: {
          name,
          gender,
          birthDate: new Date(birthDate).toISOString().split('T')[0],
          testDate: new Date(testDate).toISOString().split('T')[0],
          age: {
            years: age.years,
            months: age.months,
            days: age.days,
            formatted: formatAge(age)
          }
        },
        results: {
          subtestScores,
          rawScore,
          maxRawScore: 46,
          iqScore,
          classification
        },
        scoreBreakdown: {
          series: {
            score: subtestScores.series,
            maxScore: 12,
            percentage: Math.round((subtestScores.series / 12) * 100)
          },
          classification: {
            score: subtestScores.classification,
            maxScore: 14,
            percentage: Math.round((subtestScores.classification / 14) * 100)
          },
          matrices: {
            score: subtestScores.matrices,
            maxScore: 12,
            percentage: Math.round((subtestScores.matrices / 12) * 100)
          },
          topology: {
            score: subtestScores.topology,
            maxScore: 8,
            percentage: Math.round((subtestScores.topology / 8) * 100)
          }
        },
        generatedAt: new Date()
      };

      logger.info(`[CFIT Scoring] Result generated for ${name}: Raw=${rawScore}, IQ=${iqScore}, Class=${classification}`);

      return result;
    } catch (error) {
      logger.error(`[CFIT Scoring] Error generating result: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate answers completeness
   * @param {Array} answers - User answers
   * @param {number} expectedCount - Expected question count
   * @returns {Object} { isComplete, answeredCount, missingCount }
   */
  validateAnswers(answers, expectedCount = 46) {
    const answeredCount = answers.filter(a => a.answer && a.answer.trim() !== '').length;
    const missingCount = expectedCount - answeredCount;

    return {
      isComplete: answeredCount === expectedCount,
      answeredCount,
      missingCount,
      completionPercentage: Math.round((answeredCount / expectedCount) * 100)
    };
  }
}

module.exports = new CFITScoringService();
