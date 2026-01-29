# Setup Guide

This guide explains how to run the Amadeus Anomaly Detection application locally and deploy it to Databricks Apps.

## Quick Reference

- **Prerequisites**: See [`app/doc/REQUIREMENTS.md`](app/doc/REQUIREMENTS.md) for detailed system requirements and dependencies
- **Deployment Details**: See [`app/doc/README.md`](app/doc/README.md) for comprehensive deployment instructions
- **Debugging**: See [`app/browser/DEBUG.md`](app/browser/DEBUG.md) for debugging frontend-to-server communication
- **Model Documentation**: See [`model/README.md`](model/README.md) for model-specific information

---

## Running Locally

### Prerequisites

Before starting, ensure you have:
- Node.js v18+ installed
- npm installed
- Databricks credentials configured

For detailed prerequisites, see [`app/doc/REQUIREMENTS.md`](app/doc/REQUIREMENTS.md).

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
cd app
npm install

# Install backend/server dependencies
cd browser
npm install
```

### Step 2: Configure Databricks Credentials

```bash
# Copy the example config file
cd app
cp databricks_config.yaml.example databricks_config.yaml

# Edit databricks_config.yaml with your Databricks host and PAT
# Note: This file is gitignored for security
```

Alternatively, you can set environment variables:
```bash
export DATABRICKS_HOST="adb-984752964297111.11.azuredatabricks.net"
export DATABRICKS_TOKEN="your-token-here"
```

### Step 3: Start the Backend Server

The backend server handles API requests and communicates with Databricks:

```bash
cd app/browser
node server.js
```

The server will start on **port 8000** (to avoid conflicts with Databricks Apps port 8080).

**For development with auto-reload:**
```bash
cd app/browser
npm run dev  # Uses nodemon for auto-reload
```

### Step 4: Start the Frontend Development Server

In a separate terminal:

```bash
cd app
npm start
```

The Angular development server will start on **http://localhost:4200** and automatically proxy API requests to the backend on port 8000.

### Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:4200
```

The application should now be running locally with:
- Frontend: Angular dev server on port 4200
- Backend: Node.js server on port 8000
- Proxy: Angular dev server proxies `/api/**` requests to backend

### Troubleshooting Local Development

**Port conflicts:**
- If port 8000 is in use: Kill the process with `lsof -ti:8000 | xargs kill -9`
- If port 4200 is in use: Angular CLI will prompt to use a different port

**Backend not responding:**
- Check backend logs for errors
- Verify Databricks credentials are set correctly
- Ensure the backend server is running on port 8000

**Frontend can't connect to backend:**
- Verify proxy configuration in `app/proxy.conf.json` points to `http://localhost:8000`
- Check that backend server is running
- See [`app/browser/DEBUG.md`](app/browser/DEBUG.md) for debugging tips

---

## Deploying to Databricks Apps

For complete deployment instructions, see [`app/doc/README.md`](app/doc/README.md). Below is a summary of the key steps.

### Prerequisites

1. **Databricks CLI installed and configured**
   ```bash
   brew install databricks/tap/databricks
   ```

2. **Authentication setup** (IMPORTANT)
   ```bash
   # Use OAuth (required for logs access)
   databricks auth login --profile DEFAULT
   
   # If DATABRICKS_TOKEN env var exists, unset it first:
   unset DATABRICKS_TOKEN
   ```
   **Note**: PAT authentication works for most commands, but `databricks apps logs` requires OAuth.

### Step 1: Build the Application

```bash
cd app
npm run build
```

This creates the production build in `dist/amadeus-anomaly-app/browser/`.

### Step 2: Upload to Databricks Workspace

Upload the built files to your Databricks workspace:

```bash
# Upload built files to remote workspace folder
databricks workspace import-dir \
  dist/amadeus-anomaly-app/browser \
  /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser \
  --overwrite

# Upload server configuration files
databricks workspace import \
  /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser/app.yaml \
  --file browser/app.yaml --format AUTO --overwrite

databricks workspace import \
  /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser/server.js \
  --file browser/server.js --format AUTO --overwrite

databricks workspace import \
  /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser/package.json \
  --file browser/package.json --format AUTO --overwrite
```

**Important**: Replace `YOUR_EMAIL@databricks.com` with your actual Databricks email address.

### Step 3: Create the App (First Time Only)

```bash
databricks apps create amadeus-anomaly-detection \
  --description "Amadeus Anomaly Detection Angular Application" \
  --compute-size MEDIUM
```

### Step 4: Deploy the App

```bash
databricks apps deploy amadeus-anomaly-detection \
  --source-code-path /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser \
  --mode SNAPSHOT
```

### Step 5: View Application Logs

**Important**: Requires OAuth authentication (not PAT).

```bash
# Ensure OAuth is set up and DATABRICKS_TOKEN env var is unset
unset DATABRICKS_TOKEN
databricks apps logs amadeus-anomaly-detection --tail-lines 100
```

### Common Deployment Issues

- **`EADDRINUSE`**: Port conflict (solved by using port 8000 in server.js)
- **`OAuth Token not supported`**: Unset `DATABRICKS_TOKEN` env var and use OAuth
- **`No command to run`**: Missing `app.yaml` file - ensure it's uploaded to workspace

For more troubleshooting, see [`app/doc/README.md`](app/doc/README.md).

---

## Project Structure

```
amadeus-anomaly/
├── app/                    # Angular application
│   ├── browser/           # Backend server and deployment files
│   │   ├── server.js      # Node.js HTTP server
│   │   ├── app.yaml       # Databricks Apps configuration
│   │   ├── package.json   # Server dependencies
│   │   └── DEBUG.md        # Debugging guide
│   ├── src/               # Angular source code
│   ├── doc/               # Documentation
│   │   ├── README.md      # Main deployment guide
│   │   ├── requirements.md # Prerequisites and dependencies
│   │   └── ...            # Other documentation files
│   └── package.json       # Frontend dependencies
├── model/                 # Model documentation and notebooks
│   └── README.md          # Model-specific information
└── SETUP.md               # This file
```

---

## Additional Resources

- **Requirements**: [`app/doc/REQUIREMENTS.md`](app/doc/REQUIREMENTS.md)
- **Deployment Guide**: [`app/doc/README.md`](app/doc/README.md)
- **Debugging Guide**: [`app/browser/DEBUG.md`](app/browser/DEBUG.md)
- **Model Documentation**: [`model/README.md`](model/README.md)

---

## Quick Commands Reference

### Local Development
```bash
# Start backend
cd app/browser && node server.js

# Start frontend (in another terminal)
cd app && npm start

# Access application
open http://localhost:4200
```

### Deployment
```bash
# Build
cd app && npm run build

# Upload to workspace
databricks workspace import-dir dist/amadeus-anomaly-app/browser /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser --overwrite

# Deploy
databricks apps deploy amadeus-anomaly-detection --source-code-path /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser --mode SNAPSHOT

# View logs
databricks apps logs amadeus-anomaly-detection --tail-lines 100
```
