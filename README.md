# Amadeus Anomaly Detection

A full-stack web application for detecting anomalies in flight seat capacity data. Built with Angular 18 and deployed to Databricks Apps, this application provides real-time anomaly detection using machine learning models and interactive data visualization.

## Project Overview

This project consists of:

- **Frontend Application**: Angular 18 web application with modern UI/UX for visualizing flight data and anomaly detection results
- **Backend Server**: Node.js HTTP server that interfaces with Databricks SQL Warehouse and MLflow model serving endpoints
- **Anomaly Detection Pipeline**: Multi-step ML pipeline that processes flight data, invokes ML models, calculates deviation metrics, and enriches results with geographic data
- **Model Documentation**: Jupyter notebooks and documentation for the anomaly detection model

## Purpose

The application enables users to:
- View latest flight data with filtering capabilities (date, origin/destination countries)
- Trigger anomaly detection pipeline to identify unusual seat capacity patterns
- Visualize detection results with summary statistics and detailed anomaly tables
- Monitor pipeline progress through a visual stepper component
- Deploy and run the application on Databricks Apps infrastructure

## Project Structure

```
amadeus-anomaly/
├── app/                    # Angular application
│   ├── browser/           # Backend server and deployment files
│   ├── src/               # Angular source code
│   └── doc/               # Application documentation
├── model/                 # Model notebooks and documentation
└── README.md              # This file
```

## Quick Start

For setup and deployment instructions, see **[`app/doc/SETUP.md`](app/doc/SETUP.md)**.

## Documentation

### Setup & Deployment

- **[`app/doc/SETUP.md`](app/doc/SETUP.md)** - Complete setup guide for running locally and deploying to Databricks Apps
- **[`app/doc/README.md`](app/doc/README.md)** - Detailed deployment instructions and Databricks CLI configuration
- **[`app/doc/REQUIREMENTS.md`](app/doc/REQUIREMENTS.md)** - System requirements, dependencies, and prerequisites

### Development & Design

- **[`app/doc/APP-DESIGN.md`](app/doc/APP-DESIGN.md)** - Application architecture and design decisions
- **[`app/doc/STYLE-DESIGN.md`](app/doc/STYLE-DESIGN.md)** - UI/UX design guidelines and styling best practices
- **[`app/doc/ANOMALY-FEATURE-PLAN.md`](app/doc/ANOMALY-FEATURE-PLAN.md)** - Feature implementation plan for anomaly detection functionality

### Debugging & Troubleshooting

- **[`app/browser/DEBUG.md`](app/browser/DEBUG.md)** - Guide for debugging frontend-to-server communication and pipeline execution
- **[`app/doc/LOGGING.md`](app/doc/LOGGING.md)** - Logging implementation details and error tracking
- **[`app/doc/PROBLEMS-FIXED.md`](app/doc/PROBLEMS-FIXED.md)** - Documentation of issues encountered and their solutions

### Model Documentation

- **[`model/README.md`](model/README.md)** - Model-specific documentation and notebook descriptions

## Key Features

- **Real-time Data Visualization**: Interactive tables with filtering and date range selection
- **Anomaly Detection Pipeline**: 7-step ML pipeline with progress tracking
- **Batch Processing**: Configurable batch processing for model predictions
- **Geographic Enrichment**: IATA code lookup for city and country names
- **Responsive Design**: Modern, mobile-friendly UI with elegant typography
- **Error Handling**: Comprehensive error logging and user-friendly error messages

## Technology Stack

- **Frontend**: Angular 18, TypeScript 5.4+, RxJS
- **Backend**: Node.js 18+, Express-style HTTP server
- **Data**: Databricks SQL Warehouse, Unity Catalog
- **ML**: MLflow Model Serving, Isolation Forest
- **Deployment**: Databricks Apps

## Getting Started

1. **Install dependencies**:
   ```bash
   cd app
   npm install
   cd browser
   npm install
   ```

2. **Configure Databricks credentials**:
   ```bash
   cp app/databricks_config.yaml.example app/databricks_config.yaml
   # Edit with your credentials
   ```

3. **Run locally**:
   ```bash
   # Terminal 1: Backend
   cd app/browser
   node server.js
   
   # Terminal 2: Frontend
   cd app
   npm start
   ```

4. **Access application**: Open `http://localhost:4200`

For detailed instructions, see **[`app/doc/SETUP.md`](app/doc/SETUP.md)**.

## Deployment

Deploy to Databricks Apps using the Databricks CLI:

```bash
# Build
cd app && npm run build

# Deploy
databricks apps deploy amadeus-anomaly-detection \
  --source-code-path /Workspace/Users/YOUR_EMAIL@databricks.com/_CLIENTS/AMADEUS/amadeus-anomaly-detect/app/browser \
  --mode SNAPSHOT
```

See **[`app/doc/SETUP.md`](app/doc/SETUP.md)** for complete deployment instructions.

## License

[Add your license information here]

## Contact

[Add contact information here]
