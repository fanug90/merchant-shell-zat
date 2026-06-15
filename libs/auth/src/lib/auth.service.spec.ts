import { TestBed } from '@angular/core/testing';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { AUTH_CONFIG, AuthConfig } from './auth.config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const authConfig: AuthConfig = {
    keycloakUrl: 'https://identity.trucksload.com',
    keycloakRealm: 'merchant-os',
    keycloakClientId: 'merchant-shell',
    loginPath: '/login',
    callbackPath: '/callback',
    devAuthenticated: false,
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: AUTH_CONFIG, useValue: authConfig },
      ],
    });
  });

  it('starts unauthenticated when dev auth is disabled', () => {
    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(false);
  });

  it('exchanges a valid Keycloak callback code for memory-only tokens', async () => {
    sessionStorage.setItem('es_auth_state', 'state-123');
    sessionStorage.setItem('es_pkce_verifier', 'verifier-123');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 300,
      }),
    } as Response);
    const service = TestBed.inject(AuthService);

    const result = await service.completeLoginCallback(
      'http://localhost:4200/callback?code=code-123&state=state-123'
    );

    expect(result).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    await expect(service.getToken()).resolves.toBe('access-token');
    expect(sessionStorage.getItem('es_pkce_verifier')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://identity.trucksload.com/realms/merchant-os/protocol/openid-connect/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(URLSearchParams),
      })
    );

    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('merchant-shell');
    expect(body.get('code')).toBe('code-123');
    expect(body.get('code_verifier')).toBe('verifier-123');
    expect(body.get('redirect_uri')).toBe(`${window.location.origin}/callback`);
  });

  it('rejects callback completion when state validation fails', async () => {
    sessionStorage.setItem('es_auth_state', 'expected-state');
    sessionStorage.setItem('es_pkce_verifier', 'verifier-123');
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const service = TestBed.inject(AuthService);

    const result = await service.completeLoginCallback(
      'http://localhost:4200/callback?code=code-123&state=wrong-state'
    );

    expect(result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
