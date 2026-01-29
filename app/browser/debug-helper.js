#!/usr/bin/env node

/**
 * Debug helper script to check backend state
 * Usage: node debug-helper.js
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:8000${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
  });
}

async function debug() {
  console.log('='.repeat(60));
  console.log('🔍 DEBUG HELPER - Checking Backend State');
  console.log('='.repeat(60));
  
  try {
    // Check active jobs
    console.log('\n📊 Active Jobs:');
    const jobs = await makeRequest('/api/debug/jobs');
    console.log(JSON.stringify(jobs, null, 2));
    
    // Test status endpoint with a fake jobId
    console.log('\n🧪 Testing status endpoint:');
    const status = await makeRequest('/api/anomaly-detect/status?jobId=test');
    console.log(JSON.stringify(status, null, 2));
    
    // Test anomaly detect endpoint
    console.log('\n🧪 Testing anomaly detect endpoint:');
    const testJob = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8000,
        path: '/api/anomaly-detect',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk.toString());
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body: body });
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify({ date: null }));
      req.end();
    });
    console.log('Response:', JSON.stringify(testJob, null, 2));
    
    if (testJob.body && testJob.body.jobId) {
      console.log(`\n✅ Got jobId: ${testJob.body.jobId}`);
      console.log('\n⏳ Waiting 2 seconds, then checking status...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const jobStatus = await makeRequest(`/api/anomaly-detect/status?jobId=${testJob.body.jobId}`);
      console.log('\n📊 Job Status:');
      console.log(JSON.stringify(jobStatus, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

debug();
