import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-notification-toast',
  standalone: true,
  template: `<div class="es-toast" role="status">{{ message() }}</div>`,
  styles: [
    `
      .es-toast {
        background: var(--es-color-neutral-900);
        border-radius: var(--es-radius-md);
        color: white;
        padding: 0.875rem 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsNotificationToastComponent {
  readonly message = input.required<string>();
}
