import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantContextService } from '@zat-main-web/tenant-context';

export const pluginActiveGuard: CanActivateFn = (route) => {
  const tenant = inject(TenantContextService);
  const router = inject(Router);
  const pluginKey = route.paramMap.get('pluginKey');
  const manifest = tenant.pluginByKey(pluginKey);

  if (!manifest || ['ACTIVE', 'SUSPENDED', 'INCOMPATIBLE'].includes(manifest.status)) {
    return true;
  }

  return router.createUrlTree(['/plugins']);
};
