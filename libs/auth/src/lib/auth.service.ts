import { Injectable, computed, inject, signal } from '@angular/core';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { AUTH_CONFIG, DEFAULT_AUTH_CONFIG } from './auth.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG, { optional: true }) ?? DEFAULT_AUTH_CONFIG;
  private readonly tenant = inject(TenantContextService);
  private readonly tokenSignal = signal<string | null>(null);
  private readonly authenticatedSignal = signal(this.config.devAuthenticated);

  readonly authenticated = this.authenticatedSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly displayName = computed(() => this.tenant.currentUser().displayName);

  isAuthenticated(): boolean {
    return this.authenticatedSignal();
  }

  async getToken(): Promise<string> {
    return this.tokenSignal() ?? 'dev-shell-token';
  }

  setToken(token: string | null): void {
    this.tokenSignal.set(token);
    this.authenticatedSignal.set(Boolean(token) || this.config.devAuthenticated);
  }

  async login(): Promise<void> {
    if (this.config.keycloakUrl && !this.config.devAuthenticated) {
      const redirectUri = encodeURIComponent(`${window.location.origin}${this.config.callbackPath}`);
      const authUrl =
        `${this.config.keycloakUrl}/realms/${this.config.keycloakRealm}/protocol/openid-connect/auth` +
        `?client_id=${encodeURIComponent(this.config.keycloakClientId)}` +
        `&redirect_uri=${redirectUri}&response_type=code&scope=openid`;
      window.location.assign(authUrl);
      return;
    }

    this.authenticatedSignal.set(true);
  }

  async logout(): Promise<void> {
    this.tokenSignal.set(null);
    this.authenticatedSignal.set(false);
    this.tenant.reset();
  }

  hasRole(role: string): boolean {
    return this.tenant.hasRole(role);
  }

  hasScope(scope: string): boolean {
    return this.tenant.hasScope(scope);
  }
}
