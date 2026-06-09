import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { EsButtonComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-login',
  standalone: true,
  imports: [RouterLink, EsButtonComponent],
  template: `
    <main class="auth-page">
      <section class="brand-panel" aria-label="EthioStripe platform overview">
        <div class="brand-mark" aria-label="EthioStripe">EthioStripe</div>
        <div class="brand-copy">
          <p>Complete Business Operating System</p>
          <h1>One workspace for every merchant payment flow.</h1>
          <span>
            Accept banks, wallets, cards, and QR payments through one merchant platform built for Ethiopia.
          </span>
        </div>
        <div class="flow-card" aria-label="Payment flow">
          <div class="flow-step">
            <span aria-hidden="true">QR</span>
            Customers pay any way
          </div>
          <div class="phone" aria-hidden="true">
            <div class="qr-grid">
              @for (cell of qrCells; track $index) {
                <i></i>
              }
            </div>
            <strong>12,500 ETB</strong>
          </div>
          <div class="flow-step">
            <span aria-hidden="true">ETB</span>
            Merchants get everything
          </div>
        </div>
        <div class="trust-strip">
          <span>EthSwitch IPS</span>
          <span>Banks & wallets</span>
          <span>Compliance ready</span>
        </div>
      </section>

      <section class="choice-panel" aria-label="Merchant access choices">
        <div class="logo">EthioStripe</div>
        <h2>Welcome</h2>
        <p>Sign in if your account already exists, or create a merchant account to begin onboarding.</p>
        <div class="actions">
          <es-button (click)="login()">Sign in</es-button>
          <a class="create-link" routerLink="/onboarding">Create an account</a>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .auth-page {
        align-items: center;
        background:
          radial-gradient(circle at 12% 12%, rgba(0, 168, 121, 0.14), transparent 28%),
          radial-gradient(circle at 82% 16%, rgba(21, 89, 209, 0.12), transparent 28%),
          linear-gradient(135deg, #f8fbff 0%, #eef8f4 48%, #f7f4ff 100%);
        color: var(--es-color-neutral-900);
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem;
      }

      .brand-panel,
      .choice-panel {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(215, 227, 241, 0.9);
        border-radius: 28px;
        box-shadow: 0 24px 70px rgba(6, 26, 64, 0.12);
      }

      .brand-panel {
        display: grid;
        gap: 1.4rem;
        max-width: 44rem;
        min-height: 40rem;
        overflow: hidden;
        padding: 2rem;
        position: relative;
        width: min(58vw, 44rem);
      }

      .brand-panel::before {
        background:
          linear-gradient(120deg, rgba(0, 168, 121, 0.1), transparent 32%),
          linear-gradient(300deg, rgba(75, 34, 168, 0.1), transparent 34%);
        content: '';
        inset: 0;
        position: absolute;
      }

      .brand-panel > * {
        position: relative;
      }

      .brand-mark,
      .logo {
        color: var(--es-color-accent-dark);
        font-size: 1.35rem;
        font-weight: 900;
      }

      .brand-copy p {
        color: var(--es-color-accent-dark);
        font-size: 0.8rem;
        font-weight: 900;
        margin: 0 0 0.75rem;
        text-transform: uppercase;
      }

      .brand-copy h1 {
        color: #061a40;
        font-size: 2.6rem;
        line-height: 1.05;
        margin: 0;
        max-width: 36rem;
      }

      .brand-copy span {
        color: var(--es-color-neutral-600);
        display: block;
        font-size: 1.05rem;
        line-height: 1.6;
        margin-top: 1rem;
        max-width: 34rem;
      }

      .flow-card {
        align-items: center;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid var(--es-color-border);
        border-radius: 22px;
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr auto 1fr;
        margin-top: 0.75rem;
        padding: 1.25rem;
      }

      .flow-step {
        color: #061a40;
        display: grid;
        font-weight: 800;
        gap: 0.7rem;
        justify-items: center;
        text-align: center;
      }

      .flow-step span {
        align-items: center;
        background: linear-gradient(135deg, var(--es-color-accent), #1559d1);
        border-radius: 999px;
        color: white;
        display: inline-flex;
        font-size: 0.72rem;
        height: 2.75rem;
        justify-content: center;
        width: 2.75rem;
      }

      .phone {
        background: white;
        border: 8px solid #0b1423;
        border-radius: 26px;
        display: grid;
        gap: 0.7rem;
        justify-items: center;
        padding: 1rem 0.75rem;
        width: 8rem;
      }

      .qr-grid {
        border: 2px solid #0b1423;
        display: grid;
        gap: 0.2rem;
        grid-template-columns: repeat(4, 0.7rem);
        padding: 0.3rem;
      }

      .qr-grid i {
        background: #0b1423;
        height: 0.7rem;
        width: 0.7rem;
      }

      .qr-grid i:nth-child(3n),
      .qr-grid i:nth-child(5),
      .qr-grid i:nth-child(14) {
        background: var(--es-color-accent);
      }

      .phone strong {
        color: #061a40;
        font-size: 0.95rem;
      }

      .trust-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .trust-strip span {
        background: rgba(0, 168, 121, 0.08);
        border-radius: 999px;
        color: var(--es-color-accent-dark);
        font-weight: 800;
        padding: 0.55rem 0.8rem;
      }

      .choice-panel {
        display: grid;
        gap: 1rem;
        max-width: 27rem;
        padding: 2.4rem;
        width: min(38vw, 27rem);
      }

      h2 {
        color: #061a40;
        font-size: 1.9rem;
        margin: 0;
        text-align: center;
      }

      .choice-panel p {
        color: var(--es-color-neutral-600);
        line-height: 1.55;
        margin: 0;
        text-align: center;
      }

      .actions {
        display: grid;
        gap: 1rem;
      }

      .create-link {
        align-items: center;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-primary);
        display: inline-flex;
        font-weight: 700;
        justify-content: center;
        min-height: 2.75rem;
        text-decoration: none;
      }

      @media (max-width: 920px) {
        .auth-page {
          align-items: stretch;
          flex-direction: column;
        }

        .brand-panel,
        .choice-panel {
          min-height: auto;
          width: 100%;
        }

        .brand-copy h1 {
          font-size: 2rem;
        }
      }

      @media (max-width: 640px) {
        .auth-page {
          padding: 1rem;
        }

        .flow-card {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  readonly qrCells = Array.from({ length: 16 });

  async login(): Promise<void> {
    await this.auth.login(true);
  }
}
