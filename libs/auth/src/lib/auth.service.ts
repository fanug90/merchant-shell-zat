import { Injectable, computed, inject, signal } from '@angular/core';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { AUTH_CONFIG, DEFAULT_AUTH_CONFIG } from './auth.config';

interface TokenEndpointResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG, { optional: true }) ?? DEFAULT_AUTH_CONFIG;
  private readonly tenant = inject(TenantContextService);
  private readonly tokenSignal = signal<string | null>(null);
  private readonly refreshTokenSignal = signal<string | null>(null);
  private readonly expiresAtSignal = signal<number | null>(null);
  private readonly authenticatedSignal = signal(this.config.devAuthenticated);

  readonly authenticated = this.authenticatedSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly displayName = computed(() => this.tenant.currentUser().displayName);

  isAuthenticated(): boolean {
    return this.authenticatedSignal();
  }

  async getToken(): Promise<string> {
    const token = this.tokenSignal();

    if (token) {
      return token;
    }

    if (this.config.devAuthenticated) {
      return 'dev-shell-token';
    }

    await this.login(true);
    throw new Error('Authentication required.');
  }

  setToken(token: string | null): void {
    this.tokenSignal.set(token);
    this.authenticatedSignal.set(Boolean(token) || this.config.devAuthenticated);
  }

  async login(forceIdentityRedirect = false): Promise<void> {
    if (this.config.keycloakUrl && (forceIdentityRedirect || !this.config.devAuthenticated)) {
      const verifier = randomBase64Url(64);
      const state = crypto.randomUUID();
      const nonce = crypto.randomUUID();
      const challenge = await sha256Base64Url(verifier);
      const redirectUri = this.redirectUri();
      sessionStorage.setItem('es_pkce_verifier', verifier);
      sessionStorage.setItem('es_auth_state', state);
      sessionStorage.setItem('es_auth_nonce', nonce);
      const authUrl =
        `${this.config.keycloakUrl}/realms/${this.config.keycloakRealm}/protocol/openid-connect/auth` +
        `?client_id=${encodeURIComponent(this.config.keycloakClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&response_mode=query&response_type=code&scope=openid+profile+email` +
        `&nonce=${encodeURIComponent(nonce)}` +
        `&code_challenge=${encodeURIComponent(challenge)}` +
        `&code_challenge_method=S256`;
      window.location.assign(authUrl);
      return;
    }

    this.authenticatedSignal.set(true);
  }

  async completeLoginCallback(url = window.location.href): Promise<boolean> {
    const callbackUrl = new URL(url);
    const code = callbackUrl.searchParams.get('code');
    const state = callbackUrl.searchParams.get('state');
    const expectedState = sessionStorage.getItem('es_auth_state');
    const verifier = sessionStorage.getItem('es_pkce_verifier');

    if (!code || !state || !expectedState || state !== expectedState || !verifier) {
      return false;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.keycloakClientId,
      redirect_uri: this.redirectUri(),
      code,
      code_verifier: verifier,
    });

    const response = await fetch(
      `${this.config.keycloakUrl}/realms/${this.config.keycloakRealm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }
    );

    if (!response.ok) {
      this.clearPkceState();
      throw new Error('Keycloak token exchange failed.');
    }

    const tokenResponse = (await response.json()) as TokenEndpointResponse;
    this.tokenSignal.set(tokenResponse.access_token);
    this.refreshTokenSignal.set(tokenResponse.refresh_token ?? null);
    this.expiresAtSignal.set(Date.now() + tokenResponse.expires_in * 1000);
    this.authenticatedSignal.set(true);
    this.clearPkceState();
    return true;
  }

  async logout(): Promise<void> {
    this.tokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.expiresAtSignal.set(null);
    this.authenticatedSignal.set(false);
    this.tenant.reset();
  }

  hasRole(role: string): boolean {
    return this.tenant.hasRole(role);
  }

  hasScope(scope: string): boolean {
    return this.tenant.hasScope(scope);
  }

  private redirectUri(): string {
    const origin =
      window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//localhost:${window.location.port}`
        : window.location.origin;
    return `${origin}${this.config.callbackPath}`;
  }

  private clearPkceState(): void {
    sessionStorage.removeItem('es_pkce_verifier');
    sessionStorage.removeItem('es_auth_state');
    sessionStorage.removeItem('es_auth_nonce');
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
