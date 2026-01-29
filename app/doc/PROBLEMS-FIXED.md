# Problems Fixed

This document explains the problems encountered and fixed during development and deployment.

## 1. Git Clone Error

**Problem:**
```
fatal: destination path '.' already exists and is not an empty directory.
```

**Root Cause:**
- Attempted to clone repository into current directory
- Directory was not empty (contained existing files)

**Solution:**
1. Cloned repository to temporary directory (`/tmp/amadeus-temp`)
2. Moved contents (`cp -r`) and `.git` folder into current directory
3. Cleaned up temporary directory

**Result:** Successfully cloned repository without overwriting existing files

---

## 2. Databricks CLI Authentication Error

**Problem:**
```
Error: host must be set in non-interactive mode
```

**Root Cause:**
- Attempted to use `databricks configure --token` command
- Required host to be configured first

**Solution:**
1. Used `export DATABRICKS_HOST` and `export DATABRICKS_TOKEN` environment variables
2. Or updated `~/.databrickscfg` directly with host and token

**Result:** Successfully authenticated to Databricks CLI

---

## 3. Databricks CLI Command Errors

**Problem:**
```
Error: unknown command "ls"
Error: unknown flag: --limit
```

**Root Cause:**
- Used incorrect command syntax
- Used invalid flags

**Solution:**
1. Corrected to `databricks workspace list` (not `ls`)
2. Removed invalid `--limit` flag

**Result:** Successfully listed workspaces

---

## 4. Duplicate Profile in Databricks Config

**Problem:**
- Multiple `[DEFAULT]` profiles in `~/.databrickscfg`
- Confused authentication

**Solution:**
- Overwrote entire `~/.databrickscfg` file with single, correct `[DEFAULT]` profile

**Result:** Clean configuration file with correct authentication

---

## 5. Angular 18 Configuration Errors

**Problem:**
```
Schema validation failed with the following errors:
Data path "" must NOT have additional properties(buildOptimizer).
```

**Root Cause:**
- Angular 18 removed deprecated `buildOptimizer` and `vendorChunk` properties
- Old `angular.json` schema still expected them

**Solution:**
1. Removed deprecated properties from `development` configuration:
   - `buildOptimizer`
   - `vendorChunk`
2. Removed `src/favicon.ico` from assets (also deprecated)

**Result:** Valid Angular 18 configuration

---

## 6. Databricks Apps Deployment Path Error

**Problem:**
```
Error: Source code path must be a valid workspace path.
```

**Root Cause:**
- Attempted multiple paths (workspace root, DBFS)
- Databricks Apps requires valid workspace path

**Solution:**
- Used correct workspace path: `/Workspace/Users/mehdi.lamrani@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser`

**Result:** Successfully deployed to Databricks Apps

---

## 7. Databricks Apps Deployment Command Error

**Problem:**
```
Error: failed to reach SUCCEEDED, got FAILED: No command to run.
```

**Root Cause:**
- Databricks Apps needs `command` property in `app.yaml` to know how to start the app
- Default command was not appropriate

**Solution:**
- Created `app/browser/app.yaml` with `command: ['node', 'server.js']` property

**Result:** Databricks Apps knows how to start the Node.js backend server

---

## 8. Databricks Apps Authentication Error

**Problem:**
```
Error: OAuth Token not supported for current auth type pat
```

**Root Cause:**
- `DATABRICKS_TOKEN` environment variable was overriding `~/.databrickscfg` profile
- OAuth requires PAT token, not OAuth token

**Solution:**
1. Discovered `DATABRICKS_TOKEN` was set and overriding config
2. `unset DATABRICKS_TOKEN` to allow OAuth to be used

**Result:** Successfully authenticated using OAuth method

---

## 9. Port Conflict Error

**Problem:**
```
EADDRINUSE: address already in use 0.0.0.0:8080
```

**Root Cause:**
- Attempted to use `npx http-server` and `python3 -m http.server 8080`
- Port 8080 was already in use

**Solution:**
1. Created custom Node.js `server.js` listening on `PORT=8000` (or `8080` by default)
2. Updated `app.yaml` to run `node server.js`

