import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-button',
  standalone: true,
  template: `
    <button class="es-button" [class]="'es-button es-button--' + variant()" [type]="type()" [disabled]="disabled()">
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
        transition: background-color 120ms ease, border-color 120ms ease;
      }

      .es-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .es-button--primary {
        background: var(--es-color-primary);
        color: white;
      }

      .es-button--secondary {
        background: white;
        border-color: var(--es-color-border);
        color: var(--es-color-neutral-900);
      }

      .es-button--danger {
        background: var(--es-color-danger);
        color: white;
      }

      .es-button--ghost {
        background: transparent;
        color: var(--es-color-neutral-700);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
}
