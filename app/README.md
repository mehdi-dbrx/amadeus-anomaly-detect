# Amadeus Anomaly Detection - Angular App

This is an Angular 18 application designed to be deployed to Databricks Apps.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm start
```

The app will be available at `http://localhost:4200`

### Build

Build the application for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deployment to Databricks Apps

After building, deploy the `dist/amadeus-anomaly-app` folder to your Databricks workspace.

## Configuration

Copy `databricks_config.yaml.example` to `databricks_config.yaml` and fill in your Databricks credentials.
