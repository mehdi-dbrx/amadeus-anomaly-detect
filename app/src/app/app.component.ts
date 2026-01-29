import { Component } from '@angular/core';
import { SidebarMenuComponent } from './sidebar-menu.component';
import { TabsComponent } from './tabs.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarMenuComponent, TabsComponent],
  template: `
    <div class="container">
      <header>
        <h1>Amadeus SeatSense</h1>
        <p class="subtitle">Smart Travel intelligence Solutions</p>
      </header>
      <main>
        <app-tabs></app-tabs>
      </main>
      <app-sidebar-menu></app-sidebar-menu>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .container {
      max-width: 1280px;
      margin: 0;
      padding: 2rem;
      padding-left: 320px; /* Space for left sidebar */
      font-family: var(--font-family-sans);
    }

    @media (max-width: 1024px) {
      .container {
        padding-left: 280px;
      }
    }

    @media (max-width: 768px) {
      .container {
        padding-left: 240px;
      }
    }

    header {
      text-align: left;
      margin-bottom: var(--spacing-xl);
      padding-bottom: var(--spacing-base);
    }

    h1 {
      font-size: var(--font-size-xl);
      color: var(--color-text-primary);
      margin: 0;
      font-weight: var(--font-weight-semibold);
    }

    .subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: var(--spacing-xs);
      font-weight: var(--font-weight-normal);
    }

    .card {
      background: var(--color-background);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      box-shadow: var(--shadow-xl);
      border: 2px solid var(--color-primary);
    }

    .card h2 {
      margin-top: 0;
      color: var(--color-text-primary);
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
    }

    .card p {
      color: var(--color-text-secondary);
      line-height: var(--line-height-relaxed);
      font-size: var(--font-size-base);
    }

    .info {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-lg);
      border-top: 2px solid var(--color-primary);
      background: var(--color-background-alt);
      padding: var(--spacing-lg);
      border-radius: var(--radius-md);
      margin-left: -2rem;
      margin-right: -2rem;
      margin-bottom: -2rem;
    }

    .info p {
      margin: 0.75rem 0;
      color: var(--color-text-secondary);
    }

    .info strong {
      color: var(--color-text-primary);
      font-weight: var(--font-weight-semibold);
    }
  `]
})
export class AppComponent {
  title = 'amadeus-anomaly-app';
}
