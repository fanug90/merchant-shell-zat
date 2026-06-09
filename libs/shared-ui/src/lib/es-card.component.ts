import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-card',
  standalone: true,
  template: `
    <article class="es-card">
      @if (title() || subtitle()) {
        <header class="es-card__header">
          @if (title()) {
            <h2>{{ title() }}</h2>
          }
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </header>
      }
      <div class="es-card__body">
        <ng-content />
      </div>
    </article>
  `,
  styles: [
    `
      .es-card {
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        box-shadow: var(--es-shadow-card);
      }

      .es-card__header {
        border-bottom: 1px solid var(--es-color-border);
        padding: 1rem 1.125rem;
      }

      h2 {
        color: var(--es-color-neutral-900);
        font-size: 1rem;
        margin: 0;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0.25rem 0 0;
      }

      .es-card__body {
        padding: 1.125rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsCardComponent {
  readonly title = input('');
  readonly subtitle = input('');
}
