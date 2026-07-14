export type BusinessType =
  | 'CAFE_RESTAURANT'
  | 'RETAIL_SHOP'
  | 'TAXI_TRANSPORT'
  | 'ONLINE_SELLER'
  | 'FREELANCER'
  | 'OTHER';

export type OnboardingStep =
  | 'PHONE_VERIFY'
  | 'BUSINESS_DETAILS'
  | 'KYC_ID_UPLOAD'
  | 'BANK_WALLET_LINK'
  | 'REVIEW_SUBMIT'
  | 'APPROVED';

export type MerchantOnboardingStatus =
  | 'PENDING_KYC'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'ACTIVE'
  | 'SUSPENDED';

export type DocumentType = 'KEBELE_ID' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'TRADE_LICENSE';
export type DocumentSide = 'FRONT' | 'BACK' | 'SELFIE';
export type BankCode = 'CBE' | 'ETT' | 'AWB' | 'DAS' | 'ABB' | 'OTHER';

export interface PhoneOtpRequest {
  phone: string;
}

export interface PhoneOtpResponse {
  phone: string;
  deliveryChannel: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface PhoneOtpVerificationRequest {
  phone: string;
  otpCode: string;
}

export interface PhoneOtpVerificationResponse {
  phoneVerified: boolean;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresInSeconds: number;
}

export function normalizePhoneOtpVerificationResponse(
  response: PhoneOtpVerificationResponse | Record<string, unknown>
): PhoneOtpVerificationResponse {
  const tokenObj = (response as any).token; // NEW: unwrap token object

  const accessToken =
    tokenObj?.accessToken ??                       // NEW
    (response as any).accessToken ??
    (response as any)['access_token'] ??
    (response as any)['onboardingAccessToken'] ??
    (response as any)['onboarding_access_token'] ??
    (response as any)['token'];

  if (!accessToken) {
    throw new Error('OTP verification succeeded but the server did not return an access token.');
  }

  const expiresInSeconds =
    tokenObj?.expiresInSeconds ??                  // NEW
    (response as any).expiresInSeconds ??
    (response as any)['expires_in_seconds'] ??
    (response as any)['expires_in'] ??
    3600;

  return {
    phoneVerified: (response as any).phoneVerified ?? Boolean((response as any)['phone_verified'] ?? true),
    accessToken,
    refreshToken: tokenObj?.refreshToken ?? (response as any).refreshToken ?? (response as any)['refresh_token'],
    tokenType: tokenObj?.tokenType ?? (response as any).tokenType ?? (response as any)['token_type'] ?? 'Bearer',
    expiresInSeconds,
  };
}

export interface AddressDto {
  city?: string;
  subcity?: string;
  woreda?: string;
  kebele?: string;
  latitude?: number;
  longitude?: number;
}

export interface BusinessDetailsRequest {
  businessName: string;
  businessNameAm?: string;
  businessType: BusinessType;
  email?: string;
  address?: AddressDto;
  estimatedMonthlyRevenue?: number;
}

export interface MoneyDto {
  amount?: number;
  currency?: string;
  display?: string;
}

export interface MerchantResponse {
  id?: string;
  keycloakUserId?: string;
  businessName?: string;
  businessNameAm?: string;
  businessType?: BusinessType;
  ownerName?: string;
  phone?: string;
  email?: string;
  status?: MerchantOnboardingStatus;
  plan?: 'FREE' | 'PRO';
  settlementBankCode?: BankCode;
  settlementAccount?: string;
  estimatedMonthlyRevenue?: MoneyDto;
}

export interface KycDocumentRequirementResponse {
  documentType: DocumentType;
  displayName: string;
  enabled: boolean;
  requiredSides: DocumentSide[];
  expiryDateRequired: boolean;
}

export interface KycDocumentUploadResponse {
  documentId: string;
  fileId: string;
  side: DocumentSide;
  fileName: string;
  fileUrl?: string;
  expiryDate?: string;
}

export interface UploadPolicyResponse {
  maxFileSizeBytes: number;
  maxFileSizeLabel?: string;
  allowedContentTypes: string[];
}

export interface KycSubmitRequest {
  documentType: DocumentType;
  documentIds: string[];
}

export interface KycSubmissionResponse {
  id?: string;
  merchantId?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
  documentType?: DocumentType;
  rejectionReason?: string;
  submittedAt?: string;
}

export interface BankAccountLinkRequest {
  bankCode: string;
  accountNumber: string;
  makeDefault?: boolean;
}

export interface BankAccountResponse {
  id: string;
  merchantId?: string;
  bankCode: BankCode;
  bankName?: string;
  accountNumber: string;
  accountName?: string;
  defaultAccount?: boolean;
  verifiedAt?: string;
  createdAt?: string;
}

export interface SettlementOptionResponse {
  code: string;
  displayName: string;
  rail?: string;
  requiresAccountNumber: boolean;
}

export interface OnboardingChecklistResponse {
  phoneVerified?: boolean;
  businessDetailsCompleted?: boolean;
  kycCompleted?: boolean;
  settlementLinked?: boolean;
  termsAccepted?: boolean;
  readyToSubmit?: boolean;
}

export interface OnboardingReviewResponse {
  merchant?: MerchantResponse;
  kyc?: KycSubmissionResponse;
  settlementAccount?: BankAccountResponse;
  startingPlan?: string;
  transactionFeeLabel?: string;
}

export interface OnboardingStateResponse {
  merchantId?: string;
  currentStep?: OnboardingStep;
  completedSteps?: OnboardingStep[];
  checklist?: OnboardingChecklistResponse;
  review?: OnboardingReviewResponse;
  blockers?: string[];
}

export interface OnboardingSubmitRequest {
  acceptTermsOfService: boolean;
  acceptPrivacyPolicy: boolean;
  acceptNbeConsent: boolean;
  password: string;
  confirmPassword: string;
}

export interface OnboardingSubmitResponse {
  merchantId: string;
  status: MerchantOnboardingStatus;
  currentStep: OnboardingStep;
  approvedAt?: string;
  nextActions?: string[];
}
