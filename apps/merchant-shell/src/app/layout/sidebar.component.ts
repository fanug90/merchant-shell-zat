import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" aria-label="Workspace navigation">
      <div class="sidebar__head">
        <a class="brand" routerLink="/home" (click)="linkActivated.emit()">
          <span>ES</span>
          <strong>Platform</strong>
        </a>
        <button
          type="button"
          class="sidebar__close"
          (click)="closeRequested.emit()"
          aria-label="Close navigation"
        >
          ✕
        </button>
      </div>

      <p class="sidebar__label">Merchant workspace</p>

      <nav>
        @for (item of navItems(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/home' }"
          >
            <!-- <span aria-hidden="true">{{ item.icon }}</span> -->
            <span class="material-symbols-outlined">{{ item.icon }}</span>
            <b>{{ item.label }}</b>
            @if (item.badge) {
              <em>{{ item.badge }}</em>
            }
          </a>
        }
      </nav>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        background:
          linear-gradient(180deg, rgba(6, 26, 64, 0.98), rgba(6, 26, 64, 0.94)),
          var(--es-color-neutral-900);
        color: white;
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 1.25rem;
      }

      .sidebar__head {
        align-items: center;
        display: flex;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }

      .brand {
        align-items: center;
        color: white;
        display: inline-flex;
        gap: 0.625rem;
        text-decoration: none;
      }

      .brand span {
        align-items: center;
        background: var(--es-gradient-brand);
        border-radius: 12px;
        display: inline-flex;
        font-weight: 800;
        height: 2.6rem;
        justify-content: center;
        width: 2.6rem;
      }

      .brand strong {
        font-size: 1.05rem;
      }

      .sidebar__close {
        background: transparent;
        border: 0;
        border-radius: var(--es-radius-sm);
        color: white;
        cursor: pointer;
        display: none;
        font-size: 1.25rem;
        height: 2.5rem;
        line-height: 1;
        width: 2.5rem;
      }

      .sidebar__close:hover,
      .sidebar__close:focus-visible {
        background: rgba(255, 255, 255, 0.11);
      }

      .sidebar__label {
        color: rgba(255, 255, 255, 0.58);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin: 0 0 0.8rem;
        text-transform: uppercase;
      }

      nav {
        display: grid;
        gap: 0.25rem;
      }

      nav a {
        align-items: center;
        border: 1px solid transparent;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.78);
        display: flex;
        gap: 0.875rem;
        min-height: 2.75rem;
        padding: 0 0.875rem;
        text-decoration: none;
      }

      nav a.active,
      nav a:hover {
        background: rgba(255, 255, 255, 0.11);
        border-color: rgba(255, 255, 255, 0.08);
        color: white;
      }
      nav a .nav-icon {
        flex-shrink: 0;
        font-size: 1.25rem;
      }

      b {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      em {
        background: var(--es-color-accent);
        border-radius: 999px;
        font-size: 0.75rem;
        font-style: normal;
        padding: 0.125rem 0.4rem;
      }

      // Below the drawer breakpoint, show the close button (drawer mode).
      @media (max-width: 860px) {
        .sidebar__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly tenant = inject(TenantContextService);
  readonly navItems = computed(() => this.tenant.visibleNavigation());

  readonly closeRequested = output<void>();
  readonly linkActivated = output<void>();
}
