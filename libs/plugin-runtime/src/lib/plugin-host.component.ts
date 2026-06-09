import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { EsEmptyStateComponent, EsSpinnerComponent } from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryStore } from './plugin-registry.store';
import { PluginLoadState } from './plugin-runtime.types';

@Component({
  selector: 'es-plugin-host',
  standalone: true,
  imports: [RouterOutlet, EsEmptyStateComponent, EsSpinnerComponent],
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="plugin-state"><es-spinner label="Loading plugin..." /></div>
      }
      @case ('active') {
        <router-outlet />
      }
      @case ('not-installed') {
        <es-empty-state icon="extension_off" title="Plugin not installed" description="This plugin is not enabled for the current merchant." />
      }
      @case ('suspended') {
        <es-empty-state icon="pause_circle" title="Plugin suspended" description="This plugin has been suspended. Contact support." />
      }
      @case ('incompatible') {
        <es-empty-state icon="update" title="Plugin version incompatible" description="This plugin requires a newer shell version." />
      }
      @case ('failed') {
        <es-empty-state icon="error" title="Plugin failed to load" [description]="errorMessage()" actionLabel="Retry" (action)="loadPlugin()" />
      }
    }
  `,
  styles: [
    `
      .plugin-state {
        display: grid;
        min-height: 16rem;
        place-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginHostComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loader = inject(PluginLoaderService);
  private readonly registry = inject(PluginRegistryStore);
  private readonly tenant = inject(TenantContextService);

  readonly state = signal<PluginLoadState>('loading');
  readonly errorMessage = signal('The remote plugin could not be loaded. You can retry when the network or plugin deployment is healthy.');

  ngOnInit(): void {
    void this.loadPlugin();
  }

  async loadPlugin(): Promise<void> {
    const pluginKey = this.route.snapshot.paramMap.get('pluginKey');
    this.setState(pluginKey ?? 'unknown', 'loading');

    const manifest = this.tenant.pluginByKey(pluginKey);

    if (!manifest) {
      this.setState(pluginKey ?? 'unknown', 'not-installed');
      return;
    }

    if (manifest.status === 'SUSPENDED') {
      this.setState(manifest.pluginKey, 'suspended');
      return;
    }

    if (!this.loader.checkCompatibility(manifest) || manifest.status === 'INCOMPATIBLE') {
      this.setState(manifest.pluginKey, 'incompatible');
      return;
    }

    try {
      const routes = await this.loader.loadRoutes(manifest);
      this.router.resetConfig([
        ...this.router.config.filter((route) => route.path !== `plugins/${manifest.pluginKey}`),
        { path: `plugins/${manifest.pluginKey}`, children: routes },
      ]);
      this.setState(manifest.pluginKey, 'active');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : this.errorMessage());
      this.setState(manifest.pluginKey, 'failed', this.errorMessage());
    }
  }

  private setState(pluginKey: string, state: PluginLoadState, error?: string): void {
    this.state.set(state);
    this.registry.setState(pluginKey, state, error);
  }
}
