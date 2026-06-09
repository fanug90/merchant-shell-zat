import { Route } from '@angular/router';
import { authGuard, roleGuard } from '@zat-main-web/auth';
import { PluginHostComponent } from '@zat-main-web/plugin-runtime';
import { pluginActiveGuard } from './core/guards/plugin-active.guard';
import { workspaceLoadedGuard } from './core/guards/workspace-loaded.guard';
import { ShellLayoutComponent } from './layout/shell-layout.component';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'callback',
    loadComponent: () =>
      import('./core/auth/callback.component').then((module) => module.CallbackComponent),
  },
  {
    path: 'workspace-error',
    loadComponent: () =>
      import('./core/errors/workspace-error.component').then(
        (module) => module.WorkspaceErrorComponent
      ),
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./core/errors/maintenance.component').then((module) => module.MaintenanceComponent),
  },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [workspaceLoadedGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.component').then((module) => module.HomeComponent),
      },
      {
        path: 'transactions',
        canActivate: [roleGuard(['MERCHANT_ADMIN', 'MERCHANT_USER'])],
        loadComponent: () =>
          import('./features/transactions/transactions.component').then(
            (module) => module.TransactionsComponent
          ),
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['MERCHANT_ADMIN'])],
        loadComponent: () =>
          import('./features/reports/reports.component').then(
            (module) => module.ReportsComponent
          ),
      },
      {
        path: 'settings',
        canActivate: [roleGuard(['MERCHANT_ADMIN'])],
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (module) => module.SettingsComponent
          ),
      },
      {
        path: 'plugins',
        canActivate: [roleGuard(['MERCHANT_ADMIN'])],
        loadComponent: () =>
          import('./features/plugins/marketplace/marketplace.component').then(
            (module) => module.MarketplaceComponent
          ),
      },
      {
        path: 'plugins/:pluginKey',
        canActivate: [pluginActiveGuard],
        component: PluginHostComponent,
      },
      {
        path: 'developer',
        canActivate: [roleGuard(['DEVELOPER'])],
        loadComponent: () =>
          import('./core/errors/not-found.component').then((module) => module.NotFoundComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['PLATFORM_ADMIN'])],
        loadComponent: () =>
          import('./core/errors/not-found.component').then((module) => module.NotFoundComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/errors/not-found.component').then((module) => module.NotFoundComponent),
  },
];
