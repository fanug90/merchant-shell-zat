import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-kpi-card',
  standalone: true,
  template: `
    <section class="es-kpi">
      <p>{{ label() }}</p>
      <strong>{{ value() }}</strong>
      @if (trend()) {
        <span>{{ trend() }}</span>
      }
    </section>
  `,
  styles: [
    `
      .es-kpi {
        background: var(--es-color-surface);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        padding: 1rem;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0;
      }

      strong {
        display: block;
        font-size: 1.75rem;
        line-height: 1.2;
        margin-top: 0.5rem;
      }

      span {
        color: var(--es-color-success);
        display: block;
        margin-top: 0.375rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsKpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input('');
}
