# Anomaly Detection Feature Plan

## Overview

This document outlines the plan for implementing an Anomaly Detection feature in the Angular application. The feature will display anomaly data and provide a multi-step pipeline to detect anomalies using a deployed ML model endpoint.

## Current Flow Analysis

Based on the notebook (`ssa/anomaly detection.ipynb`), the anomaly detection pipeline consists of:

### Pipeline Steps

1. **Load Anomaly Updates Data**
   - Source: `mc.amadeus2.anomaly_updates`
   - Columns: `trip_origin_city`, `trip_destination_city`, `flight_leg_departure_date`, `new_flight_leg_total_seats`

2. **Create Route Feature**
   - Combine origin and destination: `{origin}_to_{destination}`
   - Extract `day_of_week` from date (1=Sunday, 7=Saturday)

3. **Aggregate Data**
   - Group by `route` and `day_of_week`
   - Calculate average seats: `avg(new_flight_leg_total_seats)`

4. **Invoke Model Endpoint**
   - Endpoint: `flight-seat-anomaly-detector`
   - Input: `avg_seats` column
   - Output: Anomaly prediction (-1 = anomaly, 1 = normal)

5. **Calculate Deviation Metrics**
   - Load model to get anomaly scores
   - Calculate deviation multiplier (e.g., "+11x")
   - Calculate standard deviations from mean

6. **Enrich with IATA Data**
   - Join with `mc.amadeus2.iata` table
   - Add full city and country names for origin and destination

7. **Display Results**
   - Show summary statistics
   - Display top anomalies with metrics
   - Show enriched anomalies with city/country names

## Feature Requirements

### 1. Anomaly Table Display Component

**Purpose**: Display the `mc.amadeus2.anomaly_updates` table

**Requirements**:
- New Angular component: `AnomalyTableComponent`
- Query `mc.amadeus2.anomaly_updates` table via backend API
- Display columns:
  - `trip_origin_city`
  - `trip_destination_city`
  - `flight_leg_departure_date`
  - `new_flight_leg_total_seats`
  - `flight_leg_total_seats`
  - `multiplier`
- Similar styling to existing `DataTableComponent`
- Date filter support (if date column exists)
- City/country filters (if applicable)

**API Endpoint**: `GET /api/anomaly-updates?limit={number}&date={date}`

### 2. Detect Anomalies Button

**Purpose**: Trigger the anomaly detection pipeline

**Requirements**:
- Button in the Anomaly Table header
- Disabled state while pipeline is running
- Loading state indicator
- Error handling and display

**Location**: `AnomalyTableComponent` header section

### 3. Visual Stepper Component

**Purpose**: Show progress through the multi-step anomaly detection pipeline

**Requirements**:
- Custom Angular component: `PipelineStepperComponent`
- Step states:
  - **Pending**: Gray circle, step number
  - **Active**: Blue circle with spinner/loading indicator
  - **Completed**: Green circle with checkmark (✓)
- Sequential progression (one step at a time)
- Step labels:
  1. "Loading Data"
  2. "Creating Route Features"
  3. "Aggregating Data"
  4. "Invoking Model"
  5. "Calculating Metrics"
  6. "Enriching Data"
  7. "Displaying Results"

**Visual Design**:
```
[1] ──── [2] ──── [3] ──── [4] ──── [5] ──── [6] ──── [7]
 ✓       ✓       🔵       ⚪       ⚪       ⚪       ⚪
```

Where:
- ✓ = Completed (green circle with checkmark)
- 🔵 = Active (blue circle with spinner)
- ⚪ = Pending (gray circle)

### 4. Backend API Endpoints

#### 4.1 Get Anomaly Updates Table
```
GET /api/anomaly-updates?limit={number}&date={date}
```
- Query `mc.amadeus2.anomaly_updates` table
- Support date filtering if date column exists
- Return: `{ columns: string[], data: any[], rowCount: number }`

#### 4.2 Detect Anomalies Pipeline
```
POST /api/anomaly-detect
Body: { date?: string }  // Optional date filter
```
- Execute complete pipeline:
  1. Load and prepare data
  2. Create route features
  3. Aggregate data
  4. Invoke model endpoint
  5. Calculate deviation metrics
  6. Enrich with IATA data
- Return progress updates via Server-Sent Events (SSE) or polling
- Final result: `{ anomalies: any[], summary: {...}, enriched: any[] }`

**Alternative Approach**: Use WebSocket or polling for progress updates

