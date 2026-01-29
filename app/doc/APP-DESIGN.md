# Application Design

This document describes the architecture, design decisions, and development setup for the Amadeus Anomaly Detection Angular application.

## Architecture Overview

### High-Level Architecture

```
┌─────────────────┐
│   Angular App   │  (Frontend - Port 4200)
│   (ng serve)    │
└────────┬─────────┘
         │ HTTP Proxy (/api/*)
         ▼
┌─────────────────┐
│  Node.js Server │  (Backend - Port 8000)
│   (server.js)   │
└────────┬─────────┘
         │ Databricks SQL API
         ▼
┌─────────────────┐
│  Databricks     │
│  SQL Warehouse  │
└─────────────────┘
```

### Technology Stack

**Frontend:**
- Angular 18 (Standalone Components)
- TypeScript 5.4
- CSS Custom Properties (Design Tokens)
- FormsModule for two-way data binding

**Backend:**
- Node.js HTTP Server
- Axios for HTTP requests
- Databricks SQL API integration

**Development Tools:**
- Angular CLI (`ng serve`) - Hot Module Replacement (HMR)
- Nodemon - Auto-reload backend server
- TypeScript compiler

## Project Structure

```
app/
├── browser/                 # Backend server & built files
│   ├── server.js          # Node.js HTTP server
│   ├── package.json       # Backend dependencies
│   ├── app.yaml           # Databricks Apps config
│   ├── nodemon.json       # Nodemon configuration
│   └── *.js, *.css        # Built Angular files (production)
│
├── src/                    # Angular source code
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── data-table.component.ts
│   │   ├── data.service.ts
│   │   └── error-logger.service.ts
│   ├── styles.css         # Global styles & CSS variables
│   ├── main.ts            # Bootstrap file
│   └── index.html
│
├── doc/                    # Documentation
│   ├── requirements.md
│   ├── app-design.md
│   ├── logging.md
│   ├── PROBLEMS-FIXED.md
│   └── style-design.md
│
├── angular.json            # Angular CLI config
├── package.json            # Frontend dependencies
└── proxy.conf.json         # Dev server proxy config
```

## Design Decisions

### 1. Standalone Components

**Decision:** Use Angular 18 standalone components (no NgModules)

**Rationale:**
- Modern Angular approach
- Reduced boilerplate
- Better tree-shaking
- Simpler component structure

### 2. CSS Custom Properties (Design Tokens)

**Decision:** Use CSS variables for all design values

**Rationale:**
- Centralized design system
- Easy theming support
- Consistent spacing/colors
- Future dark mode support

**Location:** `src/styles.css` - `:root` variables

### 3. Component-Based Error Logging

**Decision:** Centralized error logging service with server-side reporting

**Rationale:**
- Autonomous error detection
- Comprehensive error context
- Server-side log aggregation
- No manual error reporting needed

**Implementation:**
- `ErrorLoggerService` - Centralized logging
- `/api/log-error` endpoint - Server-side error collection
- Global error handlers in `main.ts`

### 4. Proxy Configuration

**Decision:** Use Angular CLI proxy for API requests in development

**Rationale:**
- Avoids CORS issues
- Seamless development experience
- No backend CORS configuration needed

**Configuration:** `proxy.conf.json`

### 5. Column Mapping Strategy

**Decision:** SQL aliases + client-side mapping fallback

**Rationale:**
- User-friendly column names
- Handles Databricks API response variations
- Maintains data integrity

**Implementation:** `server.js` - Column mapping object

## Hot Reload / Auto-Reload Setup

### Frontend Hot Reload (Angular)

**Status:** ✅ Already configured

**How it works:**
- Angular CLI (`ng serve`) includes Hot Module Replacement (HMR)
- Automatically reloads on file changes
- No manual refresh needed

**Usage:**
```bash
cd app
npm start  # Runs ng serve with HMR
```

**What auto-reloads:**
- Component files (`.ts`)
- Templates (inline or external)
- Styles (component or global)
- Service files

### Backend Auto-Reload (Nodemon)

