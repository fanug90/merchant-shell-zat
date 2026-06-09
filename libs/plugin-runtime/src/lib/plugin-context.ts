import { InjectionToken } from '@angular/core';

export interface PluginContext {
  merchantId: string;
  userId: string;
  roles: string[];
  scopes: string[];
  locale: 'en' | 'am';
  currency: 'ETB';
  apiBasePath: string;
  shellVersion: string;
  pluginKey: string;
}

export const PLUGIN_CONTEXT = new InjectionToken<PluginContext>('PLUGIN_CONTEXT');
export const SHELL_VERSION = new InjectionToken<string>('SHELL_VERSION');