#### 4.3 Pipeline Progress Endpoint
```
GET /api/anomaly-detect/status?jobId={id}
```
- Return current step and progress
- Used for polling progress updates

### 5. Component Architecture

#### 5.1 AnomalyTableComponent
- **Purpose**: Display anomaly updates table
- **Features**:
  - Table display with filtering
  - "Detect Anomalies" button
  - Integration with PipelineStepperComponent
  - Results display area

#### 5.2 PipelineStepperComponent
- **Purpose**: Visual progress indicator
- **Inputs**:
  - `steps: Step[]` - Array of step definitions
  - `currentStep: number` - Current active step index
- **Outputs**:
  - None (display only)

#### 5.3 AnomalyResultsComponent
- **Purpose**: Display detection results
- **Features**:
  - Summary statistics (total, anomalies count, percentage)
  - Top anomalies table
  - Enriched anomalies with city/country names
  - Deviation metrics display

### 6. Service Architecture

#### 6.1 AnomalyService
- **Methods**:
  - `getAnomalyUpdates(limit, date): Observable<TableData>`
  - `detectAnomalies(date?): Observable<AnomalyDetectionResult>`
  - `getPipelineStatus(jobId): Observable<PipelineStatus>`

#### 6.2 PipelineStatus Interface
```typescript
interface PipelineStatus {
  jobId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number; // 0-100
  error?: string;
}
```

#### 6.3 AnomalyDetectionResult Interface
```typescript
interface AnomalyDetectionResult {
  summary: {
    totalRecords: number;
    anomaliesCount: number;
    anomaliesPercentage: number;
    normalCount: number;
    normalPercentage: number;
  };
  anomalies: AnomalyRecord[];
  enriched: EnrichedAnomalyRecord[];
  baseline: {
    median: number;
    mean: number;
    stdDev: number;
  };
}

interface AnomalyRecord {
  route: string;
  day_of_week: number;
  avg_seats: number;
  deviation_multiplier: string;
  std_deviations: number;
  anomaly_score: number;
}

interface EnrichedAnomalyRecord extends AnomalyRecord {
  origin_city: string;
  origin_city_full: string;
  origin_country_full: string;
  destination_city: string;
  destination_city_full: string;
  destination_country_full: string;
}
```

## Implementation Steps

### Phase 1: Backend API Development

1. **Create `/api/anomaly-updates` endpoint**
   - Query `mc.amadeus2.anomaly_updates` table
   - Support date filtering
   - Return table data in same format as `/api/data`

2. **Create `/api/anomaly-detect` endpoint**
   - Implement pipeline steps sequentially
   - Return progress updates (via polling or SSE)
   - Handle errors gracefully
   - Log each step completion

3. **Implement Pipeline Functions**
   - `loadAndPrepareAnomalyData()` - Load and aggregate data
   - `invokeAnomalyModel()` - Call model endpoint
   - `calculateDeviationMetrics()` - Calculate metrics
   - `enrichWithIataData()` - Join with IATA table

### Phase 2: Frontend Components

1. **Create PipelineStepperComponent**
   - Step indicator circles
   - State management (pending/active/completed)
   - Animations for state transitions
   - Responsive design

2. **Create AnomalyTableComponent**
   - Display anomaly updates table
   - "Detect Anomalies" button
   - Integration with stepper
   - Results display area

3. **Create AnomalyResultsComponent**
   - Summary statistics display
   - Anomalies table
   - Enriched anomalies table
   - Deviation metrics visualization

### Phase 3: Service Integration

1. **Create AnomalyService**
   - API communication
   - Progress polling
   - Error handling
   - State management

2. **Update App Routing**
   - Add route for anomaly detection page
   - Navigation integration

### Phase 4: UI/UX Polish

1. **Stepper Styling**
   - Blue circles for active state
   - Green checkmarks for completed
   - Smooth transitions
   - Loading spinners

2. **Results Display**
   - Color-coded anomalies (red for high deviation)
   - Sortable tables
   - Export functionality (future)

## Technical Considerations

### Backend Implementation

**Model Endpoint Integration**:
- Use Databricks SDK or REST API
- Handle authentication (PAT token)
- Error handling for endpoint failures
- Timeout handling

**Data Processing**:
- Use Spark SQL via Databricks SQL API
- Handle large datasets efficiently
- Cache intermediate results if needed

**Progress Updates**:
- Option 1: Polling (simpler, less real-time)
- Option 2: Server-Sent Events (SSE) - more real-time
- Option 3: WebSocket (most complex, most real-time)

