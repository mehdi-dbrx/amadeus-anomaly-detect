# Logging Implementation

This document explains the comprehensive logging system implemented to enable autonomous error detection and debugging.

## Overview

The logging system captures errors at multiple levels:
1. **Frontend (Angular)**: Browser console logs + server-side error reporting
2. **Backend (Node.js)**: Server console logs with detailed context
3. **Global Error Handlers**: Catch unhandled errors and promise rejections

## Frontend Logging

### Error Logger Service (`src/app/error-logger.service.ts`)

A centralized service for logging errors that:
- Logs to browser console with detailed error information
- Sends errors to server via POST to `/api/log-error` endpoint
- Captures: error name, message, stack trace, HTTP status, response body

**Usage:**
```typescript
this.errorLogger.logError('ComponentName.methodName', error);
```

### Data Service Logging (`src/app/data.service.ts`)

**Request Logging:**
- Logs all HTTP requests with URL and parameters
- Format: `[DataService] Requesting data from /api/data?limit=100`

**Success Logging:**
- Logs successful responses with data structure
- Format: `[DataService] Successfully received data: { columns, rowCount, dataLength }`

**Error Logging:**
- Comprehensive error details including:
  - Error type and message
  - HTTP status and status text
  - Request URL and error URL
  - Error body (response content)
  - Full error object
- Uses `ErrorLoggerService` to send errors to server
- Logs in multiple formats for easy debugging

**Error Format:**
```
=== ERROR SUMMARY ===
Service: DataService
Method: getTableData
Request URL: /api/data?limit=100
Error URL: /api/data?limit=100
Status: 500
StatusText: Internal Server Error
Message: Http failure response
Error Body: {...}
===================
```

### Component Logging (`src/app/data-table.component.ts`)

**Lifecycle Logging:**
- Logs when data loading starts
- Logs successful data loads
- Logs errors with full context

**Error Details Captured:**
- Component name and method
- Error type, message, stack trace
- HTTP status and status text
- Error body and string representation
- Timestamp

### Global Error Handlers (`src/main.ts`)

**Window Error Handler:**
- Catches all unhandled JavaScript errors
- Captures: message, filename, line number, column number, error object, stack trace
- Sends errors to `/api/log-error` endpoint

**Unhandled Promise Rejection Handler:**
- Catches unhandled promise rejections
- Captures: rejection reason, promise object
- Sends errors to `/api/log-error` endpoint

**Bootstrap Error Handler:**
- Catches Angular bootstrap failures
- Captures: error message, stack trace, error name
- Sends errors to `/api/log-error` endpoint

## Backend Logging

### API Request Logging (`browser/server.js`)

**Request Logging:**
- Logs all incoming API requests
- Format: `[API /api/data] Request received: { method, url, query, headers }`

**Query Execution Logging:**
- Logs Databricks query execution steps
- Format: `[DatabricksQuery] Starting query execution: { query, warehouseId, host }`
- Logs polling attempts: `[DatabricksQuery] Poll attempt X/30, status: SUCCEEDED`
- Logs query results: `[DatabricksQuery] Query succeeded: { columns, rows, rowCount }`

**Error Logging:**
- Comprehensive error details including:
  - Error message and stack trace
  - HTTP response status and data
  - Request configuration
  - Full error context

**Error Log Format:**
```
[DatabricksQuery] Error in executeDatabricksQuery: {
  message: "...",
  stack: "...",
  name: "Error",
  code: "...",
  response: { status, statusText, data, headers }
}
```

### Error Reporting Endpoint (`/api/log-error`)

**Purpose:**
- Receives client-side errors via POST
- Logs them server-side so they're accessible in server logs
- Enables checking browser errors without accessing browser console

**Request Format:**
```json
{
  "timestamp": "2026-01-28T23:00:00.000Z",
  "context": "DataService.getTableData",
  "error": {
    "name": "HttpErrorResponse",
    "message": "...",
    "stack": "...",
    "status": 500,
    "statusText": "Internal Server Error",
    "url": "/api/data",
    "errorBody": {...}
  }
}
```

**Server Log Format:**
```
[API /api/log-error] Client-side error reported: {
  "timestamp": "...",
  "context": "...",
  "error": {...}
}
```

## Log Locations

### Development Environment

**Angular Dev Server Logs:**
- Location: Terminal running `npm start`
- Contains: Build output, compilation errors, dev server status

