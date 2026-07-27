import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { catchError, from, switchMap, throwError } from 'rxjs';
import {
  CORE_API_CONFIG,
  CoreApiConfig,
  DEFAULT_CORE_API_CONFIG,
} from './core-api.config';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const config =
    inject(CORE_API_CONFIG, { optional: true }) ?? DEFAULT_CORE_API_CONFIG;
  const isBffRequest = isBffUrl(req.url, config);

  if (!isBffRequest) {
    return next(req);
  }

  return from(auth.getToken()).pipe(
    switchMap((token) =>
      next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        }),
      ),
    ),
  );
};

export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return next(
    req.clone({
      setHeaders: {
        'X-Correlation-ID': id,
        'X-Core-API-Version':
          inject(CORE_API_CONFIG, { optional: true })?.coreApiVersion ?? 'v1',
      },
    }),
  );
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        void auth.login();
      }

      if (error.status === 503) {
        void router.navigate(['/maintenance']);
      }

      return throwError(() => error);
    }),
  );
};

function isBffUrl(url: string, config: CoreApiConfig): boolean {
  if (config.bffBaseUrl && url.startsWith(config.bffBaseUrl)) {
    return true;
  }

  if (url.startsWith(config.paymentServiceBaseUrl)) {
    return true;
  }

  return url.startsWith('/api/') || url.startsWith('/me/');
}
