# Requirements

This document outlines all requirements and dependencies for the Amadeus Anomaly Detection Angular application.

## System Requirements

### Runtime Environment
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Operating System**: macOS, Linux, or Windows

### Databricks Requirements
- **Databricks Workspace**: Access to Azure Databricks workspace
- **SQL Warehouse**: SQL Warehouse ID `148ccb90800933a1` (or configure your own)
- **Unity Catalog Table**: Access to `mc.amadeus2.data_full` table
- **Authentication**: Databricks Personal Access Token (PAT) or OAuth credentials

## Frontend Dependencies

### Angular Framework
- `@angular/animations`: ^18.0.0
- `@angular/common`: ^18.0.0
- `@angular/compiler`: ^18.0.0
- `@angular/core`: ^18.0.0
- `@angular/forms`: ^18.0.0 - Two-way data binding and form handling
- `@angular/platform-browser`: ^18.0.0
- `@angular/platform-browser-dynamic`: ^18.0.0
- `@angular/router`: ^18.0.0

### Core Dependencies
- `rxjs`: ^7.8.1 - Reactive Extensions for JavaScript
- `tslib`: ^2.3.0 - Runtime library for TypeScript
- `zone.js`: ^0.14.3 - Zone.js for Angular change detection

### Development Dependencies
- `@angular-devkit/build-angular`: ^18.0.0 - Angular build tools
- `@angular/cli`: ^18.0.0 - Angular CLI
- `@angular/compiler-cli`: ^18.0.0 - Angular compiler CLI
- `@types/node`: ^20.10.0 - TypeScript definitions for Node.js
- `typescript`: ~5.4.2 - TypeScript compiler

## Backend Dependencies (Browser/Server)

### Runtime Dependencies
- `axios`: ^1.6.0 - HTTP client for making API requests to Databricks

### Development Dependencies
- `nodemon`: ^3.1.11 - Auto-reload server on file changes (development only)

### Node.js Built-in Modules (No installation required)
- `http` - HTTP server
- `fs` - File system operations
- `path` - Path utilities
- `url` - URL parsing

## Environment Variables

### Required (for Databricks connection)
- `DATABRICKS_HOST`: Databricks workspace host (e.g., `adb-984752964297111.11.azuredatabricks.net`)
- `DATABRICKS_TOKEN`: Databricks Personal Access Token

### Optional
- `PORT`: Server port (defaults to 8080)
- `DATABRICKS_VERIFY_SSL`: SSL verification setting (`true` or `false`, defaults to `true`)

## Configuration Files

### Required Files
- `package.json` - Frontend dependencies and scripts
- `angular.json` - Angular project configuration
- `tsconfig.json` - TypeScript compiler configuration
- `tsconfig.app.json` - TypeScript app-specific configuration
- `app.yaml` - Databricks Apps deployment configuration
- `server.js` - Node.js HTTP server
- `databricks_config.yaml` - Databricks credentials (gitignored, use `.example` template)

### Optional Files
- `.env.local` - Local environment variables (gitignored)
- `.gitignore` - Git ignore rules

## Installation

### Frontend Dependencies
```bash
cd app
npm install
```

### Backend Dependencies (Browser/Server)
```bash
cd app/browser
npm install
```

## Build Requirements

### Development Build
- Angular CLI must be installed globally or via npm scripts
- TypeScript compiler
- Node.js runtime

### Production Build
- All development dependencies
- Build output: `dist/amadeus-anomaly-app/browser/`

## Deployment Requirements

### Databricks Apps
- Databricks CLI installed and configured
- OAuth authentication for log access (PAT works for most operations)
- Workspace folder path: `/Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser`

### Files Required for Deployment
- `browser/app.yaml` - App configuration
- `browser/server.js` - Server code
- `browser/package.json` - Server dependencies
- `browser/*.js` - Built Angular bundles
- `browser/*.css` - Stylesheets
- `browser/index.html` - Entry point

## API Requirements

### Databricks SQL API Endpoints
- `GET /api/2.0/sql/warehouses` - List SQL warehouses
- `POST /api/2.0/sql/statements` - Execute SQL queries
- `GET /api/2.0/sql/statements/{statement_id}` - Get query results

### Application API Endpoints
- `GET /api/data?limit={number}` - Query `mc.amadeus2.data_full` table with selected columns
- `POST /api/log-error` - Receive and log client-side errors

## Browser Compatibility

### Supported Browsers
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

### Required Browser Features
- ES2022 support
- Fetch API or XMLHttpRequest
- Modern JavaScript (ES modules)

## Security Requirements

### Authentication
- Valid Databricks authentication token
- Proper workspace permissions to:
  - Query Unity Catalog tables
  - Execute SQL statements
  - Access SQL warehouses

### SSL/TLS
- HTTPS for production deployments
- SSL certificate verification enabled by default
- Can be disabled for sandbox/testing environments only

## Performance Requirements

### Query Limits
- Default query limit: 100 rows
- Configurable via `limit` query parameter
- Maximum depends on Databricks warehouse configuration

### Timeouts
- Query execution timeout: 30 seconds (configurable)
- HTTP request timeout: 60 seconds
- Polling timeout: 30 attempts (30 seconds total)

## Monitoring & Logging

### Logging Requirements
- Console logging enabled for:
  - API requests/responses
  - Query execution status
  - Error details with full context
- Log access via `databricks apps logs` command (requires OAuth)

## Version Information

- **Angular**: 18.0.0
- **TypeScript**: 5.4.2
- **Node.js**: 18+ (runtime)
- **axios**: 1.6.0+

## Last Updated

- **Date**: 2026-01-29
- **Version**: 1.0
