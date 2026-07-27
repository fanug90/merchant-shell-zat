import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { AuthService } from '@zat-main-web/auth';
import {
  EsButtonComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-topbar',
  standalone: true,
  imports: [EsButtonComponent, EsStatusBadgeComponent],
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <button
          type="button"
          class="topbar__menu"
          (click)="menuToggle.emit()"
          aria-label="Open navigation menu"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div>
          <span class="eyebrow">Secure merchant session</span>
          <strong>{{ tenant.currentMerchant().businessName }}</strong>
          <span
            >{{ tenant.currentUser().displayName }} ·
            {{ tenant.currentUser().email }}</span
          >
        </div>
      </div>
      <div class="topbar__actions">
        <es-status-badge
          [label]="tenant.currentMerchant().status"
          [tone]="
            tenant.currentMerchant().status === 'ACTIVE' ? 'success' : 'warning'
          "
        />
        <es-button variant="ghost" (click)="logout()">Sign out</es-button>
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        align-items: center;
        background: rgba(255, 255, 255, 0.86);
        border-bottom: 1px solid var(--es-color-border);
        backdrop-filter: blur(18px);
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        min-height: 4rem;
        padding: 0 1.5rem;
      }

      .topbar__left {
        align-items: center;
        display: flex;
        gap: 0.75rem;
        min-width: 0;
      }

      .topbar__menu {
        background: transparent;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        cursor: pointer;
        display: none;
        flex-shrink: 0;
        font-size: 1.125rem;
        height: 2.5rem;
        width: 2.5rem;
      }

      .topbar__menu:hover,
      .topbar__menu:focus-visible {
        background: var(--es-color-neutral-100);
      }

      strong,
      span {
        display: block;
      }

      strong {
        color: var(--es-color-neutral-900);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      span {
        color: var(--es-color-neutral-600);
        font-size: 0.875rem;
      }

      .eyebrow {
        color: var(--es-color-accent-dark);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        margin-bottom: 0.15rem;
        text-transform: uppercase;
      }

      .topbar__actions {
        align-items: center;
        display: flex;
        flex-shrink: 0;
        gap: 0.75rem;
      }

      @media (max-width: 860px) {
        .topbar__menu {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .topbar__left > div {
          min-width: 0;
        }
      }

      @media (max-width: 640px) {
        .topbar {
          padding: 0 1rem;
        }

        .topbar__left span:last-child {
          display: none; // hide the email line on very small screens to save space
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  readonly tenant = inject(TenantContextService);
  private readonly auth = inject(AuthService);

  readonly menuToggle = output<void>();

  logout(): void {
    void this.auth.logout();
  }
}
