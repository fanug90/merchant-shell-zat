import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AUTH_CONFIG } from '@zat-main-web/auth';
import {
  CORE_API_CONFIG,
  authTokenInterceptor,
  correlationIdInterceptor,
  errorInterceptor,
} from '@zat-main-web/core-api';
import { SHELL_VERSION } from '@zat-main-web/plugin-runtime';
import { environment } from '../environments/environment';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([correlationIdInterceptor, authTokenInterceptor, errorInterceptor])
    ),
    {
      provide: AUTH_CONFIG,
      useValue: {
        keycloakUrl: environment.auth.keycloakUrl,
        keycloakRealm: environment.auth.keycloakRealm,
        keycloakClientId: environment.auth.keycloakClientId,
        loginPath: '/login',
        callbackPath: '/callback',
        devAuthenticated: environment.auth.devAuthenticated,
      },
    },
    {
      provide: CORE_API_CONFIG,
      useValue: {
        bffBaseUrl: environment.bffBaseUrl,
        merchantServiceBaseUrl: environment.merchantServiceBaseUrl,
        coreApiVersion: environment.coreApiVersion,
        useMockWorkspace: environment.useMockWorkspace,
      },
    },
    { provide: SHELL_VERSION, useValue: environment.shellVersion },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
