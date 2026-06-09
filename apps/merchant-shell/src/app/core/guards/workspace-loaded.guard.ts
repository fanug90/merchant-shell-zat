import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { WorkspaceService } from '../../workspace/workspace.service';

export const workspaceLoadedGuard: CanActivateChildFn = async () => {
  const loaded = await inject(WorkspaceService).load();
  return loaded ? true : inject(Router).createUrlTree(['/workspace-error']);
};
