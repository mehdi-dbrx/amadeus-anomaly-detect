import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from './data-table.component';
import { AnomalyTableComponent } from './anomaly-table.component';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, DataTableComponent, AnomalyTableComponent],
  template: `
    <div class="tabs-container">
      <div class="tabs-header">
        <button 
          *ngFor="let tab of tabs" 
          class="tab-button"
          [class.active]="activeTab === tab.id"
          (click)="setActiveTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="tabs-content">
        <app-anomaly-table *ngIf="activeTab === 'latest'"></app-anomaly-table>
        <app-data-table *ngIf="activeTab === 'all'"></app-data-table>
      </div>
    </div>
  `,
  styles: [`
    .tabs-container {
      width: 100%;
    }

    .tabs-header {
      display: flex;
      gap: var(--spacing-xs);
      border-bottom: 1px solid var(--color-background-tertiary);
      margin-bottom: var(--spacing-base);
    }

    .tab-button {
      padding: var(--spacing-sm) var(--spacing-lg);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-normal);
      color: var(--color-text-muted);
      transition: all var(--transition-base);
      font-family: var(--font-family-sans);
      letter-spacing: 0.01em;
    }

    .tab-button:hover {
      color: var(--color-text-primary);
      background: var(--color-muted-light);
    }

    .tab-button.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
      font-weight: var(--font-weight-medium);
    }

    .tabs-content {
      width: 100%;
    }
  `]
})
export class TabsComponent {
  tabs = [
    { id: 'latest', label: 'Latest Flight Data' },
    { id: 'all', label: 'All Flight Data' }
  ];

  activeTab: string = 'latest';

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }
}
