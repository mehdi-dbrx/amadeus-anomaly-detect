import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  icon?: string;
  action?: () => void;
}

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sidebar-menu">
      <div class="logo-container">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Amadeus_Organization_logo_2024.svg/960px-Amadeus_Organization_logo_2024.svg.png" 
             alt="Amadeus Logo" 
             class="amadeus-logo" />
      </div>
      <div class="menu-section" *ngFor="let section of menuSections">
        <h3 class="section-title">{{ section.title }}</h3>
        <ul class="menu-list">
          <li *ngFor="let item of section.items" class="menu-item" (click)="handleClick(item)">
            <span class="menu-label">{{ item.label }}</span>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-menu {
      position: fixed;
      top: 0;
      left: 0;
      width: 280px;
      height: 100vh;
      background: var(--color-background);
      border-right: 1px solid var(--color-background-tertiary);
      padding: var(--spacing-lg);
      overflow-y: auto;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
      z-index: 100;
    }

    .logo-container {
      padding: var(--spacing-base) 0 var(--spacing-xl) 0;
      margin-bottom: var(--spacing-lg);
      border-bottom: 1px solid var(--color-background-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .amadeus-logo {
      max-width: 180px;
      height: auto;
      display: block;
    }

    .menu-section {
      margin-bottom: var(--spacing-xl);
    }

    .menu-section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: var(--font-size-xs);
      font-weight: 300;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0 0 var(--spacing-base) 0;
      padding-bottom: var(--spacing-xs);
      border-bottom: 1px solid var(--color-background-tertiary);
    }

    .menu-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .menu-item {
      padding: var(--spacing-sm) var(--spacing-base);
      margin-bottom: var(--spacing-xs);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-base);
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      font-weight: 300;
      letter-spacing: 0.01em;
    }

    .menu-item:hover {
      background: var(--color-muted-light);
      color: var(--color-primary);
    }

    .menu-item:active {
      background: var(--color-background-tertiary);
    }

    .menu-label {
      display: block;
    }

    @media (max-width: 1024px) {
      .sidebar-menu {
        width: 240px;
      }

      .amadeus-logo {
        max-width: 150px;
      }
    }

    @media (max-width: 768px) {
      .sidebar-menu {
        width: 200px;
        padding: var(--spacing-base);
      }

      .amadeus-logo {
        max-width: 120px;
      }

      .section-title {
        font-size: 0.7rem;
      }

      .menu-item {
        padding: var(--spacing-xs) var(--spacing-sm);
        font-size: var(--font-size-xs);
      }
    }
  `]
})
export class SidebarMenuComponent {
  menuSections: MenuSection[] = [
    {
      title: 'Core Features',
      items: [
        { label: 'Anomaly Overview' },
        { label: 'Route Monitor' },
        { label: 'Alert Center' },
        { label: 'Capacity Insights' }
      ]
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Trend Analysis' },
        { label: 'Route Comparison' },
        { label: 'Historical Patterns' },
        { label: 'Risk Scoring' }
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'Detection Rules' },
        { label: 'Threshold Config' },
        { label: 'Notifications' },
        { label: 'Export Reports' }
      ]
    }
  ];

  handleClick(item: MenuItem) {
    console.log('[SidebarMenu] Menu item clicked:', item.label);
    // TODO: Implement navigation/action for each menu item
    if (item.action) {
      item.action();
    }
  }
}
