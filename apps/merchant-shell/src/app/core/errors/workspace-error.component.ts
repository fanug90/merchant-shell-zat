import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EsEmptyStateComponent } from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { WorkspaceService } from '../../workspace/workspace.service';

@Component({
  selector: 'es-workspace-error',
  standalone: true,
  imports: [EsEmptyStateComponent],
  template: `
    <main class="error-page">
      <es-empty-state
        icon="cloud_off"
        title="Workspace unavailable"
        [description]="tenant.error() ?? 'The workspace could not be loaded.'"
        actionLabel="Retry"
        (action)="retry()"
      />
      <p>Support: support&#64;zat.local</p>
    </main>
  `,
  styles: [
    `
      .error-page {
        display: grid;
        gap: 1rem;
        min-height: 100vh;
        place-items: center;
        padding: 1rem;
        text-align: center;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceErrorComponent {
  readonly tenant = inject(TenantContextService);
  private readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);

  async retry(): Promise<void> {
    if (await this.workspace.load()) {
      await this.router.navigate(['/home']);
    }
  }
}
