import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ErrorLoggerService } from './error-logger.service';
import { TableData } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class AnomalyService {
  private apiUrl = '/api/anomaly-updates';

  constructor(
    private http: HttpClient,
    private errorLogger: ErrorLoggerService
  ) {}

  detectAnomalies(date?: string): Observable<any> {
    const url = `/api/anomaly-detect`;
    const payload = { date };
    console.log('='.repeat(60));
    console.log(`[AnomalyService] 🚀 STARTING ANOMALY DETECTION`);
    console.log('='.repeat(60));
    console.log(`[AnomalyService] URL: ${url}`);
    console.log(`[AnomalyService] Payload:`, JSON.stringify(payload, null, 2));
    console.log(`[AnomalyService] Date: ${date || 'none'}`);
    
    return this.http.post<any>(url, payload, { observe: 'response' }).pipe(
      tap({
        next: (response: HttpResponse<any>) => {
          console.log('='.repeat(60));
          console.log('[AnomalyService] 📥 HTTP RESPONSE RECEIVED');
          console.log('='.repeat(60));
          console.log('[AnomalyService] Status:', response.status);
          console.log('[AnomalyService] StatusText:', response.statusText);
          console.log('[AnomalyService] Headers:', JSON.stringify(response.headers.keys()));
          console.log('[AnomalyService] Body type:', typeof response.body);
          console.log('[AnomalyService] Body:', JSON.stringify(response.body, null, 2));
          console.log('[AnomalyService] Body.jobId:', response.body?.jobId);
          console.log('[AnomalyService] Body.jobId type:', typeof response.body?.jobId);
        },
        error: (error) => {
          console.error('[AnomalyService] ❌ HTTP Error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
        }
      }),
      map((response: HttpResponse<any>) => {
        console.log('='.repeat(60));
        console.log('[AnomalyService] 🔄 MAPPING RESPONSE');
        console.log('='.repeat(60));
        console.log('[AnomalyService] Status code:', response.status);
        console.log('[AnomalyService] Expected 202?', response.status === 202);
        // Return body for 202 Accepted (job started) or any other status
        const body = response.body;
        console.log('[AnomalyService] 📦 Extracted body:', JSON.stringify(body, null, 2));
        console.log('[AnomalyService] Body.jobId:', body?.jobId);
        console.log('[AnomalyService] Returning body to subscriber...');
        return body;
      }),
      tap({
        next: (data) => {
          console.log('[AnomalyService] ✅ Mapped data:', data);
          if (data && data.jobId) {
            console.log('[AnomalyService] ✅ Job started with jobId:', data.jobId);
          } else {
            console.log('[AnomalyService] 📊 Anomaly detection completed:', {
              success: data?.success,
              anomaliesCount: data?.anomalies?.length,
              summary: data?.summary
            });
          }
        },
        error: (error) => {
          console.error('[AnomalyService] Anomaly detection error:', {
            error: error,
            errorType: error?.constructor?.name,
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText,
            url: error?.url
          });
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.errorLogger.logError('AnomalyService.detectAnomalies', error);
        
        console.error('[AnomalyService] Full error details:', {
          timestamp: new Date().toISOString(),
          service: 'AnomalyService',
          method: 'detectAnomalies',
          requestUrl: url,
          errorUrl: error?.url,
          errorType: error?.constructor?.name || 'Unknown',
          message: error?.message || 'No error message',
          status: error?.status,
          statusText: error?.statusText,
          errorBody: error?.error
        });
        
        return throwError(() => error);
      })
    );
  }

  cancelDetection(jobId: string): Observable<any> {
    const url = `/api/anomaly-detect/cancel`;
    console.log(`[AnomalyService] Cancelling job: ${jobId}`);
    return this.http.post<any>(url, { jobId });
  }

  getDetectionStatus(jobId: string): Observable<any> {
    const url = `/api/anomaly-detect/status?jobId=${jobId}`;
    console.log(`[AnomalyService] 🔍 Getting status for jobId: ${jobId}`);
    return this.http.get<any>(url).pipe(
      tap({
        next: (status) => {
          console.log(`[AnomalyService] 📊 Status for ${jobId}:`, status);
        },
        error: (err) => {
          console.error(`[AnomalyService] ❌ Status error for ${jobId}:`, err);
        }
      })
    );
  }

  getAnomalyUpdates(limit: number = 100, date?: string): Observable<TableData> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (date) {
      params.set('date', date);
    }
    const url = `${this.apiUrl}?${params.toString()}`;
    console.log(`[AnomalyService] Requesting anomaly updates from ${url}`);
    
    return this.http.get<TableData>(url).pipe(
      tap({
        next: (data) => {
          console.log('[AnomalyService] Successfully received anomaly updates:', {
            columns: data.columns,
            rowCount: data.rowCount,
            dataLength: data.data?.length
          });
        },
        error: (error) => {
          console.error('[AnomalyService] Error occurred:', {
            error: error,
            errorType: error?.constructor?.name,
            message: error?.message,
            status: error?.status,
            statusText: error?.statusText,
            url: error?.url
          });
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.errorLogger.logError('AnomalyService.getAnomalyUpdates', error);
        
        console.error('[AnomalyService] Full error details:', {
          timestamp: new Date().toISOString(),
          service: 'AnomalyService',
          method: 'getAnomalyUpdates',
          requestUrl: url,
          errorUrl: error?.url,
          errorType: error?.constructor?.name || 'Unknown',
          message: error?.message || 'No error message',
          status: error?.status,
          statusText: error?.statusText,
          errorBody: error?.error
        });
        
        return throwError(() => error);
      })
    );
  }
}
