import { Injectable, inject } from '@angular/core';
import { Routes } from '@angular/router';
import { PluginManifest } from '@zat-main-web/tenant-context';
import { SHELL_VERSION } from './plugin-context';
import { PluginLoadError } from './plugin-runtime.types';

@Injectable({ providedIn: 'root' })
export class PluginLoaderService {
  private readonly shellVersion = inject(SHELL_VERSION, { optional: true }) ?? '1.0.0';
  private readonly loadedRemotes = new Set<string>();

  async loadRoutes(manifest: PluginManifest): Promise<Routes> {
    this.assertTrustedRemote(manifest);

    try {
      await this.loadRemoteEntry(manifest);
      const container = remoteContainer(manifest.frontend.remoteName);
      const factory = await container.get(manifest.frontend.exposedModule);
      const module = factory();
      const routes = module.default ?? module.routes;

      if (!Array.isArray(routes)) {
        throw new Error('Remote did not expose a Routes array');
      }

      this.loadedRemotes.add(manifest.pluginKey);
      return routes;
    } catch (error) {
      throw new PluginLoadError(
        error instanceof Error ? error.message : 'Unknown plugin load error',
        manifest.pluginKey
      );
    }
  }

  checkCompatibility(manifest: PluginManifest): boolean {
    return compareVersions(this.shellVersion, manifest.minShellVersion) >= 0;
  }

  isLoaded(pluginKey: string): boolean {
    return this.loadedRemotes.has(pluginKey);
  }

  private assertTrustedRemote(manifest: PluginManifest): void {
    const url = new URL(manifest.frontend.remoteEntry);

    if (url.hostname !== 'cdn.zat.local') {
      throw new PluginLoadError(
        `Untrusted plugin remote host: ${url.hostname}`,
        manifest.pluginKey
      );
    }
  }

  private loadRemoteEntry(manifest: PluginManifest): Promise<void> {
    if (remoteContainer(manifest.frontend.remoteName, false)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[data-plugin-key="${manifest.pluginKey}"]`
      );

      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = manifest.frontend.remoteEntry;
      script.type = 'text/javascript';
      script.async = true;
      script.dataset['pluginKey'] = manifest.pluginKey;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new PluginLoadError(`Failed to load ${manifest.frontend.remoteEntry}`, manifest.pluginKey));
      document.head.appendChild(script);
    });
  }
}

interface FederationContainer {
  get(module: string): Promise<() => { default?: Routes; routes?: Routes }>;
}

function remoteContainer(remoteName: string, required?: true): FederationContainer;
function remoteContainer(remoteName: string, required: false): FederationContainer | undefined;
function remoteContainer(remoteName: string, required = true): FederationContainer | undefined {
  const container = (window as unknown as Record<string, FederationContainer | undefined>)[remoteName];

  if (!container && required) {
    throw new Error(`Remote container ${remoteName} is not available`);
  }

  return container;
}

function compareVersions(current: string, required: string): number {
  const left = current.split('.').map((part) => Number(part));
  const right = required.split('.').map((part) => Number(part));
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;

    if (a > b) {
      return 1;
    }

    if (a < b) {
      return -1;
    }
  }

  return 0;
}