**Status:** ✅ Configured

**How it works:**
- Nodemon watches `server.js` for changes
- Automatically restarts Node.js server
- No manual restart needed

**Setup:**
```bash
cd app/browser
npm install --save-dev nodemon
```

**Configuration:** `browser/nodemon.json`
```json
{
  "watch": ["server.js"],
  "ext": "js,json",
  "ignore": ["node_modules", "*.log"],
  "env": {
    "PORT": "8000"
  },
  "delay": 500
}
```

**Usage:**

**Development (with auto-reload):**
```bash
cd app/browser
npm run dev  # Uses nodemon
```

**Production (no auto-reload):**
```bash
cd app/browser
npm start  # Uses node directly
```

**What auto-reloads:**
- `server.js` changes
- Any `.js` or `.json` files in watch directory

### Running Both Servers

**Recommended:** Run in separate terminals

**Terminal 1 - Frontend:**
```bash
cd app
npm start
# Runs on http://localhost:4200
# Auto-reloads on Angular changes
```

**Terminal 2 - Backend:**
```bash
cd app/browser
npm run dev
# Runs on http://localhost:8000
# Auto-reloads on server.js changes
```

**Alternative:** Use `concurrently` (optional)

```bash
# Install concurrently
npm install --save-dev concurrently

# Add to root package.json
"scripts": {
  "dev": "concurrently \"npm start\" \"cd browser && npm run dev\""
}

# Run both
npm run dev
```

## Data Flow

### Query Execution Flow

```
1. User clicks "Refresh" button
   ↓
2. DataTableComponent calls DataService.getTableData()
   ↓
3. HTTP GET /api/data?limit=100
   ↓
4. Angular proxy forwards to http://localhost:8000/api/data
   ↓
5. Node.js server receives request
   ↓
6. Builds SQL query with column mapping
   ↓
7. Calls Databricks SQL API:
   - POST /api/2.0/sql/statements (execute)
   - GET /api/2.0/sql/statements/{id} (poll for results)
   ↓
8. Parses response and maps columns
   ↓
9. Returns JSON: { columns, data, rowCount }
   ↓
10. Angular component receives data
   ↓
11. Applies city filter (if active)
   ↓
12. Renders table with filtered data
```

### Error Handling Flow

```
1. Error occurs (frontend or backend)
   ↓
2. ErrorLoggerService.logError() called
   ↓
3. Logs to browser console
   ↓
4. POST /api/log-error with error details
   ↓
5. Server logs error to console
   ↓
6. Error visible in server logs for debugging
```

## Component Architecture

### DataTableComponent

**Purpose:** Display flight leg data in a table

**Features:**
- Data loading with loading states
- City filter with regex extraction
- Error display
- Row count display

**Key Methods:**
- `loadData()` - Fetches data from API
- `applyFilter()` - Filters data by city
- `extractCityName()` - Regex extraction from "City - Airport" format
- `formatValue()` - Formats cell values

**Dependencies:**
- `DataService` - API calls
- `ErrorLoggerService` - Error logging
- `FormsModule` - Two-way binding for filter input

### DataService

**Purpose:** Handle API communication

**Features:**
- HTTP client wrapper
- Error logging integration
- Request/response logging

**Key Methods:**
- `getTableData(limit)` - Fetch table data

### ErrorLoggerService

**Purpose:** Centralized error logging

**Features:**
- Browser console logging
- Server-side error reporting
- Comprehensive error context

**Key Methods:**
- `logError(context, error)` - Log error with context

## Styling Architecture

### CSS Variables System

**Location:** `src/styles.css`

**Categories:**
- Colors (primary, semantic, text, background)
- Typography (font sizes, weights, line heights)
- Spacing scale
- Border radius
- Shadows
- Transitions
- Focus states

### Design Principles

**Inspired by:** React app in `/Users/mehdi.lamrani/code/amadeus`

**Key Features:**
- Clean, minimal design
- Small font sizes (12px for table cells)
- Subtle hover effects
- Professional color palette
- Responsive breakpoints

