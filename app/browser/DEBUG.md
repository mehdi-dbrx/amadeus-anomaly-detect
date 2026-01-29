# Debug Guide: Frontend to Server Communication

This guide explains how to debug the anomaly detection pipeline without opening browser developer tools. All debugging can be done from the terminal.

## Overview

The anomaly detection flow works as follows:
1. Frontend sends POST to `/api/anomaly-detect` → Backend returns `202 Accepted` with `jobId`
2. Frontend polls `/api/anomaly-detect/status?jobId=XXX` every 500ms
3. Backend updates `currentStep` (1-7) as pipeline progresses
4. Frontend updates stepper UI based on `currentStep` value

## Debug Tools Available

### 1. Server Logs

The server logs all API requests with detailed information:

```bash
# View recent logs
tail -50 server.log | grep "\[API"

# Monitor logs in real-time
tail -f server.log | grep "\[API"
```

**What to look for:**
- `[API /api/anomaly-detect]` - POST requests from frontend
- `[API /api/anomaly-detect/status]` - GET requests (polling)
- `currentStep` values (should progress 1→7)
- `jobId` values
- Error messages

### 2. Debug Endpoint

Check active jobs and their status:

```bash
curl http://localhost:8000/api/debug/jobs | python3 -m json.tool
```

**Response format:**
```json
{
  "totalJobs": 1,
  "jobs": [
    {
      "jobId": "job_1234567890_abc123",
      "currentStep": 3,
      "currentBatch": 0,
      "totalBatches": 1,
      "completed": false,
      "cancelled": false,
      "progress": 0,
      "total": 0,
      "error": null
    }
  ]
}
```

### 3. Debug Helper Script

Test the full flow programmatically:

```bash
cd app/browser
node debug-helper.js
```

This script will:
- Check active jobs
- Test the status endpoint
- Create a test job
- Monitor its progress

### 4. Monitoring Script

Watch requests in real-time:

```bash
cd app/browser
./monitor-requests.sh
```

Then click "Detect Anomalies" in your browser and watch the logs.

## Debugging Steps

### Step 1: Verify Backend is Running

```bash
curl http://localhost:8000/api/debug/jobs
```

Should return JSON (not HTML). If you get HTML, the server isn't running or route isn't registered.

### Step 2: Check if Frontend is Making Requests

```bash
# Monitor logs
tail -f server.log | grep "\[API"
```

Then click "Detect Anomalies" in browser. You should see:
- `[API /api/anomaly-detect] 📥 Request received` - Frontend POST request
- `[API /api/anomaly-detect] 🆔 Generated jobId: job_XXX` - Job created
- `[API /api/anomaly-detect] 📤 Sending 202 response` - Response sent

### Step 3: Check if Frontend is Polling

After the initial POST, you should see repeated GET requests:

```bash
tail -f server.log | grep "\[API.*status"
```

You should see:
- `[API /api/anomaly-detect/status] 📥 Status request for jobId: job_XXX`
- `[API /api/anomaly-detect/status] ✅ Job found`
- `[API /api/anomaly-detect/status] 📤 Sending status response`

