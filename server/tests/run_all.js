/**
 * Centralized Test Suite Runner
 * Executes all phases and E2E test suites sequentially.
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');

const testFiles = [
  'phase2_auth.test.js',
  'e2e_auth.test.js',
  'phase3_transactions.test.js',
  'e2e_transactions.test.js',
  'phase4_budgets.test.js',
  'e2e_budgets.test.js',
  'phase5_savings.test.js',
  'e2e_savings.test.js',
  'demo_account.test.js',
  'phase6_smart_import.test.js',
  'phase7_notifications.test.js'
];

async function runTestFile(file) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, file);
    const child = spawn(process.execPath, [fullPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    child.on('close', (code) => {
      resolve({ file, code });
    });
  });
}

async function runAll() {
  console.log('==================================================');
  console.log('🚀 RUNNING ALL PERSONAL BUDGET TRACKER TEST SUITES');
  console.log('==================================================\n');

  let failedCount = 0;
  const startTime = Date.now();

  for (const file of testFiles) {
    const result = await runTestFile(file);
    if (result.code !== 0) {
      failedCount++;
      console.error(`\n❌ Test Suite Failed: ${file} (Exit code: ${result.code})\n`);
      process.exit(1);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('==================================================');
  console.log(`🎉 ALL ${testFiles.length} TEST SUITES PASSED! (${duration}s)`);
  console.log('==================================================\n');
  process.exit(0);
}

runAll();
