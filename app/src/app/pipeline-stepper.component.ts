import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StepState = 'pending' | 'active' | 'completed';

export interface PipelineStep {
  id: number;
  label: string;
  state: StepState;
}

@Component({
  selector: 'app-pipeline-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper-container">
      <div class="stepper-steps">
        <div 
          *ngFor="let step of steps; let i = index" 
          class="step-wrapper"
          [class.active]="step.state === 'active'"
          [class.completed]="step.state === 'completed'"
          [class.pending]="step.state === 'pending'"
        >
          <div class="step-content">
            <div class="step-circle" [class.active]="step.state === 'active'" [class.completed]="step.state === 'completed'">
              <span *ngIf="step.state === 'completed'" class="checkmark">✓</span>
              <div *ngIf="step.state === 'active'" class="spinner"></div>
              <span *ngIf="step.state === 'pending'" class="step-number">{{ step.id }}</span>
            </div>
            <div class="step-label">{{ step.label }}</div>
          </div>
          <div *ngIf="i < steps.length - 1" class="step-connector" [class.completed]="step.state === 'completed'"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stepper-container {
      width: 100%;
      padding: var(--spacing-lg);
      background: var(--color-background);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-background-tertiary);
      margin-bottom: var(--spacing-base);
    }

    .stepper-steps {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      position: relative;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }

    .step-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      min-width: 80px;
      position: relative;
    }

    .step-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
      z-index: 1;
    }

    .step-circle {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-sm);
      transition: all var(--transition-base);
      border: 2px solid var(--color-background-tertiary);
      background: var(--color-background);
      color: var(--color-text-muted);
    }

    .step-circle.pending {
      background: var(--color-background);
      border-color: var(--color-background-tertiary);
      color: var(--color-text-muted);
    }

    .step-circle.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
      animation: pulse 2s ease-in-out infinite;
    }

    .step-circle.completed {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
      }
    }

    .step-number {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
    }

    .checkmark {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      line-height: 1;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
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

    .step-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      text-align: center;
      font-weight: var(--font-weight-normal);
      max-width: 100px;
      line-height: 1.2;
    }

    .step-wrapper.active .step-label {
      color: var(--color-primary);
      font-weight: var(--font-weight-semibold);
    }

    .step-wrapper.completed .step-label {
      color: var(--color-success);
    }

    .step-connector {
      position: absolute;
      top: 1.25rem;
      left: calc(50% + 1.25rem);
      right: calc(-50% + 1.25rem);
      height: 2px;
      background: var(--color-background-tertiary);
      z-index: 0;
      transition: background var(--transition-base);
    }

    .step-connector.completed {
      background: var(--color-success);
    }

    .step-wrapper:last-child .step-connector {
      display: none;
    }

    @media (max-width: 768px) {
      .stepper-steps {
        flex-direction: column;
        align-items: flex-start;
      }

      .step-wrapper {
        flex-direction: row;
        width: 100%;
        align-items: center;
        min-width: auto;
      }

      .step-content {
        flex-direction: row;
        gap: var(--spacing-base);
        width: 100%;
      }

      .step-label {
        text-align: left;
        max-width: none;
        flex: 1;
      }

      .step-connector {
        display: none;
      }
    }
  `]
})
export class PipelineStepperComponent {
  @Input() steps: PipelineStep[] = [];

  constructor() {}
}
