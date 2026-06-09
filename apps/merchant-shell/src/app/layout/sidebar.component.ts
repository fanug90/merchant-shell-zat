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
        <span>ZAT</span>
        <strong>Merchant</strong>
      </a>

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
        background: var(--es-color-neutral-900);
        color: white;
        min-height: 100vh;
        padding: 1rem;
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
        background: var(--es-color-primary);
        border-radius: var(--es-radius-sm);
        display: inline-flex;
        font-weight: 800;
        height: 2.25rem;
        justify-content: center;
        width: 2.25rem;
      }

      nav {
        display: grid;
        gap: 0.25rem;
      }

      nav a {
        align-items: center;
        border-radius: var(--es-radius-sm);
        color: #d1d5db;
        display: grid;
        gap: 0.625rem;
        grid-template-columns: 1.5rem minmax(0, 1fr) auto;
        min-height: 2.5rem;
        padding: 0 0.75rem;
        text-decoration: none;
      }

      nav a.active,
      nav a:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      b {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      em {
        background: var(--es-color-primary);
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
