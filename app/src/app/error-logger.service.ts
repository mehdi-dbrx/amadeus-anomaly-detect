import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ErrorLoggerService {
  constructor(private http: HttpClient) {}

  logError(context: string, error: any) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        status: error?.status,
        statusText: error?.statusText,
        url: error?.url,
        errorBody: error?.error,
        errorString: typeof error?.error === 'string' ? error.error : JSON.stringify(error?.error)
      }
    };

    // Log to console (always)
    console.error(`[${context}] Error:`, errorLog);

    // Also send to server for server-side logging
    this.http.post('/api/log-error', errorLog).subscribe({
      next: () => console.log(`[${context}] Error logged to server`),
      error: (err) => console.error(`[${context}] Failed to log error to server:`, err)
    });
  }
}
