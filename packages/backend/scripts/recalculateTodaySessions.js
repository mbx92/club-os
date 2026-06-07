#!/usr/bin/env node
'use strict';

/**
 * Script untuk recalculate scores session
 * 
 * Usage:
 *   node scripts/recalculateTodaySessions.js --dry-run           # Preview hari ini
 *   node scripts/recalculateTodaySessions.js                     # Execute hari ini
 *   node scripts/recalculateTodaySessions.js --date 2025-12-11   # Tanggal spesifik
 *   node scripts/recalculateTodaySessions.js --session <id>      # Session spesifik
 *   node scripts/recalculateTodaySessions.js --session <id> --dry-run
 */

// Load environment
const path = require('path');
const env = process.env.NODE_ENV || 'development';

// Load environment files based on NODE_ENV
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', `.env.${env}`), override: true });

const { Op } = require('sequelize');

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_DIALECT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error(`\nPlease ensure .env.${env} file exists with database configuration.`);
  process.exit(1);
}

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dateArgIndex = args.indexOf('--date');
const sessionArgIndex = args.indexOf('--session');
const targetDate = dateArgIndex !== -1 ? args[dateArgIndex + 1] : new Date().toISOString().split('T')[0];
const targetSessionId = sessionArgIndex !== -1 ? args[sessionArgIndex + 1] : null;

console.log('='.repeat(60));
console.log('RECALCULATE PSYCHOLOGY SESSIONS');
console.log('='.repeat(60));
console.log(`Environment: ${env}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'EXECUTE'}`);
if (targetSessionId) {
  console.log(`Target Session: ${targetSessionId}`);
} else {
  console.log(`Target Date: ${targetDate}`);
}
console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
console.log('='.repeat(60));

async function main() {
  // Import after dotenv loaded
  const db = require('../src/models');
  const { scoringService } = require('../src/modules/psychology/services');
  const { PsychologySession, PsychologyOrder, PsychologyTestType, Patient } = db;

  try {
    // Connect to database
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    // Build query based on arguments
    let whereClause = {
      status: { [Op.in]: ['completed', 'verified'] },
      answers: { [Op.ne]: null }
    };

    if (targetSessionId) {
      // Single session mode
      whereClause.id = targetSessionId;
    } else {
      // Date range mode
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.completedAt = {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay
      };
    }

    // Find sessions
    const sessions = await PsychologySession.findAll({
      where: whereClause,
      include: [
        { 
          model: PsychologyTestType, 
          as: 'testType'
        },
        { 
          model: PsychologyOrder, 
          as: 'order',
          include: [
            { 
              model: Patient, 
              as: 'patient',
              attributes: ['id', 'fullName', 'birthDate']
            }
          ]
        }
      ],
      order: [['completedAt', 'ASC']]
    });

    console.log(`\nFound ${sessions.length} session(s) to process\n`);

    if (sessions.length === 0) {
      console.log('No sessions found for this date.');
      process.exit(0);
    }

    // Process results
    const results = {
      total: sessions.length,
      success: 0,
      failed: 0,
      unchanged: 0,
      details: []
    };

    for (const session of sessions) {
      try {
        const testType = session.testType?.code || 'UNKNOWN';
        const patientName = session.order?.patient?.fullName || 'Unknown';
        
        // Prepare patient info for age-based scoring
        const patientInfo = {
          birthDate: session.order?.patient?.birthDate,
          testDate: session.completedAt || new Date()
        };

        // Parse questions if stored as string
        let questions = session.testType?.questions;
        if (typeof questions === 'string') {
          try {
            questions = JSON.parse(questions);
          } catch (e) {
            // Keep as is
          }
        }

        if (!questions || !Array.isArray(questions)) {
          console.log(`⚠️  [${session.id}] ${testType} - No questions found, skipping`);
          results.failed++;
          continue;
        }

        // Calculate old score summary
        const oldScores = session.scores || {};
        let oldRawScore = 0;
        if (testType === 'CFIT') {
          oldRawScore = oldScores.rawScore ?? 0;
        } else if (testType === 'PAPI') {
          oldRawScore = Object.values(oldScores).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
        } else {
          oldRawScore = oldScores.rawScore ?? Object.values(oldScores).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
        }

        // Calculate new scores
        const scoringResult = scoringService.verifyAndScore(
          testType,
          session.answers,
          questions,
          patientInfo
        );

        // Calculate new score summary
        const newScores = scoringResult.scores || {};
        let newRawScore = 0;
        if (testType === 'CFIT') {
          newRawScore = newScores.rawScore ?? 0;
        } else if (testType === 'PAPI') {
          newRawScore = Object.values(newScores).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
        } else {
          newRawScore = newScores.rawScore ?? Object.values(newScores).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
        }

        const changed = oldRawScore !== newRawScore;
        const changeSymbol = changed ? '🔄' : '✓';
        
        console.log(`${changeSymbol} [${session.id.substring(0, 8)}] ${testType.padEnd(6)} | ${patientName.substring(0, 25).padEnd(25)} | Score: ${oldRawScore} → ${newRawScore}`);

        if (changed) {
          if (!dryRun) {
            session.scores = scoringResult.scores;
            session.interpretation = scoringResult.interpretation;
            await session.save();
            console.log(`   ✅ Updated!`);
          } else {
            console.log(`   📋 Would be updated (dry run)`);
          }
          results.success++;
        } else {
          results.unchanged++;
        }

        // Store detail for CFIT to show subtest breakdown
        if (testType === 'CFIT' && changed) {
          const oldSubtest = oldScores.subtestScores || {};
          const newSubtest = newScores.subtestScores || {};
          console.log(`   Subtests: series(${oldSubtest.series || 0}→${newSubtest.series || 0}), classification(${oldSubtest.classification || 0}→${newSubtest.classification || 0}), matrices(${oldSubtest.matrices || 0}→${newSubtest.matrices || 0}), topology(${oldSubtest.topology || 0}→${newSubtest.topology || 0})`);
          if (newScores.iqScore) {
            console.log(`   IQ: ${oldScores.iqScore || 'N/A'} → ${newScores.iqScore} (${newScores.classification || 'N/A'})`);
          }
        }

        // Store detail for PAPI to show scale breakdown
        if (testType === 'PAPI' && changed) {
          const changedScales = [];
          for (const scale of ['G', 'A', 'N', 'L', 'P', 'I', 'T', 'V', 'S', 'R', 'D', 'C', 'E', 'W', 'F', 'K', 'Z', 'O', 'B', 'X']) {
            if ((oldScores[scale] || 0) !== (newScores[scale] || 0)) {
              changedScales.push(`${scale}:${oldScores[scale] || 0}→${newScores[scale] || 0}`);
            }
          }
          if (changedScales.length > 0) {
            console.log(`   Changed scales: ${changedScales.join(', ')}`);
          }
        }

        results.details.push({
          sessionId: session.id,
          testType,
          patientName,
          oldRawScore,
          newRawScore,
          changed
        });

      } catch (err) {
        console.log(`❌ [${session.id}] Error: ${err.message}`);
        results.failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total sessions:  ${results.total}`);
    console.log(`Updated:         ${results.success}`);
    console.log(`Unchanged:       ${results.unchanged}`);
    console.log(`Failed:          ${results.failed}`);
    console.log('='.repeat(60));

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made to the database');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Recalculation complete!');
    }

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
