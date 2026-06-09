export type UserRole =
  | 'MERCHANT_ADMIN'
  | 'MERCHANT_USER'
  | 'DEVELOPER'
  | 'PLATFORM_ADMIN'
  | string;

export type MerchantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type KycStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED';
export type LocaleCode = 'en' | 'am';
export type CurrencyCode = 'ETB';
export type NavigationType = 'CORE' | 'PLUGIN';
export type PluginStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'INSTALLING'
  | 'UPDATE_AVAILABLE'
  | 'AVAILABLE'
  | 'INACTIVE'
  | 'INCOMPATIBLE';

export interface WorkspaceUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  roles: UserRole[];
  locale: LocaleCode;
}

export interface Merchant {
  id: string;
  businessName: string;
  status: MerchantStatus;
  kycStatus: KycStatus;
  currency: CurrencyCode;
  logoUrl?: string;
}

export interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  type: NavigationType;
  roles?: UserRole[];
  badge?: string;
}

export interface PluginManifest {
  pluginKey: string;
  name: string;
  version: string;
  minShellVersion: string;
  requiredCoreApiVersion: string;
  status: PluginStatus;
  frontend: {
    remoteEntry: string;
    remoteName: string;
    exposedModule: string;
  };
  navigation: NavigationItem[];
  permissions: string[];
}

export interface WorkspaceResponse {
  user: WorkspaceUser;
  merchant: Merchant;
  navigation: NavigationItem[];
  plugins: PluginManifest[];
}

export const EMPTY_WORKSPACE_USER: WorkspaceUser = {
  id: '',
  displayName: '',
  email: '',
  roles: [],
  locale: 'en',
};

export const EMPTY_MERCHANT: Merchant = {
  id: '',
  businessName: '',
  status: 'PENDING',
  kycStatus: 'NOT_SUBMITTED',
  currency: 'ETB',
};
