import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const roleGuard = (requiredRoles: string[]): CanActivateFn => {
  return () => {
    const tenant = inject(TenantContextService);
    const router = inject(Router);

    if (requiredRoles.some((role) => tenant.hasRole(role))) {
      return true;
    }

    return router.createUrlTree(['/home']);
  };
};

export const kycGuard: CanActivateFn = () => {
  const tenant = inject(TenantContextService);
  const router = inject(Router);

  if (tenant.currentMerchant().kycStatus === 'APPROVED') {
    return true;
  }

  return router.createUrlTree(['/settings']);
};
