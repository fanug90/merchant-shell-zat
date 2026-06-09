import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { EsSpinnerComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-callback',
  standalone: true,
  imports: [EsSpinnerComponent],
  template: `<main class="callback"><es-spinner label="Completing sign-in..." /></main>`,
  styles: [
    `
      .callback {
        display: grid;
        min-height: 100vh;
        place-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallbackComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    void this.completeCallback();
  }

  private async completeCallback(): Promise<void> {
    try {
      const authenticated = await this.auth.completeLoginCallback();
      await this.router.navigate([authenticated ? '/home' : '/login'], { replaceUrl: true });
    } catch {
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
