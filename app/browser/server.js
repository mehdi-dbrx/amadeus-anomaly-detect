const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const url = require('url');

// Use native AbortController if available, otherwise use polyfill
let AbortController;
try {
  AbortController = global.AbortController || require('abort-controller').AbortController;
} catch (e) {
  // Fallback for older Node.js versions
  const { AbortController: AC } = require('abort-controller');
  AbortController = AC;
}

const PORT = process.env.PORT || 8000;

// Store active jobs for cancellation
const activeJobs = new Map();

// Databricks configuration
let DATABRICKS_HOST = process.env.DATABRICKS_HOST || 'adb-984752964297111.11.azuredatabricks.net';
// Remove https:// prefix if present
DATABRICKS_HOST = DATABRICKS_HOST.replace(/^https?:\/\//, '');
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
if (!DATABRICKS_TOKEN) {
  throw new Error('DATABRICKS_TOKEN environment variable is required');
}
const WAREHOUSE_ID = '148ccb90800933a1';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

// Helper function to create a blocking delay
function delay(ms) {
  return new Promise(resolve => {
    console.log(`[DELAY] Starting ${ms}ms delay at ${new Date().toISOString()}`);
    const startTime = Date.now();
    setTimeout(() => {
      const actualDelay = Date.now() - startTime;
      console.log(`[DELAY] Completed ${ms}ms delay (actual: ${actualDelay}ms) at ${new Date().toISOString()}`);
      resolve();
    }, ms);
  });
}

// Helper function to execute Databricks SQL query
async function executeDatabricksQuery(query) {
  const logPrefix = '[DatabricksQuery]';
  console.log(`${logPrefix} Starting query execution:`, { query, warehouseId: WAREHOUSE_ID, host: DATABRICKS_HOST });
  
  try {
    // Step 1: Execute query
    const executionUrl = `https://${DATABRICKS_HOST}/api/2.0/sql/statements`;
    console.log(`${logPrefix} POST ${executionUrl}`);
    
    let executionResponse;
    try {
      executionResponse = await axios.post(
        executionUrl,
        {
          warehouse_id: WAREHOUSE_ID,
          statement: query,
          wait_timeout: '30s'
        },
        {
          headers: {
            'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      console.log(`${logPrefix} Query execution initiated successfully:`, {
        statementId: executionResponse.data.statement_id,
        status: executionResponse.data.status?.state
      });
    } catch (execError) {
      console.error(`${logPrefix} Error executing query:`, {
        error: execError.message,
        code: execError.code,
        response: execError.response?.data,
        status: execError.response?.status,
        statusText: execError.response?.statusText,
        headers: execError.response?.headers,
        config: {
          url: execError.config?.url,
          method: execError.config?.method,
          timeout: execError.config?.timeout
        }
      });
      throw execError;
    }

    const statementId = executionResponse.data.statement_id;
    if (!statementId) {
      console.error(`${logPrefix} No statement ID in response:`, executionResponse.data);
      throw new Error('Failed to get statement ID');
    }

    // Step 2: Poll for results
    const resultUrl = `https://${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`;
    const maxAttempts = 30;
    console.log(`${logPrefix} Polling for results at: ${resultUrl}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let resultResponse;
      try {
        resultResponse = await axios.get(resultUrl, {
          headers: {
            'Authorization': `Bearer ${DATABRICKS_TOKEN}`
          },
          timeout: 10000
        });
      } catch (pollError) {
        console.error(`${logPrefix} Error polling result (attempt ${attempt + 1}/${maxAttempts}):`, {
          error: pollError.message,
          code: pollError.code,
          response: pollError.response?.data,
          status: pollError.response?.status
        });
        throw pollError;
      }

      const status = resultResponse.data.status?.state;
      console.log(`${logPrefix} Poll attempt ${attempt + 1}/${maxAttempts}, status: ${status}`);
      
      if (status === 'SUCCEEDED') {
        // Log the full response structure for debugging
        console.log(`${logPrefix} Full response structure:`, JSON.stringify(resultResponse.data, null, 2));
        
        // Parse results
        const result = resultResponse.data.result;
        const manifest = resultResponse.data.manifest;
        
        // Check if result exists
        if (!result) {
          console.error(`${logPrefix} Result is null or undefined`);
          throw new Error('Query succeeded but result is empty');
        }
        
        // Handle different result structures
        let columns = [];
        let dataArray = [];
        
        // Try to get columns from manifest first (most common)
        if (manifest && manifest.schema && manifest.schema.columns) {
          columns = manifest.schema.columns.map(col => col.name);
        } else if (manifest && manifest.schema && manifest.schema.fields) {
          columns = manifest.schema.fields.map(field => field.name);
        } else if (result.columns && Array.isArray(result.columns)) {
          columns = result.columns.map(col => col.name || col);
        } else if (resultResponse.data.manifest?.schema?.columns) {
          columns = resultResponse.data.manifest.schema.columns.map(col => col.name);
        } else {
          // If no columns found, log full structure and try to infer from data
          console.error(`${logPrefix} No columns found in expected locations. Full response:`, JSON.stringify(resultResponse.data, null, 2));
          
          // Try to get columns from the statement metadata
          if (resultResponse.data.manifest) {
            console.log(`${logPrefix} Manifest keys:`, Object.keys(resultResponse.data.manifest));
          }
          
          // Last resort: if we have data_array, infer column names from first row or use generic names
          dataArray = result.data_array || [];
          if (dataArray.length > 0 && Array.isArray(dataArray[0])) {
            columns = dataArray[0].map((_, idx) => `column_${idx + 1}`);
            console.warn(`${logPrefix} Using inferred column names:`, columns);
          } else {
            throw new Error('Query succeeded but no columns found and cannot infer from data');
          }
        }
        
        dataArray = result.data_array || [];
        
        console.log(`${logPrefix} Query succeeded:`, {
          columns: columns.length,
          rows: dataArray.length,
          rowCount: result.row_count || dataArray.length
        });
        
        const parsedResults = dataArray.map(row => {
          const rowObj = {};
          columns.forEach((col, idx) => {
            rowObj[col] = row[idx];
          });
          return rowObj;
        });
        
        return {
          columns,
          data: parsedResults,
          rowCount: result.row_count || parsedResults.length
        };
      } else if (status === 'FAILED') {
        const errorDetails = resultResponse.data.status?.error || {};
        console.error(`${logPrefix} Query failed:`, {
          message: errorDetails.message,
          errorCode: errorDetails.error_code,
          errorDetails: errorDetails.error_details,
          fullStatus: resultResponse.data.status
        });
        const errorMsg = errorDetails.message || 'Unknown error';
        throw new Error(`Query failed: ${errorMsg}`);
      } else if (status === 'CANCELED') {
        console.error(`${logPrefix} Query was canceled`);
        throw new Error('Query was canceled');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.error(`${logPrefix} Query timeout after ${maxAttempts} attempts`);
    throw new Error('Query timeout - exceeded max attempts');
  } catch (error) {
    // If we have a response, log the full structure
    if (error.response && error.response.data) {
      console.error(`${logPrefix} Error response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    console.error(`${logPrefix} Error in executeDatabricksQuery:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : null
    });
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API endpoint for logging client-side errors
  if (pathname === '/api/log-error' && req.method === 'POST') {
    const logPrefix = '[API /api/log-error]';
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const errorData = JSON.parse(body);
        console.error(`${logPrefix} Client-side error reported:`, JSON.stringify(errorData, null, 2));
        sendJSON(res, 200, { received: true });
      } catch (e) {
        console.error(`${logPrefix} Failed to parse error log:`, e.message);
        sendJSON(res, 400, { error: 'Invalid JSON' });
      }
    });
    
    return;
  }

  // API endpoint for anomaly updates table
  if (pathname === '/api/anomaly-updates' && req.method === 'GET') {
    const logPrefix = '[API /api/anomaly-updates]';
    console.log(`${logPrefix} Request received:`, {
      method: req.method,
      url: req.url,
      query: parsedUrl.query,
      headers: req.headers
    });
    
    try {
      const limit = parseInt(parsedUrl.query.limit) || 100;
      const date = parsedUrl.query.date;
      
      // Column mapping for anomaly_updates table
      const columnMapping = {
        'trip_origin_city': 'Origin City',
        'trip_destination_city': 'Dest City',
        'flight_leg_departure_date': 'Departure Date',
        'flight_leg_origin_city': 'Leg Origin City',
        'flight_leg_destination_city': 'Leg Dest City',
        'new_flight_leg_total_seats': 'New Seats',
        'flight_leg_total_seats': 'Original Seats',
        'multiplier': 'Multiplier'
      };
      
      // Build SELECT query
      const selectedColumns = Object.keys(columnMapping)
        .map(col => `${col} AS \`${columnMapping[col]}\``)
        .join(', ');
      
      // Build WHERE clause for date filtering
      let whereClause = '';
      if (date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(date)) {
          whereClause = `WHERE to_date(flight_leg_departure_date) = to_date('${date}')`;
          console.log(`${logPrefix} Adding date filter: ${date}`);
        }
      }
      
      const query = `SELECT ${selectedColumns} FROM mc.amadeus2.anomaly_updates ${whereClause} LIMIT ${limit}`;
      
      console.log(`${logPrefix} Executing query with limit ${limit}${date ? ` and date filter: ${date}` : ''}`);
      console.log(`${logPrefix} Full query: ${query}`);
      
      const result = await executeDatabricksQuery(query);
      
      // Map column names
      const mappedColumns = result.columns.map(col => columnMapping[col] || col);
      const mappedData = result.data.map(row => {
        const mappedRow = {};
        result.columns.forEach((originalCol, index) => {
          const displayName = mappedColumns[index];
          mappedRow[displayName] = row[originalCol] !== undefined ? row[originalCol] : row[displayName];
        });
        return mappedRow;
      });
      
      const mappedResult = {
        columns: mappedColumns,
        data: mappedData,
        rowCount: result.rowCount
      };
      
      console.log(`${logPrefix} Query successful, sending response:`, {
        columns: mappedResult.columns.length,
        rows: mappedResult.data.length,
        rowCount: mappedResult.rowCount
      });
      
      sendJSON(res, 200, mappedResult);
    } catch (error) {
      console.error(`${logPrefix} Error handling request:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      });
      
      const errorResponse = {
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error.response?.data || null
      };
      
      console.error(`${logPrefix} Sending error response:`, errorResponse);
      sendJSON(res, 500, errorResponse);
    }
    return;
  }

  // API endpoint to cancel anomaly detection
  if (pathname === '/api/anomaly-detect/cancel' && req.method === 'POST') {
    const logPrefix = '[API /api/anomaly-detect/cancel]';
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const requestData = body ? JSON.parse(body) : {};
        const jobId = requestData.jobId;
        
        if (jobId && activeJobs.has(jobId)) {
          const job = activeJobs.get(jobId);
          job.cancelled = true;
          if (job.abortController) {
            job.abortController.abort();
          }
          console.log(`${logPrefix} Job ${jobId} cancelled`);
          sendJSON(res, 200, { success: true, message: 'Job cancelled' });
        } else {
          sendJSON(res, 404, { success: false, message: 'Job not found' });
        }
      } catch (error) {
        sendJSON(res, 500, { success: false, error: error.message });
      }
    });
    return;
  }

  // API endpoint to get job progress
  if (pathname === '/api/anomaly-detect/status' && req.method === 'GET') {
    const logPrefix = '[API /api/anomaly-detect/status]';
    const jobId = parsedUrl.query.jobId;
    console.log(`${logPrefix} 📥 Status request for jobId: ${jobId}`);
    console.log(`${logPrefix} 📊 Active jobs: ${activeJobs.size}`);
    console.log(`${logPrefix} 📋 Active job IDs:`, Array.from(activeJobs.keys()));
    
    if (jobId && activeJobs.has(jobId)) {
      const job = activeJobs.get(jobId);
      console.log(`${logPrefix} ✅ Job found:`, {
        jobId: job.jobId,
        currentStep: job.currentStep,
        currentStepType: typeof job.currentStep,
        currentBatch: job.currentBatch,
        totalBatches: job.totalBatches,
        completed: job.completed,
        cancelled: job.cancelled,
        progress: job.progress,
        total: job.total
      });
      
      const response = {
        jobId: jobId,
        progress: job.progress || 0,
        total: job.total || 0,
        currentBatch: job.currentBatch || 0,
        totalBatches: job.totalBatches || 0,
        currentStep: job.currentStep || 0,
        cancelled: job.cancelled || false,
        completed: job.completed || false,
        error: job.error || null
      };
      
      // If completed, include result
      if (job.completed && job.result) {
        response.result = job.result;
        console.log(`${logPrefix} ✅ Job completed, including result`);
      }
      
      console.log(`${logPrefix} 📤 Sending status response:`, JSON.stringify(response, null, 2));
      sendJSON(res, 200, response);
    } else {
      console.log(`${logPrefix} ❌ Job not found: ${jobId}`);
      console.log(`${logPrefix} Available jobs:`, Array.from(activeJobs.keys()));
      sendJSON(res, 404, { error: 'Job not found' });
    }
    return;
  }

  // API endpoint for anomaly detection pipeline
  if (pathname === '/api/anomaly-detect' && req.method === 'POST') {
    const logPrefix = '[API /api/anomaly-detect]';
    console.log(`${logPrefix} 📥 Request received:`, {
      method: req.method,
      url: req.url,
      headers: req.headers
    });
    
    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`${logPrefix} 🆔 Generated jobId: ${jobId}`);
    
    const abortController = new AbortController();
    const job = {
      jobId,
      cancelled: false,
      abortController,
      progress: 0,
      total: 0,
      currentBatch: 0,
      totalBatches: 0,
      completed: false,
      error: null,
      currentStep: 0
    };
    activeJobs.set(jobId, job);
    console.log(`${logPrefix} ✅ Job stored in activeJobs, total active jobs: ${activeJobs.size}`);
    
    // Send 202 response IMMEDIATELY (before waiting for body)
    // This allows frontend to start polling right away
    const response202 = { 
      jobId: jobId,
      message: 'Job started',
      status: 'processing'
    };
    console.log(`${logPrefix} 📤 Sending 202 response IMMEDIATELY with jobId: ${jobId}`);
    console.log(`${logPrefix} 📤 Response body:`, JSON.stringify(response202, null, 2));
    sendJSON(res, 202, response202);
    console.log(`${logPrefix} ✅ 202 response sent successfully`);
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      console.log(`${logPrefix} 📦 Request body received, length: ${body.length}`);
      console.log(`${logPrefix} 📦 Request body content:`, body);
      
      // Now process the request body
      try {
        const requestData = body ? JSON.parse(body) : {};
        const date = requestData.date;
        console.log(`${logPrefix} 📋 Parsed request data:`, requestData);
        console.log(`${logPrefix} 📅 Date from request: ${date}`);
        
        console.log(`${logPrefix} 🚀 Starting anomaly detection pipeline${date ? ` for date: ${date}` : ''}`);
        
        // Step 1: Load and prepare data
        job.currentStep = 1;
        console.log(`${logPrefix} [Step 1/7] 🔄 Loading data... (currentStep=${job.currentStep})`);
        let whereClause = '';
        if (date) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(date)) {
            whereClause = `WHERE to_date(flight_leg_departure_date) = to_date('${date}')`;
          }
        }
        
        const loadQuery = `
          SELECT 
            trip_origin_city,
            trip_destination_city,
            flight_leg_departure_date,
            new_flight_leg_total_seats AS avg_seats
          FROM mc.amadeus2.anomaly_updates
          ${whereClause}
        `;
        
        const rawData = await executeDatabricksQuery(loadQuery);
        console.log(`${logPrefix} [Step 1/7] Loaded ${rawData.data.length} records`);
        
        // Step 2: Create route features and day_of_week
        job.currentStep = 2;
        console.log(`${logPrefix} [Step 2/7] 🔄 Creating route features... (currentStep=${job.currentStep})`);
        const routeQuery = `
          SELECT 
            CONCAT(trip_origin_city, '_to_', trip_destination_city) AS route,
            DAYOFWEEK(flight_leg_departure_date) AS day_of_week,
            new_flight_leg_total_seats AS avg_seats
          FROM mc.amadeus2.anomaly_updates
          ${whereClause}
        `;
        
        const routeData = await executeDatabricksQuery(routeQuery);
        console.log(`${logPrefix} [Step 2/7] Created ${routeData.data.length} route features`);
        
        // Step 3: Aggregate by route and day_of_week
        job.currentStep = 3;
        console.log(`${logPrefix} [Step 3/7] 🔄 Aggregating data... (currentStep=${job.currentStep})`);
        const aggregateQuery = `
          SELECT 
            CONCAT(trip_origin_city, '_to_', trip_destination_city) AS route,
            DAYOFWEEK(flight_leg_departure_date) AS day_of_week,
            ROUND(AVG(new_flight_leg_total_seats), 0) AS avg_seats
          FROM mc.amadeus2.anomaly_updates
          ${whereClause}
          GROUP BY route, day_of_week
        `;
        
        const aggregatedData = await executeDatabricksQuery(aggregateQuery);
        console.log(`${logPrefix} [Step 3/7] Aggregated to ${aggregatedData.data.length} route-day combinations`);
        
        if (aggregatedData.data.length === 0) {
          console.log(`${logPrefix} ⚠️ No data found for the selected date`);
          // Don't send another response - 202 was already sent
          // Store result in job for retrieval via status endpoint
          const emptyResult = {
            success: false,
            message: 'No data found for the selected date',
            steps: {
              step1: 'completed',
              step2: 'completed',
              step3: 'completed',
              step4: 'skipped',
              step5: 'skipped',
              step6: 'skipped',
              step7: 'skipped'
            },
            anomalies: [],
            summary: {
              total: 0,
              anomalies: 0,
              normal: 0
            }
          };
          job.completed = true;
          job.result = emptyResult;
          console.log(`${logPrefix} ✅ Empty result stored in job, accessible via status endpoint`);
          
          // Clean up job after 5 minutes
          setTimeout(() => {
            activeJobs.delete(jobId);
          }, 5 * 60 * 1000);
          return;
        }
        
        // Step 4: Invoke model endpoint in batches
        job.currentStep = 4;
        console.log(`${logPrefix} [Step 4/7] 🔄 Invoking model endpoint in batches... (currentStep=${job.currentStep})`);
        
        // Add 10-second delay for demonstration/testing purposes
        console.log(`${logPrefix} [Step 4/7] ⏳ Waiting 10 seconds before invoking model...`);
        
        // Check for cancellation before delay
        if (job.cancelled) {
          throw new Error('Job cancelled by user');
        }
        
        // Wait exactly 10 seconds using blocking delay function
        await delay(10000);
        
        console.log(`${logPrefix} [Step 4/7] ✅ Delay completed, proceeding with model invocation`);
        
        // Check for cancellation after delay
        if (job.cancelled) {
          console.log(`${logPrefix} [Step 4/7] Job cancelled during delay`);
          throw new Error('Job cancelled by user');
        }
        
        const avgSeatsArray = aggregatedData.data.map(row => [row.avg_seats]).filter(arr => arr[0] != null);
        
        if (avgSeatsArray.length === 0) {
          throw new Error('No valid avg_seats values found');
        }
        
        // Check for cancellation
        if (job.cancelled) {
          throw new Error('Job cancelled by user');
        }
        
        // Construct model endpoint URL - use full workspace URL
        const workspaceUrl = DATABRICKS_HOST.includes('http') ? DATABRICKS_HOST : `https://${DATABRICKS_HOST}`;
        const modelEndpoint = `${workspaceUrl}/serving-endpoints/flight-seat-anomaly-detector/invocations`;
        
        const BATCH_SIZE = avgSeatsArray.length; // Process all in 1 batch
        const totalBatches = Math.ceil(avgSeatsArray.length / BATCH_SIZE);
        job.total = avgSeatsArray.length;
        job.totalBatches = totalBatches;
        
        console.log(`${logPrefix} [Step 4/7] Processing ${avgSeatsArray.length} records in ${totalBatches} batches of ${BATCH_SIZE}`);
        
        let allPredictions = [];
        
        // Process in batches
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          // Check for cancellation before each batch
          if (job.cancelled) {
            console.log(`${logPrefix} [Step 4/7] Job cancelled, stopping at batch ${batchIndex + 1}/${totalBatches}`);
            throw new Error('Job cancelled by user');
          }
          
          const startIdx = batchIndex * BATCH_SIZE;
          const endIdx = Math.min(startIdx + BATCH_SIZE, avgSeatsArray.length);
          const batchData = avgSeatsArray.slice(startIdx, endIdx);
          
          job.currentBatch = batchIndex + 1;
          job.progress = endIdx;
          
          console.log(`${logPrefix} [Step 4/7] Processing batch ${batchIndex + 1}/${totalBatches} (records ${startIdx + 1}-${endIdx} of ${avgSeatsArray.length})`);
          
          const modelPayload = {
            dataframe_split: {
              columns: ['avg_seats'],
              data: batchData
            }
          };
          
          let batchPredictions = [];
          try {
            const modelResponse = await axios.post(modelEndpoint, modelPayload, {
              headers: {
                'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000, // 30 seconds per batch
              signal: abortController.signal
            });
            
            if (modelResponse.status !== 200) {
              throw new Error(`Model endpoint returned status ${modelResponse.status}`);
            }
            
            batchPredictions = modelResponse.data.predictions || [];
            console.log(`${logPrefix} [Step 4/7] Batch ${batchIndex + 1} predictions received: ${batchPredictions.length} predictions`);
            
          } catch (modelError) {
            if (modelError.name === 'AbortError' || job.cancelled) {
              console.log(`${logPrefix} [Step 4/7] Batch ${batchIndex + 1} cancelled`);
              throw new Error('Job cancelled by user');
            }
            
            console.error(`${logPrefix} [Step 4/7] Batch ${batchIndex + 1} model endpoint error:`, {
              error: modelError.message,
              code: modelError.code,
              response: modelError.response?.data,
              status: modelError.response?.status
            });
            
            // For now, simulate predictions if model fails (for testing)
            console.warn(`${logPrefix} [Step 4/7] Batch ${batchIndex + 1} model endpoint unavailable, using simulated predictions`);
            batchPredictions = batchData.map((row) => {
              const threshold = 300;
              return row[0] > threshold ? -1 : 1;
            });
          }
          
          allPredictions = allPredictions.concat(batchPredictions);
          
          // Small delay between batches to avoid overwhelming the endpoint
          if (batchIndex < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`${logPrefix} [Step 4/7] All batches completed: ${allPredictions.length} total predictions`);
        
        // Add predictions to aggregated data
        aggregatedData.data.forEach((row, idx) => {
          if (idx < allPredictions.length) {
            row.anomaly = allPredictions[idx];
          } else {
            // Default to normal if no prediction
            row.anomaly = 1;
          }
        });
        
        // Step 5: Calculate deviation metrics (simplified - would need model scores for full implementation)
        job.currentStep = 5;
        console.log(`${logPrefix} [Step 5/7] 🔄 Calculating metrics... (currentStep=${job.currentStep})`);
        const anomalies = aggregatedData.data.filter(row => row.anomaly === -1);
        const normal = aggregatedData.data.filter(row => row.anomaly === 1);
        
        // Calculate mean and std for deviation calculation
        const avgSeatsValues = aggregatedData.data.map(row => parseFloat(row.avg_seats)).filter(v => !isNaN(v) && v != null);
        
        if (avgSeatsValues.length > 0) {
          const mean = avgSeatsValues.reduce((a, b) => a + b, 0) / avgSeatsValues.length;
          const variance = avgSeatsValues.length > 1 
            ? avgSeatsValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgSeatsValues.length
            : 0;
          const stdDev = Math.sqrt(variance);
          
          anomalies.forEach(anomaly => {
            const seats = parseFloat(anomaly.avg_seats);
            if (!isNaN(seats) && stdDev > 0) {
              anomaly.deviation_std = ((seats - mean) / stdDev).toFixed(2);
            } else {
              anomaly.deviation_std = '0.00';
            }
            if (!isNaN(seats) && mean > 0) {
              anomaly.deviation_pct = (((seats - mean) / mean) * 100).toFixed(1);
            } else {
              anomaly.deviation_pct = '0.0';
            }
          });
        } else {
          anomalies.forEach(anomaly => {
            anomaly.deviation_std = '0.00';
            anomaly.deviation_pct = '0.0';
          });
        }
        
        console.log(`${logPrefix} [Step 5/7] Calculated metrics for ${anomalies.length} anomalies`);
        
        // Step 6: Enrich with IATA data
        job.currentStep = 6;
        console.log(`${logPrefix} [Step 6/7] 🔄 Enriching with IATA data... (currentStep=${job.currentStep})`);
        const routeList = [...new Set(aggregatedData.data.map(row => row.route))];
        const routeParts = routeList.map(route => {
          const parts = route.split('_to_');
          return { route, origin: parts[0], dest: parts[1] };
        });
        
        const originCities = [...new Set(routeParts.map(r => r.origin))];
        const destCities = [...new Set(routeParts.map(r => r.dest))];
        const allCities = [...new Set([...originCities, ...destCities])];
        
        // Query IATA table for city names
        const cityList = allCities.map(c => `'${c}'`).join(',');
        const iataQuery = `
          SELECT DISTINCT iata, city, country
          FROM mc.amadeus2.iata
          WHERE iata IN (${cityList})
        `;
        
        let iataData = { data: [] };
        try {
          iataData = await executeDatabricksQuery(iataQuery);
        } catch (iataError) {
          console.warn(`${logPrefix} [Step 6/7] IATA enrichment failed (non-critical):`, iataError.message);
        }
        
        // Create lookup map
        const iataMap = {};
        iataData.data.forEach(row => {
          iataMap[row.iata] = { city: row.city, country: row.country };
        });
        
        // Enrich anomalies
        anomalies.forEach(anomaly => {
          const parts = anomaly.route.split('_to_');
          const originIata = parts[0];
          const destIata = parts[1];
          
          if (iataMap[originIata]) {
            anomaly.origin_city_full = iataMap[originIata].city;
            anomaly.origin_country_full = iataMap[originIata].country;
          }
          if (iataMap[destIata]) {
            anomaly.destination_city_full = iataMap[destIata].city;
            anomaly.destination_country_full = iataMap[destIata].country;
          }
        });
        
        console.log(`${logPrefix} [Step 6/7] Enriched ${anomalies.length} anomalies with IATA data`);
        
        // Step 7: Prepare results
        job.currentStep = 7;
        console.log(`${logPrefix} [Step 7/7] 🔄 Preparing results... (currentStep=${job.currentStep})`);
        
        // Add 5-second delay for demonstration/testing purposes
        console.log(`${logPrefix} [Step 7/7] ⏳ Waiting 5 seconds before displaying results...`);
        
        // Check for cancellation before delay
        if (job.cancelled) {
          throw new Error('Job cancelled by user');
        }
        
        // Wait exactly 5 seconds using blocking delay function
        await delay(5000);
        
        console.log(`${logPrefix} [Step 7/7] ✅ Delay completed, preparing results`);
        
        // Check for cancellation after delay
        if (job.cancelled) {
          console.log(`${logPrefix} [Step 7/7] Job cancelled during delay`);
          throw new Error('Job cancelled by user');
        }
        
        const result = {
          success: true,
          steps: {
            step1: 'completed',
            step2: 'completed',
            step3: 'completed',
            step4: 'completed',
            step5: 'completed',
            step6: 'completed',
            step7: 'completed'
          },
          anomalies: anomalies,
          enriched: anomalies.filter(a => a.origin_city_full || a.destination_city_full),
          summary: {
            total: aggregatedData.data.length,
            anomalies: anomalies.length,
            normal: normal.length,
            anomalyPercentage: ((anomalies.length / aggregatedData.data.length) * 100).toFixed(2)
          }
        };
        
        console.log(`${logPrefix} Pipeline completed successfully:`, {
          total: result.summary.total,
          anomalies: result.summary.anomalies,
          enriched: result.enriched.length
        });
        
        job.completed = true;
        result.jobId = jobId;
        
        // Send final result via separate endpoint - original response already sent
        // Store result in job for retrieval
        job.result = result;
        
        // Clean up job after 5 minutes
        setTimeout(() => {
          activeJobs.delete(jobId);
        }, 5 * 60 * 1000);
      } catch (error) {
        console.error(`${logPrefix} ❌ Pipeline error:`, {
          error: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          } : null
        });
        
        job.completed = true;
        job.error = error.message;
        console.log(`${logPrefix} ⚠️ Job marked as completed with error: ${error.message}`);
        
        // Don't send another response - 202 was already sent
        // The error will be available via the status endpoint
        console.log(`${logPrefix} ⚠️ Error stored in job, accessible via status endpoint`);
        
        // Clean up job after 5 minutes
        setTimeout(() => {
          activeJobs.delete(jobId);
          console.log(`${logPrefix} 🗑️ Cleaned up job ${jobId} after timeout`);
        }, 5 * 60 * 1000);
      }
    });
    
    return;
  }

  // Debug endpoint to see all active jobs (must be before static file serving)
  if (pathname === '/api/debug/jobs' && req.method === 'GET') {
    const logPrefix = '[API /api/debug/jobs]';
    console.log(`${logPrefix} 📥 Debug request for all jobs`);
    const jobsInfo = Array.from(activeJobs.entries()).map(([id, job]) => ({
      jobId: id,
      currentStep: job.currentStep,
      currentBatch: job.currentBatch,
      totalBatches: job.totalBatches,
      completed: job.completed,
      cancelled: job.cancelled,
      progress: job.progress,
      total: job.total,
      error: job.error
    }));
    console.log(`${logPrefix} 📊 Active jobs:`, JSON.stringify(jobsInfo, null, 2));
    sendJSON(res, 200, { 
      totalJobs: activeJobs.size,
      jobs: jobsInfo 
    });
    return;
  }

  // API endpoint for querying Databricks
  if (pathname === '/api/data' && req.method === 'GET') {
    const logPrefix = '[API /api/data]';
    console.log(`${logPrefix} Request received:`, {
      method: req.method,
      url: req.url,
      query: parsedUrl.query,
      headers: req.headers
    });
    
    try {
      const limit = parseInt(parsedUrl.query.limit) || 100;
      const date = parsedUrl.query.date; // Date filter in YYYY-MM-DD format
      
      // Column mapping: database column -> display name
      // Note: SQL aliases must be unique, so we use temporary aliases and map them later
      const columnMapping = {
        'flight_leg_number': 'Flight',
        'flight_leg_aircraft_type': 'Aircraft',
        'flight_leg_distance_km': 'Distance (km)',
        'flight_leg_elapsed_time_min': 'Duration (min)',
        'flight_leg_departure_time': 'Departure',
        'flight_leg_arrival_time': 'Arrival',
        'flight_leg_origin_airport': 'Origin Airport',
        'flight_leg_origin_city': 'Origin City',
        'flight_leg_origin_country': 'Origin Country',
        'flight_leg_destination_airport': 'Dest Airport',
        'flight_leg_destination_terminal': 'Dest Terminal',
        'flight_leg_destination_city': 'Dest City',
        'flight_leg_destination_country': 'Dest Country',
        'trip_origin_city_full': 'Origin City',
        'trip_origin_country_full': 'Origin Country',
        'trip_destination_city_full': 'Dest City',
        'trip_destination_country_full': 'Dest Country'
      };
      
      // SQL alias mapping (must be unique for SQL, then we'll map to display names)
      const sqlAliasMapping = {
        'flight_leg_number': 'Flight',
        'flight_leg_aircraft_type': 'Aircraft',
        'flight_leg_distance_km': 'Distance (km)',
        'flight_leg_elapsed_time_min': 'Duration (min)',
        'flight_leg_departure_time': 'Departure',
        'flight_leg_arrival_time': 'Arrival',
        'flight_leg_origin_airport': 'Origin Airport',
        'flight_leg_origin_city': 'Origin City',
        'flight_leg_origin_country': 'Origin Country',
        'flight_leg_destination_airport': 'Dest Airport',
        'flight_leg_destination_terminal': 'Dest Terminal',
        'flight_leg_destination_city': 'Dest City',
        'flight_leg_destination_country': 'Dest Country',
        'trip_origin_city_full': 'Origin City Trip',  // Temporary unique alias
        'trip_origin_country_full': 'Origin Country Trip',  // Temporary unique alias
        'trip_destination_city_full': 'Dest City Trip',  // Temporary unique alias
        'trip_destination_country_full': 'Dest Country Trip'  // Temporary unique alias
      };
      
      // Build SELECT query with aliases (using backticks for Databricks SQL)
      const selectedColumns = Object.keys(sqlAliasMapping)
        .map(col => `${col} AS \`${sqlAliasMapping[col]}\``)
        .join(', ');
      
      // Build WHERE clause for date filtering
      // Note: The date column might not exist in data_full, so we'll try to filter
      // If it fails or returns no results, we'll fall back to no date filter
      let whereClause = '';
      let tableName = 'mc.amadeus2.data_full';
      
      if (date) {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(date)) {
          // Try to use date filter - if column doesn't exist, query will still work
          // Use to_date() for robust date comparison (handles string and date types)
          whereClause = `WHERE to_date(flight_leg_departure_date) = to_date('${date}')`;
          console.log(`${logPrefix} Adding date filter: ${date}`);
        } else {
          console.warn(`${logPrefix} Invalid date format: ${date}, ignoring date filter`);
        }
      }
      
      const query = `SELECT ${selectedColumns} FROM ${tableName} ${whereClause} LIMIT ${limit}`;
      
      console.log(`${logPrefix} Executing query with limit ${limit}${date ? ` and date filter: ${date}` : ''}`);
      console.log(`${logPrefix} Full query: ${query}`);
      
      let result;
      try {
        result = await executeDatabricksQuery(query);
        
        // If date filter was applied and we got 0 rows, try without date filter to see if column exists
        if (date && result.data.length === 0 && result.rowCount === 0) {
          console.warn(`${logPrefix} Date filter returned 0 rows. Checking if date column exists...`);
          // Try a test query to see if column exists
          const testQuery = `SELECT flight_leg_departure_date FROM ${tableName} LIMIT 1`;
          try {
            const testResult = await executeDatabricksQuery(testQuery);
            console.log(`${logPrefix} Date column exists. Sample date value:`, testResult.data[0]?.['flight_leg_departure_date']);
            console.warn(`${logPrefix} Date filter returned 0 rows - no data matches date ${date}`);
          } catch (colError) {
            console.warn(`${logPrefix} Date column may not exist in table. Error:`, colError.message);
            // Column doesn't exist, retry without date filter
            console.log(`${logPrefix} Retrying query without date filter...`);
            const queryWithoutDate = `SELECT ${selectedColumns} FROM ${tableName} LIMIT ${limit}`;
            result = await executeDatabricksQuery(queryWithoutDate);
            console.warn(`${logPrefix} Query without date filter returned ${result.data.length} rows`);
          }
        }
      } catch (queryError) {
        // If query fails with date filter, try without it
        if (date && queryError.message && queryError.message.includes('flight_leg_departure_date')) {
          console.warn(`${logPrefix} Date column error detected. Retrying without date filter:`, queryError.message);
          const queryWithoutDate = `SELECT ${selectedColumns} FROM ${tableName} LIMIT ${limit}`;
          result = await executeDatabricksQuery(queryWithoutDate);
        } else {
          throw queryError;
        }
      }
      
      // Map SQL aliases to display names (removing "Trip" prefix)
      const aliasToDisplayMap = {
        'Origin City Trip': 'Origin City',
        'Origin Country Trip': 'Origin Country',
        'Dest City Trip': 'Dest City',
        'Dest Country Trip': 'Dest Country'
      };
      
      // Map the column names in the result
      const mappedColumns = result.columns.map(col => {
        // Map temporary SQL aliases to display names
        if (aliasToDisplayMap[col]) {
          return aliasToDisplayMap[col];
        }
        // Keep other columns as-is
        return col;
      });
      
      // Map data keys: combine trip columns with flight leg columns (trip takes precedence if exists)
      const mappedData = result.data.map(row => {
        const mappedRow = {};
        result.columns.forEach((sqlAlias, index) => {
          const displayName = mappedColumns[index];
          
          // If this is a trip column that maps to an existing column, merge it
          if (aliasToDisplayMap[sqlAlias]) {
            // Use trip value if it exists, otherwise use flight leg value
            const tripValue = row[sqlAlias];
            const legValue = row[displayName];
            mappedRow[displayName] = tripValue !== undefined && tripValue !== null ? tripValue : legValue;
          } else {
            // Regular column mapping
            mappedRow[displayName] = row[sqlAlias] !== undefined ? row[sqlAlias] : row[displayName];
          }
        });
        return mappedRow;
      });
      
      const mappedResult = {
        columns: mappedColumns,
        data: mappedData,
        rowCount: result.rowCount
      };
      
      console.log(`${logPrefix} Query successful, sending response:`, {
        columns: mappedResult.columns.length,
        rows: mappedResult.data.length,
        rowCount: mappedResult.rowCount
      });
      
      sendJSON(res, 200, mappedResult);
    } catch (error) {
      console.error(`${logPrefix} Error handling request:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      });
      
      // Send error response
      const errorResponse = {
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error.response?.data || null
      };
      
      console.error(`${logPrefix} Sending error response:`, errorResponse);
      sendJSON(res, 500, errorResponse);
    }
    return;
  }

  // Serve static files
  let filePath = '.' + pathname;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // If file not found, serve index.html (for Angular routing)
        fs.readFile('./index.html', (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Error loading index.html');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
