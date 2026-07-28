import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'es-button',
  standalone: true,
  template: `
    <button
      class="es-button"
      [class]="'es-button es-button--' + variant()"
      [type]="type()"
      [disabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  styles: [
    `
      .es-button {
        border: 1px solid transparent;
        border-radius: var(--es-radius-sm);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.5rem;
        padding: 0 0.875rem;
        font: inherit;
        font-weight: 650;
        transition:
          background-color 120ms ease,
          border-color 120ms ease,
          color 120ms ease,
          box-shadow 120ms ease,
          transform 120ms ease,
          filter 120ms ease;
      }

      .es-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .es-button--primary {
        background: var(--es-gradient-brand);
        color: white;
      }

      .es-button--primary:hover:not(:disabled) {
        filter: brightness(1.12);
        box-shadow: 0 6px 16px rgba(0, 128, 251, 0.3);
        transform: translateY(-1px);
      }
      .es-button--primary:active:not(:disabled) {
        filter: brightness(0.96);
        transform: translateY(0);
        box-shadow: none;
      }
      .es-button--primary:disabled {
        background: var(--es-color-neutral-200);
        color: var(--es-color-neutral-600);
      }

      .es-button--secondary {
        background: white;
        border-color: var(--es-color-border);
        color: var(--es-color-neutral-900);
      }

      .es-button--secondary:hover:not(:disabled) {
        background: rgba(0, 128, 251, 0.08);
        border-color: var(--es-color-primary);
        color: var(--es-color-primary-hover);
        box-shadow: 0 4px 10px rgba(21, 89, 209, 0.16);
      }
      .es-button--secondary:active:not(:disabled) {
        background: rgba(0, 128, 251, 0.14);
        box-shadow: none;
      }
      .es-button--secondary:disabled {
        background: var(--es-color-neutral-100);
        border-color: var(--es-color-neutral-200);
        color: var(--es-color-neutral-600);
      }

      .es-button--danger {
        background: var(--es-color-danger);
        color: white;
      }

      .es-button--danger:hover:not(:disabled) {
        filter: brightness(1.1);
        box-shadow: 0 6px 16px rgba(200, 30, 30, 0.3);
        transform: translateY(-1px);
      }
      .es-button--danger:active:not(:disabled) {
        filter: brightness(0.94);
        transform: translateY(0);
        box-shadow: none;
      }
      .es-button--danger:disabled {
        background: var(--es-color-neutral-200);
        color: var(--es-color-neutral-600);
      }
      .es-button--ghost {
        background: transparent;
        color: var(--es-color-neutral-700);
      }

      .es-button--ghost:hover:not(:disabled) {
        background: var(--es-color-neutral-200);
        color: var(--es-color-neutral-900);
      }
      .es-button--ghost:active:not(:disabled) {
        background: var(--es-color-neutral-100);
      }
      .es-button--ghost:disabled {
        color: var(--es-color-neutral-600);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>(
    'primary',
  );
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
}