**Recommended**: Start with polling, upgrade to SSE if needed

### Frontend Implementation

**State Management**:
- Component-level state for stepper
- Service-level state for pipeline status
- Error state handling

**Performance**:
- Lazy load results component
- Virtual scrolling for large result sets
- Debounce polling requests

**Accessibility**:
- ARIA labels for stepper
- Keyboard navigation
- Screen reader support

## API Design Details

### Backend Endpoints

#### GET /api/anomaly-updates
```javascript
// Query parameters
limit: number (default: 100)
date: string (optional, YYYY-MM-DD format)

// Response
{
  columns: string[],
  data: any[],
  rowCount: number
}
```

#### POST /api/anomaly-detect
```javascript
// Request body
{
  date?: string  // Optional date filter
}

// Response (immediate)
{
  jobId: string,
  status: 'started',
  message: 'Pipeline started'
}

// Then poll GET /api/anomaly-detect/status/{jobId}
```

#### GET /api/anomaly-detect/status/{jobId}
```javascript
// Response
{
  jobId: string,
  currentStep: number,
  totalSteps: number,
  stepName: string,
  status: 'pending' | 'active' | 'completed' | 'error',
  progress: number,
  result?: AnomalyDetectionResult,
  error?: string
}
```

## Stepper Component Design

### Step States

```typescript
enum StepState {
  PENDING = 'pending',    // Gray circle, step number
  ACTIVE = 'active',      // Blue circle, spinner
  COMPLETED = 'completed', // Green circle, checkmark
  ERROR = 'error'         // Red circle, X mark
}
```

### Step Definition

```typescript
interface Step {
  id: number;
  name: string;
  description: string;
  state: StepState;
}
```

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Anomaly Detection Pipeline                                  │
│                                                              │
│  [1] ───── [2] ───── [3] ───── [4] ───── [5] ───── [6]    │
│   ✓         ✓        🔵        ⚪        ⚪        ⚪        │
│  Load     Route    Aggregate  Model   Metrics  Enrich      │
│  Data     Feature                                            │
│                                                              │
│  Current: Aggregating data...                                │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

### Backend Errors
- Model endpoint unavailable
- Databricks API errors
- Data processing errors
- Timeout errors

### Frontend Errors
- Network errors
- API errors
- Pipeline failure
- Display user-friendly error messages

## Testing Strategy

### Backend Tests
- Unit tests for each pipeline function
- Integration tests for API endpoints
- Mock Databricks API responses
- Error scenario testing

### Frontend Tests
- Component unit tests
- Service tests
- Stepper state transition tests
- Error handling tests

## Future Enhancements

1. **Real-time Updates**: WebSocket for live progress
2. **Export Results**: CSV/Excel export
3. **Historical Results**: Store and display past runs
4. **Filtering**: Filter anomalies by deviation threshold
5. **Visualizations**: Charts for anomaly distribution
6. **Notifications**: Alert when anomalies detected
7. **Scheduled Runs**: Automatic anomaly detection

## Dependencies

### Backend
- `axios` - Already installed
- `databricks-sdk` or REST API calls
- MLflow model loading (if needed)

### Frontend
- Angular components (already available)
- Custom stepper component (to be created)
- Progress indicators
- Icons (checkmark, spinner)

## File Structure

```
app/
├── src/
│   ├── app/
│   │   ├── anomaly-table.component.ts
│   │   ├── pipeline-stepper.component.ts
│   │   ├── anomaly-results.component.ts
│   │   └── anomaly.service.ts
│   └── ...
├── browser/
│   └── server.js (add anomaly endpoints)
└── doc/
    └── anomaly-feature-plan.md (this file)
```

## Timeline Estimate

- **Phase 1 (Backend)**: 2-3 days
- **Phase 2 (Frontend Components)**: 2-3 days
- **Phase 3 (Integration)**: 1-2 days
- **Phase 4 (Polish)**: 1 day

**Total**: ~6-9 days

## Success Criteria

1. ✅ Anomaly updates table displays correctly
2. ✅ "Detect Anomalies" button triggers pipeline
3. ✅ Stepper shows all 7 steps with correct states
4. ✅ Pipeline completes successfully
5. ✅ Results display with all metrics
6. ✅ Error handling works correctly
7. ✅ UI is responsive and accessible

---

**Last Updated**: 2026-01-29
**Version**: 1.0
