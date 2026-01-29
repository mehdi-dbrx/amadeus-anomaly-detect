import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ErrorLoggerService } from './error-logger.service';

export interface TableData {
  columns: string[];
  data: any[];
  rowCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = '/api/data';

  constructor(
    private http: HttpClient,
    private errorLogger: ErrorLoggerService
  ) {}

  getTableData(limit: number = 100, date?: string): Observable<TableData> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (date) {
      params.set('date', date);
    }
    const url = `${this.apiUrl}?${params.toString()}`;
    console.log(`[DataService] Requesting data from ${url}`);
    
    return this.http.get<TableData>(url).pipe(
      tap({
        next: (data) => {
          console.log('[DataService] Successfully received data:', {
            columns: data.columns,
            rowCount: data.rowCount,
            dataLength: data.data?.length
          });
        },
        error: (error) => {
          console.error('[DataService] Error occurred:', {
            error: error,
            errorType: error?.constructor?.name,
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText,
            url: error?.url,
            errorBody: error?.error,
            errorString: typeof error?.error === 'string' ? error.error.substring(0, 500) : JSON.stringify(error?.error)
          });
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // Log comprehensive error details
        const errorDetails = {
          timestamp: new Date().toISOString(),
          service: 'DataService',
          method: 'getTableData',
          requestUrl: url,
          errorUrl: error?.url,
          errorType: error?.constructor?.name || 'Unknown',
          message: error?.message || 'No error message',
          status: error?.status,
          statusText: error?.statusText,
          errorBody: error?.error,
          errorString: typeof error?.error === 'string' ? error.error.substring(0, 1000) : JSON.stringify(error?.error)
        };
        
        // Log using error logger service
        this.errorLogger.logError('DataService.getTableData', error);
        
        console.error('[DataService] Full error details:', JSON.stringify(errorDetails, null, 2));
        
        // Also log to a format that's easy to grep
        console.error('=== ERROR SUMMARY ===');
        console.error('Service: DataService');
        console.error('Method: getTableData');
        console.error('Request URL:', url);
        console.error('Error URL:', error?.url);
        console.error('Status:', error?.status);
        console.error('StatusText:', error?.statusText);
        console.error('Message:', error?.message);
        console.error('Error Body:', typeof error?.error === 'string' ? error.error : JSON.stringify(error?.error));
        console.error('===================');
        
        // Re-throw to let component handle it
        return throwError(() => error);
      })
    );
  }
}
