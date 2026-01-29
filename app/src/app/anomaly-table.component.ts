import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnomalyService } from './anomaly.service';
import { TableData } from './data.service';
import { ErrorLoggerService } from './error-logger.service';
import { PipelineStepperComponent, PipelineStep, StepState } from './pipeline-stepper.component';

@Component({
  selector: 'app-anomaly-table',
  standalone: true,
  imports: [CommonModule, FormsModule, PipelineStepperComponent],
  template: `
    <div class="anomaly-table-container">
      <div class="header">
        <h2>Latest Flight Data</h2>
        <div class="controls">
          <input 
            type="date" 
            [(ngModel)]="selectedDate"
            [min]="minDate"
            [max]="maxDate"
            (ngModelChange)="onDateChange()"
            class="date-picker-input"
          />
          <button (click)="loadData()" [disabled]="loading" class="btn-refresh">
            {{ loading ? 'Loading...' : 'Refresh' }}
          </button>
          <button 
            (click)="detectAnomalies()" 
            [disabled]="detecting || loading" 
            class="btn-detect"
            *ngIf="!detecting"
          >
            Detect Anomalies
          </button>
          <button 
            (click)="cancelDetection()" 
            [disabled]="!detecting" 
            class="btn-cancel"
            *ngIf="detecting"
          >
            Cancel
          </button>
          <div class="progress-info" *ngIf="detecting">
            <span class="batch-progress" *ngIf="batchProgress.total > 0">
              Batch {{ batchProgress.current }} of {{ batchProgress.total }}
            </span>
            <div class="progress-bar" *ngIf="batchProgress.total > 0">
              <div class="progress-fill" [style.width.%]="(batchProgress.current / batchProgress.total) * 100"></div>
            </div>
          </div>
          <span class="row-count" *ngIf="tableData">
            Showing {{ tableData.data.length }} of {{ tableData.rowCount }} rows
          </span>
        </div>
      </div>

      <app-pipeline-stepper *ngIf="showStepper" [steps]="pipelineSteps"></app-pipeline-stepper>

      <div class="error" *ngIf="error">
        <strong>Error:</strong> {{ error }}
      </div>

      <!-- Detection Results Section -->
      <div class="results-section" *ngIf="detectionResults">
        <div class="results-header">
          <h3>Detection Results</h3>
        </div>
        
        <!-- Summary Statistics -->
        <div class="results-summary" *ngIf="detectionResults.summary">
          <div class="summary-card">
            <div class="summary-label">Total Routes</div>
            <div class="summary-value">{{ detectionResults.summary.total }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Anomalies Detected</div>
            <div class="summary-value anomaly-count">{{ detectionResults.summary.normal }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Normal Routes</div>
            <div class="summary-value">{{ detectionResults.summary.anomalies }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Anomaly Percentage</div>
            <div class="summary-value anomaly-pct">{{ getAnomalyPercentage() }}%</div>
          </div>
        </div>

        <!-- Anomalies Table -->
        <div class="anomalies-table-wrapper" *ngIf="detectionResults.anomalies && detectionResults.anomalies.length > 0">
          <h4>Detected Anomalies</h4>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Origin City</th>
                  <th>Origin Country</th>
                  <th>Dest City</th>
                  <th>Dest Country</th>
                  <th>Avg Seats</th>
                  <th>Deviation (σ)</th>
                  <th>Deviation (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let anomaly of detectionResults.anomalies.slice(0, 50)">
                  <td>{{ formatRoute(anomaly.route) }}</td>
                  <td [ngStyle]="getCellStyle('Origin City')">{{ anomaly.origin_city_full || '-' }}</td>
                  <td [ngStyle]="getCellStyle('Origin Country')">{{ anomaly.origin_country_full || '-' }}</td>
                  <td [ngStyle]="getCellStyle('Dest City')">{{ anomaly.destination_city_full || '-' }}</td>
                  <td [ngStyle]="getCellStyle('Dest Country')">{{ anomaly.destination_country_full || '-' }}</td>
                  <td>{{ anomaly.avg_seats }}</td>
                  <td>{{ anomaly.deviation_std || '-' }}</td>
                  <td [ngStyle]="getDeviationPctStyle(anomaly.deviation_pct)">{{ formatDeviationPct(anomaly.deviation_pct) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading && !tableData">
        <div class="spinner"></div>
        <p>Loading latest flight data...</p>
      </div>

      <div class="table-wrapper" *ngIf="tableData && !loading">
        <table class="data-table">
          <thead>
            <tr>
              <th *ngFor="let col of tableData.columns">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of tableData.data">
              <td *ngFor="let col of tableData.columns" [ngStyle]="getCellStyle(col)">
                {{ formatValue(row[col], col) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="no-data" *ngIf="tableData.data.length === 0">
          No flight data available for {{ selectedDate }}. Try selecting a different date.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .anomaly-table-container {
      width: 100%;
      padding: 0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-base);
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      padding: var(--spacing-base);
    }

    .header h2 {
      margin: 0;
      color: var(--color-text-primary);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: var(--spacing-base);
    }

    .date-picker-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-background-tertiary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-family: var(--font-family-sans);
      transition: border-color var(--transition-base);
      height: 2rem;
    }

    .date-picker-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }

    .btn-refresh {
      padding: 0.5rem 1rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-normal);
      transition: background var(--transition-base);
      height: 2rem;
    }

    .btn-refresh:hover:not(:disabled) {
      background: var(--color-primary-dark);
    }

    .btn-refresh:focus {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-offset) var(--focus-ring-width) var(--focus-ring-color);
    }

    .btn-refresh:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-detect {
      padding: 0.5rem 1rem;
      background: var(--color-success);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      transition: background var(--transition-base);
      height: 2rem;
    }

    .btn-detect:hover:not(:disabled) {
      background: #059669;
    }

    .btn-detect:focus {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-offset) var(--focus-ring-width) var(--focus-ring-color);
    }

    .btn-detect:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-cancel {
      padding: 0.5rem 1rem;
      background: var(--color-error);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      transition: background var(--transition-base);
      height: 2rem;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-cancel:focus {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-offset) var(--focus-ring-width) var(--focus-ring-color);
    }

    .btn-cancel:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .progress-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-base);
      margin-left: var(--spacing-sm);
    }

    .batch-progress {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-normal);
      white-space: nowrap;
    }

    .progress-bar {
      width: 120px;
      height: 6px;
      background: var(--color-background-tertiary);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--color-primary);
      transition: width 0.3s ease;
    }

    .row-count {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-normal);
      margin-left: var(--spacing-sm);
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 3px solid var(--color-error);
      color: #991b1b;
      padding: var(--spacing-sm) var(--spacing-base);
      border-radius: var(--radius-sm);
      margin-bottom: var(--spacing-base);
      font-size: var(--font-size-sm);
    }

    .loading {
      text-align: center;
      padding: var(--spacing-lg);
      color: var(--color-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-sm);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-background-alt);
      border-top-color: var(--color-primary);
      border-radius: var(--radius-full);
      animation: spin var(--transition-slow) linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .table-wrapper {
      overflow-x: auto;
      overflow-y: visible;
      background: var(--color-background);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-background-tertiary);
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 100%;
      font-size: var(--font-size-sm);
      table-layout: auto;
    }

    .data-table thead {
      background: transparent;
      position: sticky;
      top: 0;
    }

    .data-table th {
      height: 3rem;
      padding: 0 1rem;
      text-align: left;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-background-tertiary);
      white-space: nowrap;
      font-size: var(--font-size-xs);
      vertical-align: middle;
    }

    .data-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--color-background-tertiary);
      color: var(--color-text-primary);
      font-weight: 300;
      font-size: var(--font-size-xs);
      vertical-align: middle;
    }

    .data-table tbody tr {
      transition: background-color 150ms;
    }

    .data-table tbody tr:hover {
      background: var(--color-muted-light);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .no-data {
      padding: var(--spacing-xl);
      text-align: center;
      color: var(--color-text-muted);
    }

    .results-section {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: var(--color-background);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-background-tertiary);
    }

    .results-header {
      margin-bottom: var(--spacing-base);
      width: 130%;
    }

    .results-header h3 {
      margin: 0;
      color: var(--color-text-primary);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
    }

    .results-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--spacing-base);
      margin-bottom: var(--spacing-lg);
    }

    .summary-card {
      padding: var(--spacing-base);
      background: var(--color-background-alt);
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-background-tertiary);
      text-align: center;
    }

    .summary-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin-bottom: var(--spacing-xs);
      font-weight: var(--font-weight-normal);
    }

    .summary-value {
      font-size: var(--font-size-xl);
      color: var(--color-text-primary);
      font-weight: var(--font-weight-semibold);
    }

    .summary-value.anomaly-count {
      color: var(--color-error);
    }

    .summary-value.anomaly-pct {
      color: var(--color-error);
    }

    .anomalies-table-wrapper {
      margin-top: var(--spacing-lg);
    }

    .anomalies-table-wrapper h4 {
      margin: 0 0 var(--spacing-base) 0;
      color: var(--color-text-primary);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
    }

    .anomalies-table-wrapper .table-wrapper {
      width: 130%;
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
        width: 100%;
      }

      .controls {
        width: 100%;
        flex-wrap: wrap;
      }

      .date-picker-input {
        width: 100%;
        max-width: 100%;
      }
    }
  `]
})
export class AnomalyTableComponent implements OnInit, OnDestroy {
  tableData: TableData | null = null;
  loading = false;
  error: string | null = null;
  selectedDate: string = '2026-01-29'; // Default date
  detecting = false;
  showStepper = false;
  currentJobId: string | null = null;
  progressInterval: any = null;
  batchProgress: { current: number; total: number } = { current: 0, total: 0 };
  detectionResults: any = null; // Store detection results

