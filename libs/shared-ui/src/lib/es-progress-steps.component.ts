import { Component, input } from '@angular/core';

export type EsProgressStepState = 'done' | 'active' | 'pending' | 'error';
export type EsProgressStepsOrientation = 'horizontal' | 'vertical';

export interface EsProgressStep {
  label: string;
  state: EsProgressStepState;
  description?: string;
}

@Component({
  selector: 'es-progress-steps',
  template: `
    <ol
      class="es-progress-steps"
      [class.es-progress-steps--horizontal]="orientation() === 'horizontal'"
    >
      @for (step of steps(); track step.label; let last = $last) {
        <li
          [class]="
            'es-progress-steps__item es-progress-steps__item--' + step.state
          "
          [class.es-progress-steps__item--last]="last"
          [attr.aria-current]="step.state === 'active' ? 'step' : null"
        >
          <span class="es-progress-steps__marker" aria-hidden="true">
            @switch (step.state) {
              @case ('done') {
                ✓
              }
              @case ('error') {
                ✕
              }
              @default {
                {{ $index + 1 }}
              }
            }
          </span>
          <span class="es-progress-steps__body">
            <span class="es-progress-steps__label">
              {{ step.label }}
              <span class="es-progress-steps__sr-status"
                >({{ statusText(step.state) }})</span
              >
            </span>
            @if (step.description) {
              <span class="es-progress-steps__description">{{
                step.description
              }}</span>
            }
          </span>
        </li>
      }
    </ol>
  `,
  styles: [
    `
      .es-progress-steps {
        display: grid;
        gap: 0;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      /* Vertical (default list) layout */
      .es-progress-steps__item {
        display: grid;
        gap: 0.875rem;
        grid-template-columns: 1.75rem minmax(0, 1fr);
        padding-bottom: 1.25rem;
        position: relative;
      }

      .es-progress-steps__item:not(.es-progress-steps__item--last)::before {
        background: var(--es-color-neutral-200);
        bottom: 0;
        content: '';
        left: 0.875rem;
        position: absolute;
        top: 1.75rem;
        width: 2px;
      }

      .es-progress-steps__item--done:not(
          .es-progress-steps__item--last
        )::before {
        background: var(--es-color-accent);
      }

      /* Horizontal layout */
      .es-progress-steps--horizontal {
        display: grid;
        grid-auto-columns: minmax(0, 1fr);
        grid-auto-flow: column;
      }

      .es-progress-steps--horizontal .es-progress-steps__item {
        gap: 0.5rem;
        grid-template-columns: none;
        grid-template-rows: auto auto;
        justify-items: center;
        padding: 0 0.5rem 0;
        text-align: center;
      }

      .es-progress-steps--horizontal
        .es-progress-steps__item:not(.es-progress-steps__item--last)::before {
        background: var(--es-color-neutral-200);
        content: '';
        height: 2px;
        left: calc(50% + 1.25rem);
        position: absolute;
        right: calc(-50% + 1.25rem);
        top: 0.875rem;
        width: auto;
      }

      .es-progress-steps--horizontal
        .es-progress-steps__item--done:not(
          .es-progress-steps__item--last
        )::before {
        background: var(--es-color-accent);
      }

      .es-progress-steps--horizontal .es-progress-steps__description {
        display: none;
      }

      .es-progress-steps__marker {
        align-items: center;
        background: var(--es-color-neutral-200);
        border-radius: 999px;
        color: var(--es-color-neutral-600);
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: 800;
        height: 1.75rem;
        justify-content: center;
        width: 1.75rem;
        z-index: 1;
      }

      .es-progress-steps__item--done .es-progress-steps__marker {
        background: var(--es-color-accent);
        color: white;
      }

      .es-progress-steps__item--active .es-progress-steps__marker {
        background: white;
        border: 2px solid var(--es-color-accent);
        color: var(--es-color-accent-dark);
      }

      .es-progress-steps__item--error .es-progress-steps__marker {
        background: var(--es-color-danger);
        color: white;
      }

      .es-progress-steps__label {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-weight: 650;
      }

      .es-progress-steps__item--done .es-progress-steps__label,
      .es-progress-steps__item--active .es-progress-steps__label {
        color: var(--es-color-neutral-900);
      }

      .es-progress-steps__item--error .es-progress-steps__label {
        color: var(--es-color-danger);
      }

      .es-progress-steps__description {
        color: var(--es-color-neutral-600);
        display: block;
        font-size: 0.8125rem;
        font-weight: 500;
        margin-top: 0.125rem;
      }

      .es-progress-steps__sr-status {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      @media (max-width: 640px) {
        .es-progress-steps--horizontal {
          grid-auto-flow: row;
        }

        .es-progress-steps--horizontal .es-progress-steps__item {
          grid-template-columns: 1.75rem minmax(0, 1fr);
          justify-items: start;
          padding: 0 0 1.25rem;
          text-align: left;
        }

        .es-progress-steps--horizontal
          .es-progress-steps__item:not(.es-progress-steps__item--last)::before {
          bottom: 0;
          height: auto;
          left: 0.875rem;
          right: auto;
          top: 1.75rem;
          width: 2px;
        }
      }
    `,
  ],
})
export class EsProgressStepsComponent {
  readonly steps = input.required<EsProgressStep[]>();
  readonly orientation = input<EsProgressStepsOrientation>('horizontal');

  statusText(state: EsProgressStepState): string {
    switch (state) {
      case 'done':
        return 'completed';
      case 'active':
        return 'in progress';
      case 'error':
        return 'failed';
      default:
        return 'not started';
    }
  }
}
