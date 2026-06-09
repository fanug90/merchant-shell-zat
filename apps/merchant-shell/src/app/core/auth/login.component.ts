import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { EsButtonComponent, EsCardComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-login',
  standalone: true,
  imports: [EsButtonComponent, EsCardComponent],
  template: `
    <main class="auth-page">
      <es-card title="Merchant workspace" subtitle="Sign in to continue to your ZAT workspace.">
        <es-button (click)="login()">Continue with Keycloak</es-button>
      </es-card>
    </main>
  `,
  styles: [
    `
      .auth-page {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async login(): Promise<void> {
    await this.auth.login();
    await this.router.navigate(['/home']);
  }
}
