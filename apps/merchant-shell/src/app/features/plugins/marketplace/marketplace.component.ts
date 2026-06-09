import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EsCardComponent, EsPageHeaderComponent, EsStatusBadgeComponent } from '@zat-main-web/shared-ui';
import { PluginManifest, TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-marketplace',
  standalone: true,
  imports: [RouterLink, EsCardComponent, EsPageHeaderComponent, EsStatusBadgeComponent],
  template: `
    <es-page-header title="Plugins" subtitle="Installed and available merchant workspace plugins." />

    <section class="plugins">
      @for (plugin of tenant.allPlugins(); track plugin.pluginKey) {
        <es-card [title]="plugin.name" [subtitle]="'Version ' + plugin.version">
          <div class="plugin-card">
            <es-status-badge [label]="plugin.status" [tone]="tone(plugin)" />
            <p>Requires shell {{ plugin.minShellVersion }} and core API {{ plugin.requiredCoreApiVersion }}.</p>
            @if (plugin.status === 'ACTIVE') {
              <a [routerLink]="['/plugins', plugin.pluginKey]">Open plugin</a>
            }
          </div>
        </es-card>
      }
    </section>
  `,
  styles: [
    `
      .plugins {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      }

      .plugin-card {
        display: grid;
        gap: 0.875rem;
      }

      p {
        color: var(--es-color-neutral-600);
        margin: 0;
      }

      a {
        color: var(--es-color-primary);
        font-weight: 700;
        text-decoration: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceComponent {
  readonly tenant = inject(TenantContextService);

  tone(plugin: PluginManifest): 'success' | 'warning' | 'danger' | 'neutral' {
    if (plugin.status === 'ACTIVE') {
      return 'success';
    }

    if (plugin.status === 'INCOMPATIBLE') {
      return 'danger';
    }

    return plugin.status === 'AVAILABLE' ? 'neutral' : 'warning';
  }
}
