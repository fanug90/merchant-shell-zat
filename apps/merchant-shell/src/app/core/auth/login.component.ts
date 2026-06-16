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
      <section class="brand-panel" aria-label="Platform overview">
        <div class="brand-lockup" aria-label="Platform">
          <div class="brand-symbol">ES</div>
          <div>
            <strong>Platform</strong>
            <span>Merchant Operating System</span>
          </div>
        </div>

        <div class="brand-copy">
          <p>Complete Business Operating System</p>
          <h1>One login for every merchant payment flow.</h1>
          <span>
            Accept banks, wallets, cards, and USSD through one QR-ready platform built on Ethiopia's national payment highway.
          </span>
        </div>

        <div class="flow-card" aria-label="Payment flow">
          <div class="flow-step">
            <span aria-hidden="true">▣</span>
            <strong>Customers pay any way</strong>
          </div>
          <b aria-hidden="true">→</b>
          <div class="phone" aria-hidden="true">
            <div class="mini-mark">ES</div>
            <div class="qr-grid">
              @for (cell of qrCells; track $index) {
                <i></i>
              }
            </div>
            <strong>12,500 ETB</strong>
          </div>
          <b aria-hidden="true">→</b>
          <div class="flow-step">
            <span aria-hidden="true">⌁</span>
            <strong>Merchants get everything</strong>
          </div>
        </div>

        <div class="feature-grid">
          <div><span>QR</span><strong>Universal QR</strong></div>
          <div><span>INV</span><strong>Invoices</strong></div>
          <div><span>SUB</span><strong>Subscriptions</strong></div>
          <div><span>ETB</span><strong>Instant loans</strong></div>
        </div>

        <div class="trust-strip">
          <span>EthSwitch IPS</span>
          <span>Banks & wallets</span>
          <span>Compliance ready</span>
        </div>
      </section>

      <section class="choice-panel" aria-label="Merchant access choices">
        <div class="choice-lockup" aria-label="Platform">
          <div class="brand-symbol">ES</div>
          <div>
            <strong>Platform</strong>
            <span>Merchant Operating System</span>
          </div>
        </div>
        <h2>Welcome</h2>
        <p>Choose how you want to access the merchant workspace.</p>
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
        gap: 2rem;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem;
        align-items: center;
      }

      .brand-panel,
      .choice-panel {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(215, 227, 241, 0.9);
        border-radius: 8px;
        box-shadow: 0 24px 70px rgba(6, 26, 64, 0.12);
      }

      .brand-panel {
        display: grid;
        gap: 1.55rem;
        max-width: 47rem;
        min-height: 44rem;
        overflow: hidden;
        padding: 2rem;
        position: relative;
        width: min(54vw, 47rem);
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

      .brand-lockup,
      .choice-lockup {
        align-items: center;
        display: flex;
        gap: 0.8rem;
      }

      .brand-symbol {
        align-items: center;
        background: var(--es-gradient-brand);
        border-radius: 12px;
        color: white;
        display: inline-flex;
        font-size: 0.78rem;
        font-weight: 900;
        height: 2.6rem;
        justify-content: center;
        width: 2.6rem;
      }

      .brand-lockup strong,
      .choice-lockup strong {
        color: #061a40;
        display: block;
        font-size: 1.45rem;
        line-height: 1;
      }

      .brand-lockup span,
      .choice-lockup span {
        color: var(--es-color-accent-dark);
        display: block;
        font-size: 0.62rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        margin-top: 0.25rem;
        text-transform: uppercase;
      }

      .brand-copy p {
        color: var(--es-color-accent-dark);
        font-size: 0.8rem;
        font-weight: 900;
        margin: 0 0 0.7rem;
        text-transform: uppercase;
      }

      .brand-copy h1 {
        color: #061a40;
        font-size: 2.65rem;
        line-height: 1.04;
        margin: 0;
        max-width: 38rem;
      }

      .brand-copy span {
        color: var(--es-color-neutral-600);
        display: block;
        font-size: 1.05rem;
        line-height: 1.6;
        margin-top: 1rem;
        max-width: 37rem;
      }

      .flow-card {
        align-items: center;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid var(--es-color-border);
        border-radius: 8px;
        display: grid;
        gap: 0.85rem;
        grid-template-columns: 1fr auto auto auto 1fr;
        padding: 1.4rem 1.1rem;
      }

      .flow-card > b {
        color: var(--es-color-accent-dark);
        font-size: 1.2rem;
      }

      .flow-step {
        color: #061a40;
        display: grid;
        font-weight: 800;
        gap: 0.7rem;
        justify-items: start;
      }

      .flow-step:last-child {
        justify-items: end;
        text-align: right;
      }

      .flow-step span {
        align-items: center;
        background: var(--es-gradient-brand);
        border-radius: 7px;
        color: white;
        display: inline-flex;
        font-size: 0.8rem;
        height: 2.5rem;
        justify-content: center;
        width: 2.5rem;
      }

      .phone {
        background: white;
        border: 8px solid #0b1423;
        border-radius: 26px;
        display: grid;
        gap: 0.55rem;
        justify-items: center;
        padding: 0.85rem 0.75rem;
        width: 7.6rem;
      }

      .mini-mark {
        color: var(--es-color-accent-dark);
        font-size: 0.72rem;
        font-weight: 900;
      }

      .qr-grid {
        border: 2px solid #0b1423;
        display: grid;
        gap: 0.2rem;
        grid-template-columns: repeat(4, 0.65rem);
        padding: 0.3rem;
      }

      .qr-grid i {
        background: #0b1423;
        height: 0.65rem;
        width: 0.65rem;
      }

      .qr-grid i:nth-child(3n),
      .qr-grid i:nth-child(5),
      .qr-grid i:nth-child(14) {
        background: var(--es-color-accent);
      }

      .phone strong {
        color: #061a40;
        font-size: 0.9rem;
      }

      .feature-grid {
        display: grid;
        gap: 0.7rem;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .feature-grid div {
        background: var(--es-color-neutral-100);
        border: 1px solid var(--es-color-border);
        border-radius: 8px;
        color: #061a40;
        display: grid;
        gap: 0.55rem;
        min-height: 5.1rem;
        padding: 0.85rem;
      }

      .feature-grid span {
        color: var(--es-color-primary-hover);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .feature-grid strong {
        font-size: 0.86rem;
      }

      .trust-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      .trust-strip span {
        background: rgba(0, 168, 121, 0.08);
        border: 1px solid rgba(0, 168, 121, 0.2);
        border-radius: 999px;
        color: var(--es-color-accent-dark);
        font-weight: 800;
        padding: 0.55rem 0.8rem;
      }

      .choice-panel {
        display: grid;
        gap: 1rem;
        justify-items: center;
        max-width: 26rem;
        padding: 2.4rem;
        text-align: center;
        width: min(36vw, 26rem);
      }

      h2 {
        color: #061a40;
        font-size: 1.9rem;
        margin: 0.4rem 0 0;
      }

      .choice-panel p {
        color: var(--es-color-neutral-600);
        line-height: 1.55;
        margin: 0;
      }

      .actions {
        display: grid;
        gap: 1rem;
        max-width: 22rem;
        width: 100%;
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
          font-size: 2.1rem;
        }

        .flow-card {
          grid-template-columns: 1fr;
          justify-items: center;
          text-align: center;
        }

        .flow-step,
        .flow-step:last-child {
          justify-items: center;
          text-align: center;
        }

        .flow-card > b {
          transform: rotate(90deg);
        }

        .feature-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .auth-page {
          padding: 1rem;
        }

        .brand-panel,
        .choice-panel {
          padding: 1.25rem;
        }

        .feature-grid {
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
