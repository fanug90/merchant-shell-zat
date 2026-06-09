import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-status-badge',
  standalone: true,
  template: `<span class="es-status" [class]="'es-status es-status--' + tone()">{{ label() }}</span>`,
  styles: [
    `
      .es-status {
        border-radius: 999px;
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: 700;
        line-height: 1;
        padding: 0.375rem 0.625rem;
      }

      .es-status--success {
        background: #def7ec;
        color: #03543f;
      }

      .es-status--warning {
        background: #feecdc;
        color: #8a2c0d;
      }

      .es-status--danger {
        background: #fde8e8;
        color: #9b1c1c;
      }

      .es-status--neutral {
        background: var(--es-color-neutral-100);
        color: var(--es-color-neutral-700);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsStatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<'success' | 'warning' | 'danger' | 'neutral'>('neutral');
}
