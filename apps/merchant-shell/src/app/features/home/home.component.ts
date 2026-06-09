import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EsCardComponent, EsKpiCardComponent, EsPageHeaderComponent } from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-home',
  standalone: true,
  imports: [EsCardComponent, EsKpiCardComponent, EsPageHeaderComponent],
  template: `
    <es-page-header
      title="Dashboard"
      [subtitle]="'EthioStripe workspace for ' + tenant.currentMerchant().businessName"
    />

    <section class="hero-panel">
      <div>
        <p>Complete Business Operating System</p>
        <h2>Accept payments, monitor activity, and manage plugins from one secure workspace.</h2>
      </div>
      <div class="flow-card" aria-label="Payment flow">
        <span>Customer pays</span>
        <strong>12,500 ETB</strong>
        <span>Merchant settles</span>
      </div>
    </section>

    <section class="kpis">
      <es-kpi-card label="Merchant status" [value]="tenant.currentMerchant().status" />
      <es-kpi-card label="KYC status" [value]="tenant.currentMerchant().kycStatus" />
      <es-kpi-card label="Active plugins" [value]="activePluginCount()" trend="Loaded from workspace manifest" />
    </section>

    <section class="dashboard-grid">
      <es-card title="Payment readiness" subtitle="Core settlement and compliance indicators.">
        <div class="readiness">
          <div><span>Currency</span><strong>{{ tenant.currentMerchant().currency }}</strong></div>
          <div><span>Merchant ID</span><strong>{{ tenant.currentMerchant().id }}</strong></div>
          <div><span>Role scope</span><strong>{{ tenant.activeRoles().join(', ') }}</strong></div>
        </div>
      </es-card>

      <es-card title="Platform trust" subtitle="Aligned with the Keycloak merchant identity experience.">
        <div class="trust-strip">
          <span>EthSwitch IPS</span>
          <span>Banks & wallets</span>
          <span>Compliance ready</span>
        </div>
      </es-card>
    </section>
  `,
  styles: [
    `
      .hero-panel {
        align-items: center;
        background:
          linear-gradient(120deg, rgba(0, 168, 121, 0.1), transparent 32%),
          linear-gradient(300deg, rgba(75, 34, 168, 0.1), transparent 34%),
          rgba(255, 255, 255, 0.9);
        border: 1px solid var(--es-color-border);
        border-radius: 18px;
        box-shadow: var(--es-shadow-panel);
        display: flex;
        gap: 1.25rem;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding: 1.4rem;
      }

      .hero-panel p {
        color: var(--es-color-accent-dark);
        font-size: 0.75rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        margin: 0 0 0.4rem;
        text-transform: uppercase;
      }

      .hero-panel h2 {
        color: var(--es-color-neutral-900);
        font-size: 1.45rem;
        line-height: 1.25;
        margin: 0;
        max-width: 42rem;
      }

      .flow-card {
        align-items: center;
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: 16px;
        display: grid;
        gap: 0.35rem;
        min-width: 13rem;
        padding: 1rem;
        text-align: center;
      }

      .flow-card strong {
        color: var(--es-color-neutral-900);
        font-size: 1.2rem;
      }

      .flow-card span {
        color: var(--es-color-neutral-600);
        font-size: 0.82rem;
      }

      .kpis {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-bottom: 1rem;
      }

      .dashboard-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1.2fr 0.8fr;
      }

      .readiness {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .readiness div {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        padding: 0.85rem;
      }

      .readiness span {
        color: var(--es-color-neutral-600);
        display: block;
        font-size: 0.78rem;
        margin-bottom: 0.3rem;
      }

      .readiness strong {
        color: var(--es-color-neutral-900);
        overflow-wrap: anywhere;
      }

      .trust-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      .trust-strip span {
        background: rgba(0, 168, 121, 0.08);
        border-radius: 999px;
        color: var(--es-color-accent-dark);
        font-weight: 800;
        padding: 0.55rem 0.8rem;
      }

      @media (max-width: 760px) {
        .hero-panel {
          align-items: stretch;
          flex-direction: column;
        }

        .kpis,
        .dashboard-grid,
        .readiness {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly tenant = inject(TenantContextService);
  readonly activePluginCount = computed(() => String(this.tenant.activePlugins().length));
}
