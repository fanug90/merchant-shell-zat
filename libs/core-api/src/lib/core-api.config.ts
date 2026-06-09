import { InjectionToken } from '@angular/core';

export interface CoreApiConfig {
  bffBaseUrl: string;
  merchantServiceBaseUrl: string;
  coreApiVersion: string;
  useMockWorkspace: boolean;
}

export const CORE_API_CONFIG = new InjectionToken<CoreApiConfig>('CORE_API_CONFIG');

export const DEFAULT_CORE_API_CONFIG: CoreApiConfig = {
  bffBaseUrl: '',
  merchantServiceBaseUrl: 'http://62.171.137.149:8082',
  coreApiVersion: 'v1',
  useMockWorkspace: true,
};
