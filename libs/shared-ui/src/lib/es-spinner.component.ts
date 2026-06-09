import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-spinner',
  standalone: true,
  template: `
    <div class="es-spinner" role="status" aria-live="polite">
      <span aria-hidden="true"></span>
      <p>{{ label() }}</p>
    </div>
  `,
  styles: [
    `
      .es-spinner {
        align-items: center;
        display: inline-flex;
        gap: 0.75rem;
      }

      span {
        animation: es-spin 800ms linear infinite;
        border: 3px solid var(--es-color-neutral-200);
        border-top-color: var(--es-color-primary);
        border-radius: 999px;
        height: 1.5rem;
        width: 1.5rem;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0;
      }

      @keyframes es-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsSpinnerComponent {
  readonly label = input('Loading...');
}
