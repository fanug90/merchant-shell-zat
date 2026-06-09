import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@zat-main-web/auth';
import { EsButtonComponent, EsStatusBadgeComponent } from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-topbar',
  standalone: true,
  imports: [EsButtonComponent, EsStatusBadgeComponent],
  template: `
    <header class="topbar">
      <div>
        <strong>{{ tenant.currentMerchant().businessName }}</strong>
        <span>{{ tenant.currentUser().displayName }} · {{ tenant.currentUser().email }}</span>
      </div>
      <div class="topbar__actions">
        <es-status-badge [label]="tenant.currentMerchant().status" [tone]="tenant.currentMerchant().status === 'ACTIVE' ? 'success' : 'warning'" />
        <es-button variant="ghost" (click)="logout()">Sign out</es-button>
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        align-items: center;
        background: var(--es-color-surface);
        border-bottom: 1px solid var(--es-color-border);
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        min-height: 4rem;
        padding: 0 1.5rem;
      }

      strong,
      span {
        display: block;
      }

      span {
        color: var(--es-color-neutral-600);
        font-size: 0.875rem;
      }

      .topbar__actions {
        align-items: center;
        display: flex;
        gap: 0.75rem;
      }

      @media (max-width: 640px) {
        .topbar {
          align-items: flex-start;
          flex-direction: column;
          padding: 1rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  readonly tenant = inject(TenantContextService);
  private readonly auth = inject(AuthService);

  logout(): void {
    void this.auth.logout();
  }
}