**Backend Server Logs:**
- Location: `/tmp/server-with-error-logging.log` (when run in background)
- Or: Terminal running `node server.js`
- Contains: API requests, Databricks queries, errors

**Browser Console:**
- Location: Browser DevTools → Console
- Contains: All frontend logs with `[DataService]`, `[DataTableComponent]` prefixes

### Production Environment (Databricks Apps)

**App Logs:**
- Command: `databricks apps logs amadeus-anomaly-detection --tail-lines 100`
- Contains: Server logs, API requests, errors
- **Note**: Requires OAuth authentication (not PAT)

## Log Prefixes

All logs use consistent prefixes for easy filtering:

- `[DataService]` - Data service operations
- `[DataTableComponent]` - Component lifecycle and errors
- `[API /api/data]` - API endpoint requests
- `[API /api/log-error]` - Client error reports
- `[DatabricksQuery]` - Databricks SQL query operations
- `[Global Error Handler]` - Unhandled errors
- `[Bootstrap Error]` - Application bootstrap errors

## Checking Logs

### Check Server Logs for Errors

```bash
# Check for any errors
tail -100 /tmp/server-with-error-logging.log | grep -i error

# Check for client-side error reports
tail -100 /tmp/server-with-error-logging.log | grep "log-error\|Client-side error"

# Check for API errors
tail -100 /tmp/server-with-error-logging.log | grep "\[API.*Error\|ERROR"
```

### Check Databricks Apps Logs

```bash
# Ensure OAuth is set up
unset DATABRICKS_TOKEN
databricks apps logs amadeus-anomaly-detection --tail-lines 200
```

### Check Angular Dev Server Logs

```bash
# Check terminal output or log file
tail -100 /tmp/angular-dev-server.log
```

## Error Types Captured

1. **HTTP Errors**: Network failures, API errors, status codes
2. **JSON Parse Errors**: Invalid JSON responses
3. **Runtime Errors**: JavaScript exceptions
4. **Promise Rejections**: Unhandled async errors
5. **Bootstrap Errors**: Application startup failures
6. **Databricks API Errors**: Query failures, authentication errors
7. **Component Errors**: Angular component lifecycle errors

## Benefits

1. **Autonomous Error Detection**: Errors are logged server-side, enabling checking without browser access
2. **Comprehensive Context**: Full error details including stack traces, request/response data
3. **Easy Filtering**: Consistent log prefixes make it easy to find specific errors
4. **Production Ready**: Works in both development and Databricks Apps environments
5. **No Manual Reporting**: Errors are automatically captured and logged

## Example Error Flow

1. **Error Occurs**: User accesses page, API call fails
2. **Frontend Catches**: `DataService` catches HTTP error
3. **Error Logged**: 
   - Logged to browser console with `[DataService]` prefix
   - Sent to `/api/log-error` endpoint
4. **Server Logs**: Error appears in server logs with full context
5. **Autonomous Check**: Can check server logs to see error without user reporting

## Implementation Details

### Error Logger Service Injection

The `ErrorLoggerService` is:
- Provided at root level (`providedIn: 'root'`)
- Injected into `DataService` and `DataTableComponent`
- Uses Angular's `HttpClient` to POST errors to server

### Global Error Handlers

Global handlers are registered in `main.ts` before Angular bootstrap:
- `window.addEventListener('error')` - Catches unhandled errors
- `window.addEventListener('unhandledrejection')` - Catches promise rejections
- Bootstrap `.catch()` - Catches bootstrap failures

### Server Error Endpoint

The `/api/log-error` endpoint:
- Accepts POST requests with JSON error data
- Logs errors to server console with `[API /api/log-error]` prefix
- Returns 200 OK to confirm receipt
- Handles JSON parsing errors gracefully

## Troubleshooting

### Errors Not Appearing in Logs

1. **Check server is running**: `lsof -ti:8000`
2. **Check Angular dev server**: `lsof -ti:4200`
3. **Verify proxy config**: Check `proxy.conf.json` exists and is configured
4. **Check browser console**: Errors may appear there first
5. **Restart servers**: Restart both Angular and Node servers

### Logs Too Verbose

- Filter logs using grep: `grep "ERROR\|Error" logfile.log`
- Use log prefixes to filter: `grep "\[DataService\]" logfile.log`
- Adjust log levels in code if needed

## Last Updated

- **Date**: 2026-01-29
- **Version**: 1.0
