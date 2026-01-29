# System Architecture

This document provides an ASCII diagram of the Amadeus Anomaly Detection application architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           User Browser                                      │
│                         (http://localhost:4200)                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                │ Angular Dev Server Proxy (/api/**)
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                    Angular 18 Frontend Application                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Components:                                                        │    │
│  │  • app.component.ts (Main Layout)                                   │    │
│  │  • anomaly-table.component.ts (Data Display & Detection UI)         │    │
│  │  • pipeline-stepper.component.ts (Progress Visualization)           │    │
│  │  • sidebar-menu.component.ts (Navigation)                           │    │
│  │  • data-table.component.ts (Flight Data Table)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Services:                                                          │    │
│  │  • data.service.ts (Flight Data API)                                │    │
│  │  • anomaly.service.ts (Anomaly Detection API)                       │    │
│  │  • error-logger.service.ts (Error Tracking)                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ REST API (/api/**)
                                │ JSON over HTTP
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                    Node.js Backend Server                                   │
│                    (server.js on port 8000)                                 │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  API Endpoints:                                                    │   │
│  │  • GET  /api/anomaly-updates     → Query flight data               │   │
│  │  • POST /api/anomaly-detect      → Start detection pipeline        │   │
│  │  • GET  /api/anomaly-detect/status → Poll pipeline progress        │   │
│  │  • POST /api/anomaly-detect/cancel → Cancel detection              │   │
│  │  • POST /api/log-error           → Log client errors               │   │
│  │  • GET  /api/debug/jobs          → Debug active jobs               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Job Management:                                                    │   │
│  │  • activeJobs Map (in-memory job tracking)                          │   │
│  │  • AbortController (cancellation support)                           │   │
│  │  • Progress tracking (currentStep, batches, etc.)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────┬───────────────────────────────┬─────────────────────────────┘
                │                               │
                │                               │
    ┌───────────▼──────────┐      ┌────────────▼────────────┐
    │  Databricks SQL API  │      │  MLflow Model Serving   │
    │                      │      │                        │
    │  • SQL Warehouse     │      │  • Model Endpoint:      │
    │  • Unity Catalog     │      │    flight-seat-        │
    │  • Tables:           │      │    anomaly-detector     │
    │    - data_full       │      │  • Invocations API      │
    │    - anomaly_updates │      │  • Predictions          │
    │    - iata            │      │                        │
    └──────────────────────┘      └────────────────────────┘
```

## Anomaly Detection Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Frontend: User Clicks                               │
│                    "Detect Anomalies" Button                                │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ POST /api/anomaly-detect
                                │ { date: "2026-01-29" }
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                    Backend: Create Job & Return 202                         │
│                    { jobId: "job_123...", status: "processing" }            │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ Frontend starts polling every 500ms
                                │ GET /api/anomaly-detect/status?jobId=...
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                    Backend: Anomaly Detection Pipeline                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 1: Loading Data                                                 │  │
│  │   └─→ Query mc.amadeus2.data_full                                   │  │
│  │       └─→ Aggregate by route + day_of_week                          │  │
│  │           └─→ Calculate avg_seats                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 2: Creating Route Features                                     │  │
│  │   └─→ Format route as "ORIGIN_to_DESTINATION"                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 3: Aggregating Data                                            │  │
│  │   └─→ Group by route and day_of_week                                │  │
│  │       └─→ Calculate statistics (mean, std dev)                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 4: Invoking Model (10s delay)                                 │  │
│  │   └─→ POST /serving-endpoints/flight-seat-anomaly-detector/        │  │
│  │       invocations                                                   │  │
│  │       └─→ Payload: { dataframe_split: { data: [[avg_seats]] } }    │  │
│  │           └─→ Response: { predictions: [-1, 1, -1, ...] }          │  │
│  │               (-1 = anomaly, 1 = normal)                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 5: Calculating Metrics                                         │  │
│  │   └─→ Calculate deviation_std (standard deviations from mean)      │  │
│  │   └─→ Calculate deviation_pct (percentage deviation)               │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 6: Enriching Data                                              │  │
│  │   └─→ Query mc.amadeus2.iata table                                  │  │
│  │       └─→ Join on origin_city → origin_city_full,                  │  │
│  │           origin_country_full                                       │  │
│  │       └─→ Join on destination_city → destination_city_full,        │  │
│  │           destination_country_full                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Step 7: Displaying Results (5s delay)                               │  │
│  │   └─→ Format results with summary statistics                        │  │
│  │       └─→ Store in job.result                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ Polling receives: { completed: true, result: {...} }
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                    Frontend: Display Results                                │
│  ┌────────────────────────────────────────────────────────────────────  ─┐  │
│  │ Summary Cards:                                                        │  │
│  │ • Total Routes                                                        │  │
│  │ • Anomalies Detected                                                  │  │
│  │ • Normal Routes                                                       │  │
│  │ • Anomaly Percentage                                                  │  │
│  └────────────────────────────────────────────────────────────────────  ─┘  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Anomalies Table:                                                    │    │
│  │ • Route (formatted as ORIGIN→DESTINATION)                           │    │
│  │ • Origin/Destination Cities & Countries                             │    │
│  │ • Avg Seats                                                         │    │
│  │ • Deviation (σ)                                                     │    │
│  │ • Deviation (%) (colored: blue=+, red=-)                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Angular Components                            │
│                                                                        │
│  ┌──────────────────┐         ┌──────────────────┐                     │
│  │  app.component   │────────▶│ sidebar-menu     │                     │
│  │  (Main Layout)   │         │  (Navigation)    │                     │
│  └────────┬─────────┘         └──────────────────┘                     │
│           │                                                            │
│           │                                                            │
│  ┌────────▼────────────────────────────────────────────────────────┐   │
│  │              anomaly-table.component                            │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │ • Displays Latest Flight Data table                        │ │   │
│  │  │ • "Detect Anomalies" button                                │ │   │
│  │  │ • Pipeline stepper visualization                           │ │   │
│  │  │ • Results summary cards & table                            │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │           │                    │                    │           │   │
│  │           │                    │                                │   │
│  │  ┌────────▼────────┐  ┌─────────▼─────────┐  ┌──────▼──────┐    │   │
│  │  │ data.service   │  │ anomaly.service   │  │ pipeline-  │      │   │
│  │  │                │  │                   │  │ stepper    │      │   │
│  │  │ • getData()    │  │ • detectAnomalies()│  │            │     │   │
│  │  │ • getUpdates() │  │ • getStatus()     │  │ • Visual   │      │   │
│  │  └────────────────┘  │ • cancel()        │  │   progress │      │   │
│  │                      └───────────────────┘  │   display  │      │   │
│  │                                               └────────────┘    │   │
│  └──────────────────────────────────────────────────────────────-──┘   │
│                                                                        │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                │ HTTP Requests
                                │
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                        Backend Server (server.js)                          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Request Handlers:                                                  │  │
│  │  • /api/anomaly-updates → executeDatabricksQuery()                  │  │
│  │  • /api/anomaly-detect → Create job, start pipeline                 │  │
│  │  • /api/anomaly-detect/status → Return job status                   │  │
│  │  • /api/anomaly-detect/cancel → Cancel job                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Pipeline Functions:                                                │  │
│  │  • Step 1: Load & aggregate data from SQL Warehouse                 │  │
│  │  • Step 2: Create route features                                    │  │
│  │  • Step 3: Aggregate statistics                                     │  │
│  │  • Step 4: Invoke MLflow model endpoint                             │  │
│  │  • Step 5: Calculate deviation metrics                              │  │
│  │  • Step 6: Enrich with IATA data                                    │  │
│  │  • Step 7: Format and return results                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
    ┌───────────▼──────────┐      ┌────────────▼──────────┐
    │  Databricks SQL API  │      │  MLflow Serving API    │
    │                      │      │                        │
    │  POST /sql/statements│      │  POST /invocations     │
    │  GET  /sql/statements│      │                        │
    └──────────────────────┘      └────────────────────────┘
```

## Data Flow: Flight Data Query

```
User selects date filter
        │
        ▼
┌──────────────────┐
│ Frontend:        │
│ onDateChange()   │
└────────┬─────────┘
         │
         │ GET /api/anomaly-updates?limit=100&date=2026-01-29
         ▼
┌──────────────────┐
│ Backend:         │
│ Parse query       │
│ Build SQL query   │
└────────┬─────────┘
         │
         │ POST /api/2.0/sql/statements
         │ { warehouse_id, statement, wait_timeout }
         ▼
┌──────────────────┐
│ Databricks SQL   │
│ Warehouse        │
│ Execute query    │
└────────┬─────────┘
         │
         │ { statement_id, status: "PENDING" }
         │
         │ GET /api/2.0/sql/statements/{statement_id}
         │ (Poll until status = "SUCCEEDED")
         │
         │ { status: "SUCCEEDED", result: { data_array: [...] } }
         ▼
┌──────────────────┐
│ Backend:         │
│ Map columns       │
│ Format data       │
└────────┬─────────┘
         │
         │ { columns: [...], data: [...], rowCount: N }
         ▼
┌──────────────────┐
│ Frontend:         │
│ Display table     │
│ Apply formatting  │
└───────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Databricks Apps Platform                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  App: amadeus-anomaly-detection                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │  Container Runtime                                            │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │  │  │
│  │  │  │  Node.js Runtime (port 8080)                             │ │  │  │
│  │  │  │  ┌────────────────────────────────────────────────────┐ │ │  │  │
│  │  │  │  │  server.js                                         │ │ │  │  │
│  │  │  │  │  • Serves static files (Angular build)             │ │ │  │  │
│  │  │  │  │  • Handles API requests                            │ │  │  │  │
│  │  │  │  │  • Connects to Databricks services                 │ │  │  │  │
│  │  │  │  └────────────────────────────────────────────────────┘ │ │  │  │
│  │  │  │  ┌────────────────────────────────────────────────────┐ │ │  │  │
│  │  │  │  │  Static Files (dist/browser/)                      │ │ │  │  │
│  │  │  │  │  • index.html                                      │ │ │  │  │
│  │  │  │  │  • *.js (Angular bundles)                          │ │ │  │  │
│  │  │  │  │  • *.css (Stylesheets)                             │ │ │  │  │
│  │  │  │  └────────────────────────────────────────────────────┘ │ │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Databricks Services (Same Workspace)                                │  │
│  │  • SQL Warehouse (ID: 148ccb90800933a1)                             │  │
│  │  • Unity Catalog Tables (mc.amadeus2.*)                              │  │
│  │  • MLflow Model Serving (flight-seat-anomaly-detector)                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                                     │
│  • Angular 18 (Standalone Components)                                       │
│  • TypeScript 5.4+                                                           │
│  • RxJS (Reactive Programming)                                              │
│  • CSS Custom Properties (Design Tokens)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend Layer                                      │
│  • Node.js 18+                                                              │
│  • Native HTTP Server (http module)                                         │
│  • axios (HTTP Client for Databricks APIs)                                  │
│  • AbortController (Request Cancellation)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                         │
│  • Databricks SQL Warehouse                                                 │
│  • Unity Catalog (mc.amadeus2.*)                                           │
│  • Databricks SQL API (REST)                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ML Layer                                           │
│  • MLflow Model Serving                                                     │
│  • Isolation Forest Model                                                   │
│  • Model Invocations API (REST)                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Deployment Layer                                   │
│  • Databricks Apps                                                          │
│  • Databricks CLI                                                           │
│  • Git (Version Control)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Port Separation**: Backend uses port 8000 locally to avoid conflicts with Databricks Apps port 8080
2. **Async Job Pattern**: Long-running pipeline uses 202 Accepted response with polling for status
3. **In-Memory Job Tracking**: Jobs stored in Map for fast lookup and cancellation support
4. **Proxy Configuration**: Angular dev server proxies `/api/**` to backend for seamless development
5. **Error Handling**: Comprehensive logging at both frontend and backend levels
6. **Batch Processing**: Model invocations can be batched for better performance
7. **Progress Tracking**: 7-step pipeline with visual stepper for user feedback
