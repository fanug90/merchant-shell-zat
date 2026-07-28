import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { filter } from 'rxjs';

@Component({
  selector: 'es-shell-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="shell" [class.shell--nav-open]="sidebarOpen()">
      <div
        class="shell__backdrop"
        [class.shell__backdrop--visible]="sidebarOpen()"
        (click)="closeSidebar()"
      ></div>

      <div class="shell__sidebar" [class.shell__sidebar--open]="sidebarOpen()">
        <es-sidebar
          (closeRequested)="closeSidebar()"
          (linkActivated)="closeSidebar()"
        />
      </div>

      <div class="shell__main">
        <es-topbar (menuToggle)="toggleSidebar()" />
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
        position: relative;
      }

      .shell__sidebar {
        min-width: 0;
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

      .shell__backdrop {
        display: none;
      }
      @media (min-width: 861px) {
        .shell__sidebar {
          height: 100vh;
          overflow-y: auto;
          position: sticky;
          top: 0;
        }
      }

      @media (max-width: 860px) {
        .shell {
          display: block;
        }

        .shell__sidebar {
          bottom: 0;
          left: 0;
          position: fixed;
          top: 0;
          transform: translateX(-100%);
          transition: transform 220ms ease;
          width: min(20rem, 85vw);
          z-index: 40;
        }

        .shell__sidebar--open {
          transform: translateX(0);
        }

        .shell__backdrop {
          background: rgba(6, 26, 64, 0.45);
          display: block;
          inset: 0;
          opacity: 0;
          pointer-events: none;
          position: fixed;
          transition: opacity 220ms ease;
          z-index: 30;
        }

        .shell__backdrop--visible {
          opacity: 1;
          pointer-events: auto;
        }

        .shell__content {
          padding: 1rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayoutComponent {
  readonly sidebarOpen = signal(false);

  constructor(router: Router) {
    // Close the drawer automatically on any navigation (covers back/forward too).
    router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => {
        this.sidebarOpen.set(false);
      });
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
