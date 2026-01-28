import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  template: `
    <div class="container">
      <header>
        <h1>Hello World!</h1>
        <p class="subtitle">Welcome to Amadeus Anomaly Detection</p>
      </header>
      <main>
        <div class="card">
          <h2>Angular 18 Application</h2>
          <p>This is a hello world application built with Angular 18 and deployed to Databricks Apps.</p>
          <div class="info">
            <p><strong>Status:</strong> Running successfully</p>
            <p><strong>Framework:</strong> Angular 18</p>
            <p><strong>Platform:</strong> Databricks Apps</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 3rem;
      color: #ffffff;
      margin: 0;
      font-weight: 700;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    .subtitle {
      font-size: 1.2rem;
      color: #e8f4f8;
      margin-top: 0.5rem;
      font-weight: 400;
    }

    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      border: 2px solid #2a5298;
    }

    .card h2 {
      margin-top: 0;
      color: #1e3c72;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .card p {
      color: #2c3e50;
      line-height: 1.6;
      font-size: 1rem;
    }

    .info {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 2px solid #2a5298;
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin-left: -2rem;
      margin-right: -2rem;
      margin-bottom: -2rem;
    }

    .info p {
      margin: 0.75rem 0;
      color: #2c3e50;
    }

    .info strong {
      color: #1e3c72;
      font-weight: 600;
    }
  `]
})
export class AppComponent {
  title = 'amadeus-anomaly-app';
}
