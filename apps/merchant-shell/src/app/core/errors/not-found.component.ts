import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EsEmptyStateComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-not-found',
  standalone: true,
  imports: [RouterLink, EsEmptyStateComponent],
  template: `
    <main class="error-page">
      <es-empty-state icon="search_off" title="Page not found" description="The requested workspace route does not exist." />
      <a routerLink="/home">Back to dashboard</a>
    </main>
  `,
  styles: [
    `
      .error-page {
        padding: 3rem 1rem;
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
