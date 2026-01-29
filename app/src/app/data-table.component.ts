import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, TableData } from './data.service';
import { ErrorLoggerService } from './error-logger.service';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-table-container">
      <div class="header">
        <h2>All Flight Data</h2>
        <div class="controls">
          <input 
            type="date" 
            [(ngModel)]="selectedDate"
            [min]="minDate"
            [max]="maxDate"
            (ngModelChange)="onDateChange()"
            class="date-picker-input"
          />
          <select 
            [(ngModel)]="originCountryFilter"
            (ngModelChange)="applyFilter()"
            class="country-filter-select"
          >
            <option value="all">All Origin Countries</option>
            <option *ngFor="let country of availableOriginCountries" [value]="country">
              {{ country }}
            </option>
          </select>
          <select 
            [(ngModel)]="destCountryFilter"
            (ngModelChange)="applyFilter()"
            class="country-filter-select"
          >
            <option value="all">All Dest Countries</option>
            <option *ngFor="let country of availableDestCountries" [value]="country">
              {{ country }}
            </option>
          </select>
          <input 
            type="text" 
            [(ngModel)]="cityFilter" 
            (ngModelChange)="applyFilter()"
            placeholder="Filter by city..." 
            class="city-filter-input"
          />
          <button (click)="loadData()" [disabled]="loading" class="btn-refresh">
            {{ loading ? 'Loading...' : 'Refresh' }}
          </button>
          <span class="row-count" *ngIf="tableData">
            Showing {{ filteredData.length }} of {{ tableData.rowCount }} rows
          </span>
        </div>
      </div>

      <div class="error" *ngIf="error">
        <strong>Error:</strong> {{ error }}
      </div>

      <div class="loading" *ngIf="loading && !tableData">
        <div class="spinner"></div>
        <p>Loading data...</p>
      </div>

      <div class="table-wrapper" *ngIf="tableData && !loading">
        <table class="data-table">
          <thead>
            <tr>
              <th *ngFor="let col of tableData.columns">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of filteredData">
              <td *ngFor="let col of tableData.columns" [ngStyle]="getCellStyle(col)">
                {{ formatValue(row[col], col) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="no-data" *ngIf="filteredData.length === 0">
          <div *ngIf="cityFilter || originCountryFilter !== 'all' || destCountryFilter !== 'all'">
            No data matches the selected filters
          </div>
          <div *ngIf="!cityFilter && originCountryFilter === 'all' && destCountryFilter === 'all'">
            No data available for {{ selectedDate }}. Try selecting a different date.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .data-table-container {
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

    .btn-refresh:active {
      transform: translateY(0);
    }

    .btn-refresh:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
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

    .country-filter-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-background-tertiary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-family: var(--font-family-sans);
      background: var(--color-background);
      color: var(--color-text-primary);
      cursor: pointer;
      transition: border-color var(--transition-base);
      height: 2rem;
      min-width: 150px;
    }

    .country-filter-select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }

    .city-filter-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-background-tertiary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      width: 200px;
      transition: border-color var(--transition-base);
    }

    .city-filter-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
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

    .error strong {
      font-weight: var(--font-weight-semibold);
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

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .no-data {
      padding: var(--spacing-xl);
      text-align: center;
      color: var(--color-text-muted);
    }

    /* Enhanced Mobile Responsive Design */
    @media (max-width: 1024px) {
      .table-wrapper {
        overflow-x: auto;
      }

      .data-table {
        min-width: 800px;
      }
    }

    @media (max-width: 768px) {
      .data-table-container {
        padding: var(--spacing-base);
        width: 100%;
        overflow-x: auto;
      }

      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
        width: 100%;
      }

      .header h2 {
        font-size: var(--font-size-lg);
      }

      .controls {
        width: 100%;
        flex-wrap: wrap;
      }

      .date-picker-input {
        width: 100%;
        max-width: 100%;
      }

      .country-filter-select {
        width: 100%;
        max-width: 100%;
      }

      .city-filter-input {
        width: 100%;
        max-width: 100%;
      }

      .btn-refresh {
        width: auto;
        flex: 1;
        padding: var(--spacing-sm) var(--spacing-base);
      }

      .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .data-table {
        min-width: 700px;
        font-size: var(--font-size-xs);
      }

      .data-table th,
      .data-table td {
        padding: var(--spacing-sm) var(--spacing-xs);
        white-space: nowrap;
      }
    }

    @media (max-width: 480px) {
      .data-table-container {
        padding: var(--spacing-sm);
      }

      .data-table {
        min-width: 600px;
        font-size: var(--font-size-xs);
      }

      .data-table th {
        font-size: 0.7rem;
        padding: var(--spacing-xs);
      }

      .data-table td {
        padding: var(--spacing-xs);
        font-size: 0.7rem;
      }

      .header h2 {
        font-size: var(--font-size-base);
      }
    }
  `]
})
export class DataTableComponent implements OnInit {
  tableData: TableData | null = null;
  filteredData: any[] = [];
  loading = false;
  error: string | null = null;
  cityFilter: string = '';
  selectedDate: string = '2026-01-25'; // Default date (date that has data)
  originCountryFilter: string = 'all';
  destCountryFilter: string = 'all';
  
  // Available countries (populated from data)
  availableOriginCountries: string[] = [];
  availableDestCountries: string[] = [];

  // City columns to filter on
  private cityColumns = ['Origin City', 'Dest City'];
  
  // Available date range (January 2026)
  minDate: string = '2026-01-01';
  maxDate: string = '2026-01-31';

  constructor(
    private dataService: DataService,
    private errorLogger: ErrorLoggerService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  /**
   * Extract city name from strings like "Belfast - Belfast International Airport"
   * Returns everything before the first " - " (dash with spaces)
   */
  private extractCityName(value: string): string {
    if (!value || typeof value !== 'string') return '';
    // Match everything before " - " (including the dash and spaces)
    const match = value.match(/^([^-]+?)(?:\s*-\s*|$)/);
    return match ? match[1].trim() : value.trim();
  }

  /**
   * Extract unique countries from data
   */
  private extractCountries() {
    if (!this.tableData || !this.tableData.data) return;
    
    const originCountries = new Set<string>();
    const destCountries = new Set<string>();
    
    this.tableData.data.forEach(row => {
      const originCountry = row['Origin Country'];
      const destCountry = row['Dest Country'];
      
      if (originCountry && originCountry !== 'N/A') {
        originCountries.add(String(originCountry).toUpperCase());
      }
      if (destCountry && destCountry !== 'N/A') {
        destCountries.add(String(destCountry).toUpperCase());
      }
    });
    
    this.availableOriginCountries = Array.from(originCountries).sort();
    this.availableDestCountries = Array.from(destCountries).sort();
  }

  /**
   * Apply all filters (city, origin country, dest country)
   */
  applyFilter() {
    if (!this.tableData) {
      this.filteredData = [];
      return;
    }

    let filtered = [...this.tableData.data];

    // Filter by origin country
    if (this.originCountryFilter && this.originCountryFilter !== 'all') {
      filtered = filtered.filter(row => {
        const originCountry = row['Origin Country'];
        return originCountry && String(originCountry).toUpperCase() === this.originCountryFilter.toUpperCase();
      });
    }

    // Filter by destination country
    if (this.destCountryFilter && this.destCountryFilter !== 'all') {
      filtered = filtered.filter(row => {
        const destCountry = row['Dest Country'];
        return destCountry && String(destCountry).toUpperCase() === this.destCountryFilter.toUpperCase();
      });
    }

    // Filter by city (regex)
    if (this.cityFilter && this.cityFilter.trim() !== '') {
      const filterRegex = new RegExp(this.cityFilter.trim(), 'i'); // Case-insensitive
      
      filtered = filtered.filter(row => {
        // Check each city column
        return this.cityColumns.some(column => {
          const value = row[column];
          if (!value) return false;
          
          // Extract city name (everything before " - ")
          const cityName = this.extractCityName(String(value));
          
          // Match against filter regex
          return filterRegex.test(cityName);
        });
      });
    }

    this.filteredData = filtered;
  }

  onDateChange() {
    console.log('[DataTableComponent] Date changed to:', this.selectedDate);
    // Reset country filters when date changes
    this.originCountryFilter = 'all';
    this.destCountryFilter = 'all';
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;
    
    console.log('[DataTableComponent] Starting data load for date:', this.selectedDate);
    
    this.dataService.getTableData(100, this.selectedDate).subscribe({
      next: (data) => {
        console.log('[DataTableComponent] Data loaded successfully');
        this.tableData = data;
        this.extractCountries(); // Extract available countries
        this.applyFilter(); // Apply filter after loading data
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        
        // Log using error logger service
        this.errorLogger.logError('DataTableComponent.loadData', err);
        
        // Log comprehensive error information
        const errorLog = {
          timestamp: new Date().toISOString(),
          component: 'DataTableComponent',
          method: 'loadData',
          error: err,
          errorType: err?.constructor?.name,
          message: err?.message,
          status: err?.status,
          statusText: err?.statusText,
          url: err?.url,
          errorBody: err?.error,
          errorString: typeof err?.error === 'string' ? err.error : JSON.stringify(err?.error)
        };
        
        console.error('[DataTableComponent] Error loading data - Full details:', errorLog);
        console.error('[DataTableComponent] Error stack:', err?.stack);
        
        // Also log summary format
        console.error('=== COMPONENT ERROR SUMMARY ===');
        console.error('Component: DataTableComponent');
        console.error('Method: loadData');
        console.error('Status:', err?.status);
        console.error('StatusText:', err?.statusText);
        console.error('Message:', err?.message);
        console.error('URL:', err?.url);
        console.error('Error Body:', typeof err?.error === 'string' ? err.error : JSON.stringify(err?.error));
        console.error('==============================');
        
        // Display user-friendly error
        this.error = err.error?.error || err.message || 'Failed to load data';
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
    
    const stringValue = String(value);
    
    // Format time columns (Departure, Arrival)
    if (column && (column === 'Departure' || column === 'Arrival')) {
      return this.formatTime(stringValue);
    }
    
    // Extract city name for city columns
    if (column && this.cityColumns.includes(column)) {
      return this.extractCityName(stringValue);
    }
    
    return stringValue;
  }

  /**
   * Format time from "1220" to "12:20"
   */
  private formatTime(timeValue: string): string {
    if (!timeValue || typeof timeValue !== 'string') return timeValue || '';
    
    // Remove any non-digit characters
    const digits = timeValue.replace(/\D/g, '');
    
    // If it's 4 digits (HHMM format), add colon
    if (digits.length === 4) {
      return `${digits.substring(0, 2)}:${digits.substring(2, 4)}`;
    }
    
    // If it's already formatted or different format, return as-is
    return timeValue;
  }

  /**
   * Get cell styling based on column name
   */
  getCellStyle(column: string): { [key: string]: string } {
    // Time columns - red (lighter)
    if (column === 'Departure' || column === 'Arrival') {
      return { color: '#DC3545', fontWeight: '300' };
    }
    
    // Origin country columns - blue
    if (column === 'Origin Country') {
      return { color: '#1E90FF', fontWeight: '300' };
    }
    
    // Destination country columns - green
    if (column === 'Dest Country') {
      return { color: '#229a56', fontWeight: '300' };
    }
    
    // Origin city - lighter blue
    if (column === 'Origin City') {
      return { color: '#146ac5', fontWeight: '300' };
    }
    
    // Dest city - lighter green
    if (column === 'Dest City') {
      return { color: '#229a56', fontWeight: '300' };
    }
    
    return {};
  }
}
