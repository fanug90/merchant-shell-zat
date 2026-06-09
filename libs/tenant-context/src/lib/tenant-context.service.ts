import { Injectable, computed, signal } from '@angular/core';
import {
  EMPTY_MERCHANT,
  EMPTY_WORKSPACE_USER,
  Merchant,
  NavigationItem,
  PluginManifest,
  WorkspaceResponse,
  WorkspaceUser,
} from './workspace.types';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly userSignal = signal<WorkspaceUser | null>(null);
  private readonly merchantSignal = signal<Merchant | null>(null);
  private readonly pluginsSignal = signal<PluginManifest[]>([]);
  private readonly navigationSignal = signal<NavigationItem[]>([]);
  private readonly loadedSignal = signal(false);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly currentUser = computed(() => this.userSignal() ?? EMPTY_WORKSPACE_USER);
  readonly currentMerchant = computed(() => this.merchantSignal() ?? EMPTY_MERCHANT);
  readonly activeRoles = computed(() => this.currentUser().roles);
  readonly activePlugins = computed(() =>
    this.pluginsSignal().filter((plugin) => plugin.status === 'ACTIVE')
  );
  readonly allPlugins = this.pluginsSignal.asReadonly();
  readonly navigation = this.navigationSignal.asReadonly();
  readonly isLoaded = this.loadedSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  hasRole(role: string): boolean {
    return this.activeRoles().includes(role);
  }

  hasAnyRole(roles: string[] | undefined): boolean {
    return !roles?.length || roles.some((role) => this.hasRole(role));
  }

  hasScope(scope: string): boolean {
    return this.activePlugins().some((plugin) => plugin.permissions.includes(scope));
  }

  isPluginActive(pluginKey: string): boolean {
    return this.pluginByKey(pluginKey)?.status === 'ACTIVE';
  }

  pluginByKey(pluginKey: string | null | undefined): PluginManifest | undefined {
    if (!pluginKey) {
      return undefined;
    }

    return this.pluginsSignal().find((plugin) => plugin.pluginKey === pluginKey);
  }

  visibleNavigation(): NavigationItem[] {
    const coreItems = this.navigationSignal().filter((item) =>
      this.hasAnyRole(item.roles)
    );
    const pluginItems = this.activePlugins().flatMap((plugin) =>
      plugin.navigation.filter((item) => this.hasAnyRole(item.roles))
    );

    return [...coreItems, ...pluginItems];
  }

  startLoading(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
  }

  load(workspace: WorkspaceResponse): void {
    this.userSignal.set(workspace.user);
    this.merchantSignal.set(workspace.merchant);
    this.pluginsSignal.set(workspace.plugins);
    this.navigationSignal.set(workspace.navigation);
    this.loadedSignal.set(true);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }

  setPlugins(plugins: PluginManifest[]): void {
    this.pluginsSignal.set(plugins);
  }

  setError(message: string): void {
    this.errorSignal.set(message);
    this.loadedSignal.set(false);
    this.loadingSignal.set(false);
  }

  reset(): void {
    this.userSignal.set(null);
    this.merchantSignal.set(null);
    this.pluginsSignal.set([]);
    this.navigationSignal.set([]);
    this.loadedSignal.set(false);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
