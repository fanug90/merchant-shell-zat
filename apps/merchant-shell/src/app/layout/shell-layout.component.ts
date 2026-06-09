import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

@Component({
  selector: 'es-shell-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="shell">
      <es-sidebar />
      <div class="shell__main">
        <es-topbar />
        <main class="shell__content" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-columns: 18rem minmax(0, 1fr);
        min-height: 100vh;
      }

      .shell__main {
        background: var(--es-gradient-page);
        min-width: 0;
      }

      .shell__content {
        margin: 0 auto;
        max-width: 78rem;
        padding: 1.5rem;
      }

      @media (max-width: 860px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .shell__content {
          padding: 1rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayoutComponent {}
