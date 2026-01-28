# Amadeus Anomaly Detection - Angular App

Angular 18 application deployed to Databricks Apps.

## Prerequisites

**Stack:**
- Node.js v18+ 
- npm
- Angular 18 (standalone components)
- TypeScript 5.4+

**Local Development:**
```bash
npm install
npm start  # Runs on http://localhost:4200
npm run build  # Outputs to dist/amadeus-anomaly-app/browser/
```

## Important Notes

- **Port conflict**: App uses port 8000 (via `server.js`) to avoid conflicts with Databricks Apps port 8080
- **Config file**: `databricks_config.yaml` is gitignored - use `.example` as template
- **Build output**: Only `browser/` folder from `dist/` is deployed (contains built static files)

## Databricks CLI Setup

1. **Install CLI**: `brew install databricks/tap/databricks` (or see [docs](https://docs.databricks.com/dev-tools/cli/install-cli.html))

2. **Authentication** (IMPORTANT):
   ```bash
   # Use OAuth (required for logs access)
   databricks auth login --profile DEFAULT
   
   # If DATABRICKS_TOKEN env var exists, unset it first:
   unset DATABRICKS_TOKEN
   ```
   **Note**: PAT authentication works for most commands, but `databricks apps logs` requires OAuth.

3. **Configure credentials**:
   ```bash
   # Copy template and fill in your credentials
   cp databricks_config.yaml.example databricks_config.yaml
   # Edit databricks_config.yaml with your host and token
   ```

## Deployment to Databricks Apps

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Upload to workspace**:
   ```bash
   # Upload built files to remote workspace folder
   databricks workspace import-dir \
     dist/amadeus-anomaly-app/browser \
     /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser \
     --overwrite
   
   # Upload server files (app.yaml, server.js, package.json)
   databricks workspace import \
     /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser/app.yaml \
     --file browser/app.yaml --format AUTO --overwrite
   # Repeat for server.js and package.json
   ```

3. **Create app** (first time only):
   ```bash
   databricks apps create amadeus-anomaly-detection \
     --description "Amadeus Anomaly Detection Angular Application" \
     --compute-size MEDIUM
   ```

4. **Deploy**:
   ```bash
   databricks apps deploy amadeus-anomaly-detection \
     --source-code-path /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser \
     --mode SNAPSHOT
   ```

## Viewing Logs

**Important**: Requires OAuth authentication (not PAT).

```bash
# Ensure OAuth is set up and DATABRICKS_TOKEN env var is unset
unset DATABRICKS_TOKEN
databricks apps logs amadeus-anomaly-detection --tail-lines 100
```

**Common deployment errors**:
- `EADDRINUSE`: Port conflict (solved by using port 8000 in server.js)
- `OAuth Token not supported`: Unset `DATABRICKS_TOKEN` env var and use OAuth
- `No command to run`: Missing `app.yaml` file

## App Structure

```
app/
├── browser/          # Deployment folder (upload this)
│   ├── app.yaml      # Databricks Apps config
│   ├── server.js     # Node.js HTTP server
│   ├── package.json  # Server dependencies
│   └── *.js, *.css, *.html  # Built Angular files
├── src/              # Angular source code
└── dist/             # Build output (local only)
```
