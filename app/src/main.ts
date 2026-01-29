import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ErrorLoggerService } from './app/error-logger.service';

// Global error handler to catch all unhandled errors
window.addEventListener('error', (event) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context: 'GlobalErrorHandler',
    type: 'error',
    error: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      name: event.error?.name,
      stack: event.error?.stack
    }
  };
  
  console.error('[Global Error Handler] Unhandled error:', errorLog);
  
  // Send to server for logging
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorLog)
  }).catch(err => console.error('Failed to log error to server:', err));
});

window.addEventListener('unhandledrejection', (event) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context: 'GlobalErrorHandler',
    type: 'unhandledrejection',
    error: {
      reason: event.reason,
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    }
  };
  
  console.error('[Global Error Handler] Unhandled promise rejection:', errorLog);
  
  // Send to server for logging
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorLog)
  }).catch(err => console.error('Failed to log error to server:', err));
});

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([]),
    provideHttpClient()
  ]
}).catch(err => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context: 'Bootstrap',
    type: 'bootstrap',
    error: {
      message: err?.message,
      stack: err?.stack,
      name: err?.name
    }
  };
  
  console.error('[Bootstrap Error] Failed to bootstrap application:', errorLog);
  
  // Send to server for logging
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorLog)
  }).catch(e => console.error('Failed to log bootstrap error:', e));
});