## API Design

### Endpoints

**GET /api/data**
- Query: `limit` (number, default: 100)
- Returns: `{ columns: string[], data: any[], rowCount: number }`
- Columns: Pre-mapped to user-friendly names

**POST /api/log-error**
- Body: `{ timestamp, context, error: {...} }`
- Returns: `{ received: true }`
- Purpose: Collect client-side errors

### Column Mapping

**Database Columns → Display Names:**
- `flight_leg_number` → "Leg #"
- `flight_leg_aircraft_type` → "Aircraft"
- `flight_leg_origin_city` → "Origin City"
- `trip_origin_city_full` → "Trip Origin City"
- ... (18 total columns)

**Implementation:** SQL aliases + fallback mapping in `server.js`

## Filtering System

### City Filter

**Type:** Client-side filtering

**Columns Filtered:**
- Origin City
- Dest City
- Trip Origin City
- Trip Dest City

**Regex Pattern:** `^([^-]+?)(?:\s*-\s*|$)`

**Behavior:**
- Extracts city name before " - " (e.g., "Belfast - Airport" → "Belfast")
- Case-insensitive matching
- Real-time filtering as user types
- Updates row count dynamically

## Development Workflow

### Local Development

1. **Start Frontend:**
   ```bash
   cd app
   npm start
   ```

2. **Start Backend:**
   ```bash
   cd app/browser
   npm run dev
   ```

3. **Open Browser:**
   - Navigate to `http://localhost:4200`
   - Frontend proxies `/api/*` to backend

4. **Make Changes:**
   - Edit Angular files → Auto-reloads
   - Edit `server.js` → Auto-restarts

### Building for Production

```bash
cd app
npm run build
# Output: dist/amadeus-anomaly-app/browser/
```

### Deployment to Databricks Apps

1. Build Angular app
2. Copy `browser/` folder contents to Databricks workspace
3. Deploy using Databricks CLI:
   ```bash
   databricks apps deploy amadeus-anomaly-detection \
     --source /Workspace/Users/.../app/browser
   ```

## Performance Considerations

### Query Optimization

- Default limit: 100 rows
- Configurable via query parameter
- Client-side filtering for better UX

### Caching Strategy

- No caching implemented (always fresh data)
- Future: Consider caching for frequently accessed data

### Bundle Size

- Angular standalone components (better tree-shaking)
- Minimal dependencies
- Production builds optimized

## Security Considerations

### Authentication

- Databricks PAT stored in `databricks_config.yaml` (gitignored)
- Environment variables for sensitive data
- OAuth for Databricks CLI operations

### API Security

- Server-side API endpoints (no direct Databricks access from browser)
- Proxy configuration for development
- Error logging doesn't expose sensitive data

## Future Enhancements

### Potential Features

1. **Pagination**
   - Server-side pagination
   - Page size selector
   - Page navigation

2. **Sorting**
   - Column sorting
   - Multi-column sort
   - Sort indicators

3. **Advanced Filtering**
   - Multiple filter criteria
   - Date range filtering
   - Numeric range filtering

4. **Export**
   - CSV export
   - Excel export
   - PDF export

5. **Dark Mode**
   - CSS variables already support it
   - Toggle switch
   - System preference detection

6. **Real-time Updates**
   - WebSocket connection
   - Auto-refresh interval
   - Push notifications

## Troubleshooting

### Hot Reload Not Working

**Frontend:**
- Check if `ng serve` is running
- Verify file changes are saved
- Check browser console for errors

**Backend:**
- Verify nodemon is running (`npm run dev`)
- Check `nodemon.json` configuration
- Verify `server.js` is in watch list

### API Errors

- Check server logs: `tail -f /tmp/server-with-error-logging.log`
- Verify Databricks credentials
- Check network connectivity
- Review error logs in browser console

### Build Issues

- Clear `node_modules` and reinstall
- Check Node.js version (18+)
- Verify TypeScript version compatibility

## Last Updated

- **Date**: 2026-01-29
- **Version**: 1.0
