import { Injectable, inject } from '@angular/core';
import { CoreApiService } from '@zat-main-web/core-api';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly api = inject(CoreApiService);
  private readonly tenant = inject(TenantContextService);

  async load(): Promise<boolean> {
    if (this.tenant.isLoaded()) {
      return true;
    }

    this.tenant.startLoading();

    try {
      const workspace = await firstValueFrom(this.api.getWorkspace());
      this.tenant.load(workspace);
      document.documentElement.lang = workspace.user.locale;
      document.documentElement.dir = 'ltr';
      return true;
    } catch {
      this.tenant.setError('Workspace is unavailable. Retry or contact support if this continues.');
      return false;
    }
  }
}
