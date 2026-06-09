import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EsKpiCardComponent, EsPageHeaderComponent } from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-home',
  standalone: true,
  imports: [EsKpiCardComponent, EsPageHeaderComponent],
  template: `
    <es-page-header
      title="Dashboard"
      [subtitle]="'Workspace for ' + tenant.currentMerchant().businessName"
    />

    <section class="kpis">
      <es-kpi-card label="Merchant status" [value]="tenant.currentMerchant().status" />
      <es-kpi-card label="KYC status" [value]="tenant.currentMerchant().kycStatus" />
      <es-kpi-card label="Active plugins" [value]="activePluginCount()" trend="Loaded from workspace manifest" />
    </section>
  `,
  styles: [
    `
      .kpis {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      @media (max-width: 760px) {
        .kpis {
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
