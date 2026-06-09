import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EsCardComponent, EsPageHeaderComponent, EsStatusBadgeComponent } from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-settings',
  standalone: true,
  imports: [EsCardComponent, EsPageHeaderComponent, EsStatusBadgeComponent],
  template: `
    <es-page-header title="Settings" subtitle="Merchant profile and basic configuration." />
    <es-card title="Merchant profile">
      <dl>
        <div><dt>Business</dt><dd>{{ tenant.currentMerchant().businessName }}</dd></div>
        <div><dt>Merchant ID</dt><dd>{{ tenant.currentMerchant().id }}</dd></div>
        <div><dt>Currency</dt><dd>{{ tenant.currentMerchant().currency }}</dd></div>
        <div><dt>KYC</dt><dd><es-status-badge [label]="tenant.currentMerchant().kycStatus" tone="success" /></dd></div>
      </dl>
    </es-card>
  `,
  styles: [
    `
      dl {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0;
      }

      dt {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-weight: 800;
      }

      dd {
        color: var(--es-color-neutral-900);
        font-weight: 650;
        margin: 0.25rem 0 0;
      }

      @media (max-width: 640px) {
        dl {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  readonly tenant = inject(TenantContextService);
}
