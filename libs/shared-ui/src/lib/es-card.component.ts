import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-card',
  standalone: true,
  template: `
    <article class="es-card">
      @if (title() || subtitle()) {
        <header class="es-card__header">
          <div class="es-card__header-text">
            @if (title()) {
              <h2>{{ title() }}</h2>
            }
            @if (subtitle()) {
              <p>{{ subtitle() }}</p>
            }
          </div>
          <div class="es-card__header-actions">
            <ng-content select="[card-actions]" />
          </div>
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
        align-items: center;
        border-bottom: 1px solid var(--es-color-border);
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        padding: 1rem 1.125rem;
      }

      .es-card__header-text {
        min-width: 0;
      }

      .es-card__header-actions:empty {
        display: none;
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
