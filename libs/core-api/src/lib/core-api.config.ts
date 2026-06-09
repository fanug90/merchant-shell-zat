import { InjectionToken } from '@angular/core';

export interface CoreApiConfig {
  bffBaseUrl: string;
  coreApiVersion: string;
  useMockWorkspace: boolean;
}

export const CORE_API_CONFIG = new InjectionToken<CoreApiConfig>('CORE_API_CONFIG');

export const DEFAULT_CORE_API_CONFIG: CoreApiConfig = {
  bffBaseUrl: '',
  coreApiVersion: 'v1',
  useMockWorkspace: true,
};
