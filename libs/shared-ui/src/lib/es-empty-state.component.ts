import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'es-empty-state',
  standalone: true,
  template: `
    <section class="es-empty" role="status" aria-live="polite">
      <div class="es-empty__icon" aria-hidden="true">
        <span class="material-symbols-outlined">{{ icon() }}</span>
      </div>
      <h2>{{ title() }}</h2>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </section>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');

      .es-empty {
        display: grid;
        gap: 0.75rem;
        justify-items: center;
        padding: 3rem 1rem;
        text-align: center;
      }

     .es-empty__icon {
     align-items: center;
     background: var(--es-gradient-brand); /* same gradient */
     border-radius: 999px;
     color: white; /* ✅ ensures icon stands out */
     display: inline-flex;
     height: 3rem;
     justify-content: center;
     width: 3rem;    }

      .material-symbols-outlined {
        font-family: 'Material Symbols Outlined';
        font-size: 1.75rem;
        font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 24;
        line-height: 1;
      }

      h2 {
        font-size: 1.125rem;
        margin: 0;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0;
        max-width: 34rem;
      }

      button {
        border: 0;
        border-radius: var(--es-radius-sm);
        background:var(--es-gradient-brand); /* same gradient*/
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 650;
        min-height: 2.5rem;
        padding: 0 0.875rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsEmptyStateComponent {
  readonly icon = input('info');
  readonly title = input('Nothing here yet');
  readonly description = input('');
  readonly actionLabel = input('');
  readonly action = output<void>();
}
