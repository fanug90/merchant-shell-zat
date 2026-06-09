import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" aria-label="Workspace navigation">
      <a class="brand" routerLink="/home">
        <span>ES</span>
        <strong>EthioStripe</strong>
      </a>

      <p class="sidebar__label">Merchant workspace</p>

      <nav>
        @for (item of navItems(); track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.route === '/home' }">
            <span aria-hidden="true">{{ item.icon }}</span>
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
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        color: white;
        min-height: 100vh;
        padding: 1.25rem;
      }

      .brand {
        align-items: center;
        color: white;
        display: inline-flex;
        gap: 0.625rem;
        margin-bottom: 1.5rem;
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
        display: grid;
        gap: 0.625rem;
        grid-template-columns: 1.5rem minmax(0, 1fr) auto;
        min-height: 2.5rem;
        padding: 0 0.75rem;
        text-decoration: none;
      }

      nav a.active,
      nav a:hover {
        background: rgba(255, 255, 255, 0.11);
        border-color: rgba(255, 255, 255, 0.08);
        color: white;
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

      @media (max-width: 860px) {
        .sidebar {
          min-height: auto;
        }

        nav {
          grid-auto-flow: column;
          overflow-x: auto;
        }

        nav a {
          min-width: max-content;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly tenant = inject(TenantContextService);
  readonly navItems = computed(() => this.tenant.visibleNavigation());
}