**Result:** No port conflicts, backend server runs on port 8000

---

## 10. Databricks SQL API Response Format

**Problem:**
```
TypeError: Cannot read properties of undefined (reading 'map') at server.js:118
```

**Root Cause:**
- Databricks SQL API response format was different from expected
- Expected `result.columns` but got `manifest.schema.columns`
- Column parsing logic was not robust

**Solution:**
- Modified `server.js` to robustly check for columns in multiple locations:
  1. `manifest.schema.columns` (primary)
  2. `manifest.schema.fields` (fallback)
  3. `result.columns` (fallback)
  4. Infer from data if necessary (last resort)

**Column Parsing Logic:**
```javascript
if (manifest && manifest.schema && manifest.schema.columns) {
  columns = manifest.schema.columns.map(col => col.name);
} else if (manifest && manifest.schema && manifest.schema.fields) {
  columns = manifest.schema.fields.map(field => field.name);
} else if (result.columns && Array.isArray(result.columns)) {
  columns = result.columns.map(col => col.name || col);
} else if (resultResponse.data.manifest?.schema?.columns) {
  columns = resultResponse.data.manifest.schema.columns.map(col => col.name);
} else {
  dataArray = result.data_array || [];
  if (dataArray.length > 0 && Array.isArray(dataArray[0])) {
    columns = dataArray[0].map((_, idx) => `column_${idx + 1}`);
    console.warn(`${logPrefix} Using inferred column names:`, columns);
  } else {
    throw new Error('Query succeeded but no columns found and cannot infer from data');
  }
}
dataArray = result.data_array || [];
```

**Result:** Successfully handles all Databricks SQL API response formats

---

## 11. TypeScript Errors

**Problem:**
```
TS1117: Duplicate 'url' property in an object literal
TS2339: 'HttpErrorResponse' not having a 'stack' property
```

**Root Cause:**
- Duplicate `url` property in error logging object
- TypeScript type checking for `stack` property that doesn't exist

**Solution:**
1. Renamed duplicate `url` property to `requestUrl`/`errorUrl`
2. Removed explicit `stack` access from `HttpErrorResponse` error logging

**Result:** Clean TypeScript, no duplicate properties

---

## 12. Client-Side Error Display

**Problem:**
- User wanted errors to be logged server-side, not displayed client-side
- User wanted AI to autonomously detect errors

**Root Cause:**
- Errors were displayed in browser console only
- AI couldn't see browser console errors

**Solution:**
1. Implemented server-side `/api/log-error` endpoint
2. Updated `main.ts` with global error handlers:
   - `window.addEventListener('error')` - Catches unhandled errors
   - `window.addEventListener('unhandledrejection')` - Catches promise rejections
   - Bootstrap `.catch()` - Catches bootstrap failures
3. Created `ErrorLoggerService`:
   - Logs to browser console
   - POSTs errors to `/api/log-error` endpoint
4. Integrated `ErrorLoggerService` into:
   - `DataService` (for HTTP errors)
   - `DataTableComponent` (for component errors)
   - Global handlers (for unhandled errors)

**Result:** 
- All errors are logged server-side
- AI can check server logs to see errors
- Comprehensive error context including stack traces, request/response data
- No manual error reporting needed

---

## 13. Axios Not Found

**Problem:**
- `axios` module not found in `app/browser` directory
- Backend server couldn't start

**Solution:**
- Executed `npm install` within `app/browser` directory

**Result:** All dependencies installed, backend server runs successfully

---

## Summary

All problems were systematically identified and fixed:
1. ✅ Git operations (clone, sandbox restrictions)
2. ✅ Databricks CLI (authentication, commands, config)
3. ✅ Angular configuration (deprecated properties)
4. ✅ Databricks Apps (deployment path, command, authentication)
5. ✅ Port conflicts (custom server)
6. ✅ Databricks SQL API (response format handling)
7. ✅ TypeScript (duplicate properties, type errors)
8. ✅ Error handling (comprehensive logging system)
9. ✅ Dependencies (axios installation)

The application now works end-to-end with comprehensive error logging and reporting.

---

## Last Updated

- **Date**: 2026-01-29
- **Version**: 1.0
