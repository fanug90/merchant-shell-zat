// import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// @Component({
//   selector: 'es-kpi-card',
//   standalone: true,
//   template: `
//     <section class="es-kpi es-kpi--' + size() + ' es-kpi--' + tone()">
//       <p>{{ label() }}</p>
//       <strong>{{ value() }}</strong>
//       @if (trend()) {
//         <span>{{ trend() }}</span>
//       }
//     </section>
//   `,
//   styles: [
//     `
//       .es-kpi {
//         background: rgba(255, 255, 255, 0.92);
//         border: 1px solid var(--es-color-border);
//         border-radius: var(--es-radius-md);
//         padding: 1rem;
//         box-shadow: var(--es-shadow-card);
//       }

//       p {
//         color: var(--es-color-neutral-600);
//         margin: 0;
//       }

//       strong {
//         display: block;
//         font-size: 1.75rem;
//         line-height: 1.2;
//         margin-top: 0.5rem;
//       }

//       span {
//         color: var(--es-color-accent-dark);
//         display: block;
//         margin-top: 0.375rem;
//       }

//       .es-kpi--compact {
//         padding: 0.65rem 0.85rem;
//       }

//       .es-kpi--compact p {
//         font-size: 0.75rem;
//       }

//       .es-kpi--compact strong {
//         font-size: 1.15rem;
//         margin-top: 0.25rem;
//       }

//       .es-kpi--compact span {
//         font-size: 0.75rem;
//         margin-top: 0.2rem;
//       }

//       /* Tones reuse the exact palette es-status-badge already uses, so
//          colors stay consistent with status badges elsewhere in the app. */
//       .es-kpi--accent {
//         background: rgba(0, 168, 121, 0.06);
//         border-color: rgba(0, 168, 121, 0.22);
//       }

//       .es-kpi--accent p {
//         color: var(--es-color-accent-dark);
//       }

//       .es-kpi--success {
//         background: #def7ec;
//         border-color: #b7e4cf;
//       }

//       .es-kpi--success p,
//       .es-kpi--success strong {
//         color: #03543f;
//       }

//       .es-kpi--warning {
//         background: #feecdc;
//         border-color: #f8d5b0;
//       }

//       .es-kpi--warning p,
//       .es-kpi--warning strong {
//         color: #8a2c0d;
//       }

//       .es-kpi--danger {
//         background: #fde8e8;
//         border-color: #f6c6c6;
//       }

//       .es-kpi--danger p,
//       .es-kpi--danger strong {
//         color: #9b1c1c;
//       }
//     `,
//   ],
//   changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class EsKpiCardComponent {
//   readonly label = input.required<string>();
//   readonly value = input.required<string>();
//   readonly trend = input('');
//   readonly size = input<'default' | 'compact'>('default');
//   readonly tone = input<
//     'neutral' | 'accent' | 'success' | 'warning' | 'danger'
//   >('neutral');
// }

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-kpi-card',
  standalone: true,
  template: `
    <section
      class="es-kpi"
      [class.es-kpi--compact]="size() === 'compact'"
      [class.es-kpi--accent]="tone() === 'accent'"
      [class.es-kpi--success]="tone() === 'success'"
      [class.es-kpi--warning]="tone() === 'warning'"
      [class.es-kpi--danger]="tone() === 'danger'"
    >
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
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        box-shadow: var(--es-shadow-card);
        padding: 1rem;
      }

      .es-kpi p {
        color: var(--es-color-neutral-600);
        margin: 0;
      }

      .es-kpi strong {
        display: block;
        font-size: 1.75rem;
        line-height: 1.2;
        margin-top: 0.5rem;
      }

      .es-kpi span {
        color: var(--es-color-accent-dark);
        display: block;
        margin-top: 0.375rem;
      }

      .es-kpi.es-kpi--compact {
        padding: 0.65rem 0.85rem;
      }

      .es-kpi.es-kpi--compact p {
        font-size: 0.75rem;
      }

      .es-kpi.es-kpi--compact strong {
        font-size: 1.15rem;
        margin-top: 0.25rem;
      }

      .es-kpi.es-kpi--compact span {
        font-size: 0.75rem;
        margin-top: 0.2rem;
      }

      .es-kpi.es-kpi--accent {
        background: rgba(0, 168, 121, 0.06);
        border-color: rgba(0, 168, 121, 0.22);
      }

      .es-kpi.es-kpi--accent p {
        color: var(--es-color-accent-dark);
      }

      .es-kpi.es-kpi--success {
        background: #def7ec;
        border-color: #b7e4cf;
      }

      .es-kpi.es-kpi--success p,
      .es-kpi.es-kpi--success strong {
        color: #03543f;
      }

      .es-kpi.es-kpi--warning {
        background: #feecdc;
        border-color: #f8d5b0;
      }

      .es-kpi.es-kpi--warning p,
      .es-kpi.es-kpi--warning strong {
        color: #8a2c0d;
      }

      .es-kpi.es-kpi--danger {
        background: #fde8e8;
        border-color: #f6c6c6;
      }

      .es-kpi.es-kpi--danger p,
      .es-kpi.es-kpi--danger strong {
        color: #9b1c1c;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsKpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input('');
  readonly size = input<'default' | 'compact'>('default');
  readonly tone = input<
    'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  >('neutral');
}
