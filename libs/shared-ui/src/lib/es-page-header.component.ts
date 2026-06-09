import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-page-header',
  standalone: true,
  template: `
    <header class="es-page-header">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
  styles: [
    `
      .es-page-header {
        align-items: center;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }

      h1 {
        font-size: 1.5rem;
        line-height: 1.2;
        margin: 0;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0.25rem 0 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsPageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