**If you don't see polling requests:**
- Frontend didn't receive the `jobId` from the 202 response
- Frontend didn't start polling
- Check frontend logs (but we're avoiding browser dev tools, so check server-side)

### Step 4: Check currentStep Values

The backend should be updating `currentStep` as it progresses:

```bash
tail -f server.log | grep "currentStep"
```

You should see:
- `currentStep=1` - Loading data
- `currentStep=2` - Creating route features
- `currentStep=3` - Aggregating data
- `currentStep=4` - Invoking model
- `currentStep=5` - Calculating metrics
- `currentStep=6` - Enriching with IATA
- `currentStep=7` - Preparing results

**If currentStep stays at 0:**
- Pipeline didn't start
- Check for errors in logs

**If currentStep progresses but stepper doesn't update:**
- Frontend isn't receiving status updates
- Frontend isn't updating UI (ChangeDetectorRef issue)
- Check if status endpoint returns correct `currentStep` value

### Step 5: Check Status Response

Manually check what the status endpoint returns:

```bash
# First, get a jobId from creating a job
JOB_ID=$(curl -s -X POST http://localhost:8000/api/anomaly-detect \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -c "import sys, json; print(json.load(sys.stdin)['jobId'])")

# Wait a moment
sleep 2

# Check status
curl -s "http://localhost:8000/api/anomaly-detect/status?jobId=$JOB_ID" | python3 -m json.tool
```

**Expected response:**
```json
{
  "jobId": "job_1234567890_abc123",
  "progress": 7337,
  "total": 7337,
  "currentBatch": 1,
  "totalBatches": 1,
  "currentStep": 4,
  "cancelled": false,
  "completed": false,
  "error": null
}
```

**Key fields:**
- `currentStep`: Should be 1-7 (0 means not started)
- `completed`: Should be `false` while running, `true` when done
- `error`: Should be `null` unless there's an error

## Common Issues

### Issue 1: Stepper Appears But Doesn't Progress

**Symptoms:**
- Stepper shows up when button clicked
- All steps stay in "pending" state
- No visual progress

**Debug:**
1. Check if frontend is polling: `tail -f server.log | grep status`
2. Check if backend is returning `currentStep`: `tail -f server.log | grep "currentStep"`
3. Check status response manually (see Step 5 above)

**Possible causes:**
- Frontend not polling (no status requests in logs)
- Backend returning `currentStep: 0` (pipeline not starting)
- Frontend not updating UI (ChangeDetectorRef not called)

### Issue 2: No Requests in Logs

**Symptoms:**
- Clicking button does nothing
- No API requests in server logs

**Debug:**
1. Check if Angular dev server is running: `ps aux | grep "ng serve"`
2. Check if backend is running: `curl http://localhost:8000/api/debug/jobs`
3. Check browser console (if accessible) for CORS errors

**Possible causes:**
- Angular dev server not running
- Backend not running
- CORS issues
- Proxy configuration issue

### Issue 3: Job Created But No Polling

**Symptoms:**
- See POST request in logs
- See jobId generated
- No GET requests for status

**Debug:**
1. Check 202 response: Look for `📤 Sending 202 response` in logs
2. Check response body: Should include `jobId`
3. Check frontend code: `anomaly-table.component.ts` `detectAnomalies()` method

**Possible causes:**
- Frontend didn't receive 202 response
- Frontend didn't extract `jobId` from response
- Frontend didn't call `startProgressPolling()`

### Issue 4: Polling But currentStep Always 0

**Symptoms:**
- See status requests in logs
- Status always returns `currentStep: 0`
- Pipeline never progresses

**Debug:**
1. Check pipeline logs: `tail -f server.log | grep "Step"`
2. Check for errors: `tail -f server.log | grep "error\|Error\|ERROR"`
3. Check if pipeline started: Look for `🚀 Starting anomaly detection pipeline`

**Possible causes:**
- Pipeline error (check error logs)
- Date filter returning no data (pipeline completes instantly)
- SQL query failing

## Quick Debug Commands

```bash
# Check active jobs
curl http://localhost:8000/api/debug/jobs | python3 -m json.tool

# Test full flow
cd app/browser && node debug-helper.js

# Monitor requests
cd app/browser && ./monitor-requests.sh

# Check recent activity
tail -100 server.log | grep "\[API" | tail -20

# Check for errors
tail -100 server.log | grep -i error | tail -10

# Check currentStep progression
tail -100 server.log | grep "currentStep" | tail -10
```

## Log Format Reference

### POST /api/anomaly-detect
```
[API /api/anomaly-detect] 📥 Request received
[API /api/anomaly-detect] 🆔 Generated jobId: job_XXX
[API /api/anomaly-detect] ✅ Job stored in activeJobs
[API /api/anomaly-detect] 📦 Request body received
[API /api/anomaly-detect] 📤 Sending 202 response with jobId: job_XXX
[API /api/anomaly-detect] ✅ 202 response sent successfully
[API /api/anomaly-detect] 🚀 Starting anomaly detection pipeline
[API /api/anomaly-detect] [Step 1/7] 🔄 Loading data... (currentStep=1)
[API /api/anomaly-detect] [Step 2/7] 🔄 Creating route features... (currentStep=2)
...
```

### GET /api/anomaly-detect/status
```
[API /api/anomaly-detect/status] 📥 Status request for jobId: job_XXX
[API /api/anomaly-detect/status] 📊 Active jobs: 1
[API /api/anomaly-detect/status] ✅ Job found: { currentStep: 3, ... }
[API /api/anomaly-detect/status] 📤 Sending status response: { currentStep: 3, ... }
```

## Notes

- All logs are written to `server.log` when running with `node server.js > server.log 2>&1`
- Logs include emojis for easy visual scanning (📥 request, 📤 response, ✅ success, ❌ error)
- Status polling happens every 500ms
- Jobs are cleaned up after 5 minutes
- Backend runs on port 8000 (or PORT env var)
- Frontend runs on port 4200 (Angular dev server)
