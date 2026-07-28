import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { WorkspaceResponse } from '@zat-main-web/tenant-context';
import { Observable, of } from 'rxjs';
import { CORE_API_CONFIG, DEFAULT_CORE_API_CONFIG } from './core-api.config';
import { Page } from './page.model';

export interface TransactionSummary {
  id: string;
  createdAt: string;
  customerName: string;
  channel: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  amount: number;
  currency: 'ETB';
}

export interface TransactionQueryParams {
  status?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class CoreApiService {
  private readonly http = inject(HttpClient);
  private readonly config =
    inject(CORE_API_CONFIG, { optional: true }) ?? DEFAULT_CORE_API_CONFIG;

  getWorkspace(): Observable<WorkspaceResponse> {
    if (this.config.useMockWorkspace) {
      return of(MOCK_WORKSPACE);
    }

    return this.http.get<WorkspaceResponse>(this.url('/me/workspace'));
  }

  getTransactions(
    params: TransactionQueryParams = {},
  ): Observable<Page<TransactionSummary>> {
    if (this.config.useMockWorkspace) {
      return of(MOCK_TRANSACTIONS);
    }

    return this.http.get<Page<TransactionSummary>>(
      this.url('/api/core/transactions'),
      {
        params: toHttpParams(params),
      },
    );
  }

  private url(path: string): string {
    const base = this.config.bffBaseUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }
}

function toHttpParams(params: TransactionQueryParams): HttpParams {
  let httpParams = new HttpParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      httpParams = httpParams.set(key, value);
    }
  }

  return httpParams;
}

export const MOCK_WORKSPACE: WorkspaceResponse = {
  user: {
    id: 'u_123',
    displayName: 'Abebe Kebede',
    email: 'abebe@dawits.et',
    roles: ['MERCHANT_ADMIN'],
    locale: 'am',
  },
  merchant: {
    id: 'm_456',
    businessName: "Dawit's Cafe",
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    currency: 'ETB',
  },
  navigation: [
    { label: 'Dashboard', route: '/home', icon: 'home', type: 'CORE' },
    {
      label: 'Transactions',
      route: '/transactions',
      icon: 'receipt',
      type: 'CORE',
    },
    { label: 'Payments', route: '/payments', icon: 'payments', type: 'CORE' },
    {
      label: 'Reports',
      route: '/reports',
      icon: 'bar_chart',
      type: 'CORE',
      roles: ['MERCHANT_ADMIN'],
    },
    { label: 'Settings', route: '/settings', icon: 'settings', type: 'CORE' },
    {
      label: 'Plugins',
      route: '/plugins',
      icon: 'extension',
      type: 'CORE',
      roles: ['MERCHANT_ADMIN'],
    },
  ],
  plugins: [
    {
      pluginKey: 'cafe',
      name: 'Cafe & Restaurant',
      version: '1.2.0',
      minShellVersion: '1.0.0',
      requiredCoreApiVersion: 'v1',
      status: 'ACTIVE',
      frontend: {
        remoteEntry: 'https://cdn.zat.local/plugins/cafe/v1.2.0/remoteEntry.js',
        remoteName: 'cafePlugin',
        exposedModule: './Routes',
      },
      navigation: [
        {
          label: 'Tables',
          route: '/plugins/cafe/tables',
          icon: 'table_restaurant',
          type: 'PLUGIN',
        },
        {
          label: 'Orders',
          route: '/plugins/cafe/orders',
          icon: 'receipt_long',
          type: 'PLUGIN',
        },
      ],
      permissions: ['cafe:tables:read', 'cafe:orders:write'],
    },
    {
      pluginKey: 'retail',
      name: 'Retail & Inventory',
      version: '0.9.0',
      minShellVersion: '1.0.0',
      requiredCoreApiVersion: 'v1',
      status: 'SUSPENDED',
      frontend: {
        remoteEntry:
          'https://cdn.zat.local/plugins/retail/v0.9.0/remoteEntry.js',
        remoteName: 'retailPlugin',
        exposedModule: './Routes',
      },
      navigation: [],
      permissions: ['retail:inventory:read'],
    },
  ],
};

export const MOCK_TRANSACTIONS: Page<TransactionSummary> = {
  content: [
    {
      id: 'txn_1001',
      createdAt: '2026-06-09T08:45:00Z',
      customerName: 'Mekdes Alemu',
      channel: 'QR payment',
      status: 'SUCCESS',
      amount: 1240,
      currency: 'ETB',
    },
    {
      id: 'txn_1002',
      createdAt: '2026-06-09T09:20:00Z',
      customerName: 'Henok Tadesse',
      channel: 'Card',
      status: 'PENDING',
      amount: 680,
      currency: 'ETB',
    },
    {
      id: 'txn_1003',
      createdAt: '2026-06-08T15:12:00Z',
      customerName: 'Selamawit Tesfaye',
      channel: 'Wallet',
      status: 'FAILED',
      amount: 310,
      currency: 'ETB',
    },
  ],
  page: 0,
  size: 10,
  totalElements: 3,
  totalPages: 1,
};
