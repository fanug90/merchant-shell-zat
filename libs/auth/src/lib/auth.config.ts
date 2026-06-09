import { InjectionToken } from '@angular/core';

export interface AuthConfig {
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  loginPath: string;
  callbackPath: string;
  devAuthenticated: boolean;
}

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG');

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  keycloakUrl: '',
  keycloakRealm: '',
  keycloakClientId: '',
  loginPath: '/login',
  callbackPath: '/callback',
  devAuthenticated: true,
};
