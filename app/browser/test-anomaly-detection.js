#!/usr/bin/env node

/**
 * Test script to simulate frontend anomaly detection flow
 * This script will:
 * 1. POST to /api/anomaly-detect
 * 2. Extract jobId from 202 response
 * 3. Poll /api/anomaly-detect/status until completion
 * 4. Display progress and results
 */

const http = require('http');

const SERVER_URL = 'http://localhost:8000';
const POLL_INTERVAL = 500; // ms

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function startDetection(date = null) {
  log('\n🚀 Starting anomaly detection test...', 'cyan');
  log(`📅 Date: ${date || 'none (all dates)'}`, 'gray');
  
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/api/anomaly-detect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  try {
    log('\n📤 Sending POST request to /api/anomaly-detect...', 'blue');
    const response = await makeRequest(options, { date });
    
    log(`\n📥 Response received:`, 'blue');
    log(`   Status: ${response.status}`, response.status === 202 ? 'green' : 'red');
    log(`   Body:`, 'gray');
    console.log(JSON.stringify(response.body, null, 2));
    
    if (response.status !== 202) {
      log(`\n❌ Expected 202 Accepted, got ${response.status}`, 'red');
      return null;
    }
    
    if (!response.body.jobId) {
      log(`\n❌ No jobId in response!`, 'red');
      return null;
    }
    
    const jobId = response.body.jobId;
    log(`\n✅ Job started successfully!`, 'green');
    log(`🆔 Job ID: ${jobId}`, 'cyan');
    
    return jobId;
  } catch (error) {
    log(`\n❌ Error starting detection: ${error.message}`, 'red');
    console.error(error);
    return null;
  }
}

async function pollStatus(jobId) {
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: `/api/anomaly-detect/status?jobId=${jobId}`,
    method: 'GET'
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.status === 404) {
      log(`\n⚠️  Job not found: ${jobId}`, 'yellow');
      return null;
    }
    
    if (response.status !== 200) {
      log(`\n❌ Status check failed: ${response.status}`, 'red');
      return null;
    }
    
    return response.body;
  } catch (error) {
    log(`\n❌ Error polling status: ${error.message}`, 'red');
    return null;
  }
}

async function monitorProgress(jobId) {
  log(`\n🔄 Starting progress monitoring for job: ${jobId}`, 'cyan');
  log(`   Polling every ${POLL_INTERVAL}ms...\n`, 'gray');
  
  const stepNames = [
    'Loading data',
    'Creating route features',
    'Aggregating data',
    'Invoking model',
    'Calculating metrics',
    'Enriching with IATA',
    'Preparing results'
  ];
  
  let lastStep = 0;
  let lastBatch = { current: 0, total: 0 };
  
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const status = await pollStatus(jobId);
      
      if (!status) {
        clearInterval(interval);
        reject(new Error('Failed to get status'));
        return;
      }
      
      // Display current step
      if (status.currentStep && status.currentStep !== lastStep) {
        lastStep = status.currentStep;
        const stepName = stepNames[status.currentStep - 1] || `Step ${status.currentStep}`;
        log(`\n📊 Step ${status.currentStep}/7: ${stepName}`, 'yellow');
      }
      
      // Display batch progress
      if (status.totalBatches > 0) {
        const batchInfo = {
          current: status.currentBatch || 0,
          total: status.totalBatches || 0
        };
        
        if (batchInfo.current !== lastBatch.current || batchInfo.total !== lastBatch.total) {
          lastBatch = batchInfo;
          const progress = batchInfo.total > 0 
            ? Math.round((batchInfo.current / batchInfo.total) * 100) 
            : 0;
          log(`   Batch: ${batchInfo.current}/${batchInfo.total} (${progress}%)`, 'gray');
        }
      }
      
      // Display overall progress
      if (status.total > 0) {
        const progress = Math.round((status.progress / status.total) * 100);
        log(`   Progress: ${status.progress}/${status.total} (${progress}%)`, 'gray');
      }
      
      // Check for completion
      if (status.completed) {
        clearInterval(interval);
        
        if (status.error) {
          log(`\n❌ Job completed with error: ${status.error}`, 'red');
          reject(new Error(status.error));
        } else if (status.result) {
          log(`\n✅ Job completed successfully!`, 'green');
          log(`\n📊 Results:`, 'cyan');
          log(`   Total routes: ${status.result.summary?.total || 0}`, 'gray');
          log(`   Anomalies: ${status.result.summary?.anomalies || 0}`, 'yellow');
          log(`   Normal: ${status.result.summary?.normal || 0}`, 'gray');
          log(`   Anomaly %: ${status.result.summary?.anomalyPercentage || 0}%`, 'yellow');
          log(`   Enriched: ${status.result.enriched?.length || 0}`, 'gray');
          
          if (status.result.anomalies && status.result.anomalies.length > 0) {
            log(`\n🔍 Sample anomalies (first 3):`, 'cyan');
            status.result.anomalies.slice(0, 3).forEach((anomaly, idx) => {
              log(`\n   ${idx + 1}. Route: ${anomaly.route}`, 'gray');
              log(`      Avg Seats: ${anomaly.avg_seats}`, 'gray');
              log(`      Deviation: ${anomaly.deviation_std}σ, ${anomaly.deviation_pct}%`, 'yellow');
            });
          }
          
          resolve(status.result);
        } else {
          log(`\n⚠️  Job completed but no result available`, 'yellow');
          resolve(null);
        }
      } else if (status.cancelled) {
        clearInterval(interval);
        log(`\n⚠️  Job was cancelled`, 'yellow');
        resolve(null);
      }
      
      // Display current status
      process.stdout.write(`\r   Status: ${status.currentStep || 0}/7 steps | `);
      if (status.totalBatches > 0) {
        process.stdout.write(`Batch ${status.currentBatch || 0}/${status.totalBatches} | `);
      }
      process.stdout.write(`${status.completed ? '✅ Completed' : '⏳ Processing...'}`);
      
    }, POLL_INTERVAL);
    
    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Monitoring timeout after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

async function main() {
  const date = process.argv[2] || null; // Optional date argument
  
  log('='.repeat(60), 'cyan');
  log('🧪 Anomaly Detection Test Script', 'bright');
  log('='.repeat(60), 'cyan');
  
  try {
    // Step 1: Start detection
    const jobId = await startDetection(date);
    
    if (!jobId) {
      log('\n❌ Failed to start detection', 'red');
      process.exit(1);
    }
    
    // Step 2: Monitor progress
    await monitorProgress(jobId);
    
    log('\n\n✅ Test completed successfully!', 'green');
    process.exit(0);
    
  } catch (error) {
    log(`\n\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main();