  // Available date range
  minDate: string = '2026-01-01';
  maxDate: string = '2026-01-31';

  // Pipeline steps
  pipelineSteps: PipelineStep[] = [
    { id: 1, label: 'Loading Data', state: 'pending' },
    { id: 2, label: 'Creating Route Features', state: 'pending' },
    { id: 3, label: 'Aggregating Data', state: 'pending' },
    { id: 4, label: 'Invoking Model', state: 'pending' },
    { id: 5, label: 'Calculating Metrics', state: 'pending' },
    { id: 6, label: 'Enriching Data', state: 'pending' },
    { id: 7, label: 'Displaying Results', state: 'pending' }
  ];

  constructor(
    private anomalyService: AnomalyService,
    private errorLogger: ErrorLoggerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  onDateChange() {
    console.log('[AnomalyTableComponent] Date changed to:', this.selectedDate);
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;
    
    console.log('[AnomalyTableComponent] Starting data load for date:', this.selectedDate);
    
    this.anomalyService.getAnomalyUpdates(100, this.selectedDate).subscribe({
      next: (data) => {
        console.log('[AnomalyTableComponent] Data loaded successfully');
        this.tableData = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorLogger.logError('AnomalyTableComponent.loadData', err);
        
        console.error('[AnomalyTableComponent] Error loading data:', err);
        this.error = err.error?.error || err.message || 'Failed to load latest flight data';
      }
    });
  }

  formatValue(value: any, column?: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    // Round Multiplier to 2 decimal places
    if (column === 'Multiplier') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue.toFixed(2);
      }
    }
    return String(value);
  }

  getCellStyle(column: string): { [key: string]: string } {
    // Date columns - red (lighter)
    if (column.includes('Departure Date') || column.includes('Arrival')) {
      return { color: '#DC3545', fontWeight: '300' };
    }
    // Origin city columns - blue
    if (column === 'Origin City' || column === 'Leg Origin City') {
      return { color: '#146ac5', fontWeight: '300' };
    }
    // Dest city columns - green
    if (column === 'Dest City' || column === 'Leg Dest City') {
      return { color: '#229a56', fontWeight: '300' };
    }
    // Default style
    return { fontWeight: '300' };
  }

  formatRoute(route: string): string {
    if (!route) return '-';
    // Replace "_to_" with "→"
    return route.replace(/_to_/g, '→');
  }

  formatDeviationPct(deviationPct: string | number | null | undefined): string {
    if (deviationPct === null || deviationPct === undefined || deviationPct === '-') {
      return '-';
    }
    const numValue = typeof deviationPct === 'string' ? parseFloat(deviationPct) : deviationPct;
    if (isNaN(numValue)) {
      return '-';
    }
    // Add + sign if positive, keep - if negative
    const sign = numValue >= 0 ? '+' : '';
    return `${sign}${numValue.toFixed(1)}%`;
  }

  getDeviationPctStyle(deviationPct: string | number | null | undefined): { [key: string]: string } {
    if (deviationPct === null || deviationPct === undefined || deviationPct === '-') {
      return { fontWeight: '300' };
    }
    const numValue = typeof deviationPct === 'string' ? parseFloat(deviationPct) : deviationPct;
    if (isNaN(numValue)) {
      return { fontWeight: '300' };
    }
    // Blue if positive, red if negative
    const color = numValue >= 0 ? '#146ac5' : '#DC3545';
    return { color: color, fontWeight: '300' };
  }

  getAnomalyPercentage(): string {
    if (!this.detectionResults || !this.detectionResults.summary || !this.detectionResults.summary.anomalyPercentage) {
      return '0.00';
    }
    const percentage = parseFloat(this.detectionResults.summary.anomalyPercentage);
    return (100 - percentage).toFixed(2);
  }

  detectAnomalies() {
    console.log('='.repeat(60));
    console.log('[AnomalyTableComponent] 🚀 DETECT ANOMALIES BUTTON CLICKED');
    console.log('='.repeat(60));
    console.log('[AnomalyTableComponent] Selected date:', this.selectedDate);
    console.log('[AnomalyTableComponent] Current state:', {
      detecting: this.detecting,
      showStepper: this.showStepper,
      currentJobId: this.currentJobId,
      pipelineSteps: this.pipelineSteps.map(s => ({ id: s.id, label: s.label, state: s.state }))
    });
    
    this.detecting = true;
    this.showStepper = true;
    this.error = null;
    this.batchProgress = { current: 0, total: 0 };
    this.detectionResults = null; // Clear previous results
    
    console.log('[AnomalyTableComponent] ✅ State updated:', {
      detecting: this.detecting,
      showStepper: this.showStepper
    });
    
    // Reset all steps to pending
    this.pipelineSteps.forEach(step => step.state = 'pending');
    console.log('[AnomalyTableComponent] ✅ All steps reset to pending:', this.pipelineSteps.map(s => s.state));
    this.cdr.detectChanges();
    
    console.log('[AnomalyTableComponent] 📞 Calling anomalyService.detectAnomalies...');
    const subscription = this.anomalyService.detectAnomalies(this.selectedDate).subscribe({
      next: (response) => {
        console.log('='.repeat(60));
        console.log('[AnomalyTableComponent] 📥 RESPONSE RECEIVED');
        console.log('='.repeat(60));
        console.log('[AnomalyTableComponent] Full response:', JSON.stringify(response, null, 2));
        console.log('[AnomalyTableComponent] Response type:', typeof response);
        console.log('[AnomalyTableComponent] Response is array?', Array.isArray(response));
        console.log('[AnomalyTableComponent] Response keys:', response ? Object.keys(response) : 'null');
        console.log('[AnomalyTableComponent] Response.jobId:', response?.jobId);
        console.log('[AnomalyTableComponent] Response.jobId type:', typeof response?.jobId);
        console.log('[AnomalyTableComponent] Response.jobId truthy?', !!response?.jobId);
        
        // Get jobId from initial response
        if (response && response.jobId) {
          console.log('[AnomalyTableComponent] ✅✅✅ GOT JOB ID:', response.jobId);
          this.currentJobId = response.jobId;
          console.log('[AnomalyTableComponent] Current jobId set to:', this.currentJobId);
          console.log('[AnomalyTableComponent] 🔄 Starting progress polling...');
          // Start polling for progress
          this.startProgressPolling();
        } else {
          console.error('='.repeat(60));
          console.error('[AnomalyTableComponent] ❌❌❌ NO JOB ID IN RESPONSE');
          console.error('='.repeat(60));
          console.error('[AnomalyTableComponent] Response object:', response);
          console.error('[AnomalyTableComponent] Response stringified:', JSON.stringify(response));
          this.error = 'Failed to get job ID';
          this.detecting = false;
          this.showStepper = false;
        }
      },
      error: (err) => {
        console.error('='.repeat(60));
        console.error('[AnomalyTableComponent] ❌❌❌ PIPELINE ERROR');
        console.error('='.repeat(60));
        console.error('[AnomalyTableComponent] Full error object:', err);
        console.error('[AnomalyTableComponent] Error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
          url: err.url,
          name: err.name,
          stack: err.stack
        });
        this.errorLogger.logError('AnomalyTableComponent.detectAnomalies', err);
        
        this.detecting = false;
        this.showStepper = false;
        this.currentJobId = null;
        this.stopProgressPolling();
        this.error = err.error?.error || err.message || 'Failed to start anomaly detection';
      }
    });
    
    console.log('[AnomalyTableComponent] Subscription created:', !!subscription);
  }

  cancelDetection() {
    if (this.currentJobId) {
      console.log('[AnomalyTableComponent] Cancelling detection...');
      this.anomalyService.cancelDetection(this.currentJobId).subscribe({
        next: () => {
          console.log('[AnomalyTableComponent] Detection cancelled');
          this.detecting = false;
          this.currentJobId = null;
          this.stopProgressPolling();
          this.error = 'Detection cancelled by user';
        },
        error: (err) => {
          console.error('[AnomalyTableComponent] Error cancelling:', err);
        }
      });
    }
  }

  startProgressPolling() {
    console.log('='.repeat(60));
    console.log('[AnomalyTableComponent] 🔄 STARTING PROGRESS POLLING');
    console.log('='.repeat(60));
    console.log('[AnomalyTableComponent] JobId:', this.currentJobId);
    console.log('[AnomalyTableComponent] Detecting:', this.detecting);
    console.log('[AnomalyTableComponent] ShowStepper:', this.showStepper);
    console.log('[AnomalyTableComponent] PipelineSteps state:', this.pipelineSteps.map(s => s.state));
    
    if (!this.currentJobId) {
      console.error('[AnomalyTableComponent] ❌ Cannot start polling - no jobId!');
      return;
    }
    
    if (!this.detecting) {
      console.error('[AnomalyTableComponent] ❌ Cannot start polling - not detecting!');
      return;
    }
    
    let pollCount = 0;
    // Poll every 500ms for progress updates
    this.progressInterval = setInterval(() => {
      pollCount++;
      console.log(`[AnomalyTableComponent] 🔄 Poll #${pollCount} - Checking status for jobId:`, this.currentJobId);
      console.log('[AnomalyTableComponent] Current state:', {
        currentJobId: this.currentJobId,
        detecting: this.detecting,
        showStepper: this.showStepper
      });
      
      if (this.currentJobId && this.detecting) {
        console.log('[AnomalyTableComponent] 📡 Making status request...');
        this.anomalyService.getDetectionStatus(this.currentJobId).subscribe({
          next: (status) => {
            console.log('='.repeat(60));
            console.log(`[AnomalyTableComponent] 📊 STATUS RECEIVED (Poll #${pollCount})`);
            console.log('='.repeat(60));
            console.log('[AnomalyTableComponent] Full status object:', JSON.stringify(status, null, 2));
            console.log('[AnomalyTableComponent] Status keys:', Object.keys(status));
            console.log('[AnomalyTableComponent] Status details:', {
              currentStep: status.currentStep,
              currentStepType: typeof status.currentStep,
              currentBatch: status.currentBatch,
              totalBatches: status.totalBatches,
              completed: status.completed,
              cancelled: status.cancelled,
              error: status.error,
              progress: status.progress,
              total: status.total
            });
            
            // Update batch progress
            if (status.totalBatches > 0) {
              this.batchProgress = {
                current: status.currentBatch || 0,
                total: status.totalBatches || 0
              };
              console.log('[AnomalyTableComponent] 📊 Batch progress:', this.batchProgress);
            }
            
            // Update stepper based on current step
            // Handle currentStep: 0 means not started, 1-7 means active step
            console.log('[AnomalyTableComponent] 🔍 Checking currentStep...');
            console.log('[AnomalyTableComponent] currentStep value:', status.currentStep);
            console.log('[AnomalyTableComponent] currentStep !== undefined?', status.currentStep !== undefined);
            console.log('[AnomalyTableComponent] currentStep !== null?', status.currentStep !== null);
            
            if (status.currentStep !== undefined && status.currentStep !== null) {
              const stepIndex = status.currentStep - 1; // Convert to 0-based index
              console.log('[AnomalyTableComponent] 🔄 Updating stepper to step:', status.currentStep, '(index:', stepIndex, ')');
              console.log('[AnomalyTableComponent] PipelineSteps before update:', this.pipelineSteps.map(s => ({ id: s.id, state: s.state })));
              
              // If currentStep is 0, all steps should be pending
              if (status.currentStep === 0) {
                console.log('[AnomalyTableComponent] ⚠️ currentStep is 0, keeping all steps pending');
                this.pipelineSteps.forEach(step => step.state = 'pending');
              } else {
                // Mark all previous steps as completed
                console.log('[AnomalyTableComponent] Marking steps 0 to', stepIndex - 1, 'as completed');
                for (let i = 0; i < stepIndex; i++) {
                  this.pipelineSteps[i].state = 'completed';
                  console.log(`[AnomalyTableComponent] Step ${i + 1} marked as completed`);
                }
                // Mark current step as active
                if (stepIndex >= 0 && stepIndex < this.pipelineSteps.length) {
                  this.pipelineSteps[stepIndex].state = 'active';
                  console.log('[AnomalyTableComponent] ✅✅✅ Step', stepIndex + 1, 'marked as ACTIVE');
                } else {
                  console.error('[AnomalyTableComponent] ❌ Invalid stepIndex:', stepIndex, '(pipelineSteps.length:', this.pipelineSteps.length, ')');
                }
                // Mark future steps as pending
                console.log('[AnomalyTableComponent] Marking steps', stepIndex + 1, 'to', this.pipelineSteps.length - 1, 'as pending');
                for (let i = stepIndex + 1; i < this.pipelineSteps.length; i++) {
                  this.pipelineSteps[i].state = 'pending';
                }
              }
              
              console.log('[AnomalyTableComponent] PipelineSteps after update:', this.pipelineSteps.map(s => ({ id: s.id, state: s.state })));
              // Trigger change detection to update the UI
              console.log('[AnomalyTableComponent] 🔄 Calling detectChanges()...');
              this.cdr.detectChanges();
              console.log('[AnomalyTableComponent] ✅ detectChanges() called');
            } else {
              console.log('[AnomalyTableComponent] ⚠️⚠️⚠️ No currentStep in status!');
              console.log('[AnomalyTableComponent] Status object:', status);
              console.log('[AnomalyTableComponent] Status.currentStep:', status.currentStep);
            }
            
            // Check if job is done
            if (status.completed && status.result) {
              console.log('[AnomalyTableComponent] ✅ Job completed!');
              this.stopProgressPolling();
              // Mark all steps as completed
              this.pipelineSteps.forEach(step => step.state = 'completed');
              this.detecting = false;
              this.currentJobId = null;
              
              // Store results for display
              this.detectionResults = status.result;
              console.log('[AnomalyTableComponent] Pipeline completed:', status.result);
              console.log('[AnomalyTableComponent] Results stored:', {
                total: status.result.summary?.total,
                anomalies: status.result.summary?.anomalies,
                enriched: status.result.enriched?.length
              });
              this.cdr.detectChanges();
            } else if (status.cancelled || status.error) {
              console.log('[AnomalyTableComponent] ⚠️ Job cancelled or error:', { cancelled: status.cancelled, error: status.error });
              this.stopProgressPolling();
              if (status.cancelled) {
                this.detecting = false;
                this.error = 'Detection cancelled';
              } else if (status.error) {
                this.detecting = false;
                this.error = status.error;
              }
            }
          },
          error: (err) => {
            console.error('='.repeat(60));
            console.error(`[AnomalyTableComponent] ❌❌❌ PROGRESS POLLING ERROR (Poll #${pollCount})`);
            console.error('='.repeat(60));
            console.error('[AnomalyTableComponent] Full error object:', err);
            console.error('[AnomalyTableComponent] Error details:', {
              status: err.status,
              statusText: err.statusText,
              message: err.message,
              error: err.error,
              url: err.url,
              name: err.name
            });
            console.error('[AnomalyTableComponent] JobId was:', this.currentJobId);
          }
        });
      } else {
        console.warn('='.repeat(60));
        console.warn(`[AnomalyTableComponent] ⚠️⚠️⚠️ SKIPPING POLL #${pollCount}`);
        console.warn('='.repeat(60));
        console.warn('[AnomalyTableComponent] Reason:', {
          hasJobId: !!this.currentJobId,
          currentJobId: this.currentJobId,
          isDetecting: this.detecting,
          showStepper: this.showStepper
        });
        if (!this.currentJobId) {
          console.warn('[AnomalyTableComponent] ❌ No jobId - stopping polling');
          this.stopProgressPolling();
        }
        if (!this.detecting) {
          console.warn('[AnomalyTableComponent] ❌ Not detecting - stopping polling');
          this.stopProgressPolling();
        }
      }
    }, 500);
  }

  stopProgressPolling() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  ngOnDestroy() {
    this.stopProgressPolling();
  }

}
