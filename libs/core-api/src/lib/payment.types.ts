export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentChannelCode =
  | 'CBE_BIRR'
  | 'TELEBIRR'
  | 'AWASH_BANK'
  | 'DASHEN_BANK'
  | 'ABYSSINIA_BANK'
  | 'NIB_BANK'
  | 'COOPERATIVE_BANK'
  | 'WEGAGEN_BANK'
  | 'BUNNA_BANK'
  | 'USSD'
  | 'OTHER';

export type PaymentChannelType =
  | 'ETHSWITCH_QR'
  | 'TELEBIRR_H5'
  | 'USSD'
  | 'BANK_RESOLVE'
  | 'BANK_DEEP_LINK';

export interface Money {
  amount: number;
  currency: 'ETB';
  display?: string;
}

export interface PaymentChannelsEthswitchQr {
  available?: boolean;
  qrPayload?: string;
  qrUrl?: string;
  qrImageBase64?: string;
}

export interface PaymentChannelsTelebirrH5 {
  available?: boolean;
  checkoutUrl?: string;
}

export interface PaymentChannelsUssd {
  available?: boolean;
  ussdString?: string;
  instructions?: string;
  instructionsAm?: string;
}

export interface PaymentChannelsBankResolveSupportedBank {
  bankCode?: string;
  bankName?: string;
}

export interface PaymentChannelsBankResolve {
  available?: boolean;
  referenceCode?: string;
  instructions?: string;
  instructionsAm?: string;
  supportedBanks?: PaymentChannelsBankResolveSupportedBank[];
}

export interface PaymentChannelsDeepLink {
  bankCode?: string;
  bankName?: string;
  url?: string;
  available?: boolean;
}

export interface PaymentChannels {
  ethswitchQr?: PaymentChannelsEthswitchQr;
  telebirrH5?: PaymentChannelsTelebirrH5;
  ussd?: PaymentChannelsUssd;
  bankResolve?: PaymentChannelsBankResolve;
  deepLinks?: PaymentChannelsDeepLink[];
}

export interface Payment {
  id: string;
  merchantId: string;
  referenceCode: string;
  amount: Money;
  fee?: Money;
  netAmount?: Money;
  feeRate?: number;
  status: PaymentStatus;
  channelType?: PaymentChannelType;
  channel?: PaymentChannelCode;
  providerRef?: string;
  bankTransactionId?: string;
  reference?: string;
  description?: string;
  customerPhone?: string;
  failureReason?: string;
  metadata?: Record<string, string>;
  channels?: PaymentChannels;
  expiresAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentCreateRequest {
  amount: number;
  description?: string;
  reference?: string;
  customerPhone?: string;
  expiryMinutes?: number;
  enabledChannels?: (
    | 'ETHSWITCH_QR'
    | 'TELEBIRR_H5'
    | 'USSD'
    | 'BANK_RESOLVE'
    | 'BANK_DEEP_LINK'
  )[];
  metadata?: Record<string, string>;
}

export interface PaymentQueryParams {
  page?: number;
  size?: number;
  status?: PaymentStatus;
  channel?: PaymentChannelCode;
  from?: string;
  to?: string;
  reference?: string;
  referenceCode?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ChannelBreakdown {
  channel?: PaymentChannelCode;
  channelType?: PaymentChannelType;
  amount?: Money;
  count?: number;
  percentage?: number;
}

export interface PaymentListSummary {
  totalRevenue?: Money;
  totalFees?: Money;
  totalNetRevenue?: Money;
  transactionCount?: number;
  completedCount?: number;
  pendingCount?: number;
  failedCount?: number;
  channelBreakdown?: ChannelBreakdown[];
}

export interface PaymentListResponse {
  data: Payment[];
  meta: PageMeta;
  summary?: PaymentListSummary;
}
