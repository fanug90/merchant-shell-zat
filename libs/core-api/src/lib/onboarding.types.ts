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

export type DocumentType =
  | 'KEBELE_ID'
  | 'PASSPORT'
  | 'DRIVERS_LICENSE'
  | 'TRADE_LICENSE';
export type DocumentSide = 'FRONT' | 'BACK' | 'SELFIE';
export type BankCode = 'CBE' | 'ETT' | 'AWB' | 'DAS' | 'ABB' | 'OTHER';
export type SideUploadStatus = { type: 'success' | 'error'; message: string };

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
  token: {
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresInSeconds: number;
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
  // adding address dto to be able to populate when there is data on db already registerd
  address?: AddressDto;
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

export interface KycSubmitRequest {
  documentIds: string[];
}

export interface KycSubmissionResponse {
  id?: string;
  merchantId?: string;
  status?:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'REQUIRES_RESUBMISSION';
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

/** Full onboarding state — kycRequirements is now embedded here */
export interface OnboardingStateResponse {
  merchantId?: string;
  currentStep?: OnboardingStep;
  completedSteps?: OnboardingStep[];
  checklist?: OnboardingChecklistResponse;
  review?: OnboardingReviewResponse;
  // Grouped KYC requirements returned with the state
  kycRequirements?: KycRequirementGroup[];
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
  token?: {
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresInSeconds: number;
  };
}

// export interface UploadedKycFile {
//   documentId: string;
//   side: DocumentSide;
//   fileName: string;
//   fileUrl?: string;
//   documentType: DocumentType;
// }

// export interface UploadPolicyResponse {
//   maxFileSizeBytes: number;
//   maxFileSizeLabel: string;
//   allowedContentTypes: string[];
// }

/** ONE_OF = user picks exactly one option; ALL_OF = user must complete every option */
export type KycSelectionMode = 'ONE_OF' | 'ALL_OF';

/** A single document type option within a KYC requirement group */
export interface KycDocumentOption {
  documentType: DocumentType;
  displayName: string;
  requiredSides: DocumentSide[];
  uploadedSides: DocumentSide[];
  missingSides: DocumentSide[];
  expiryDateRequired: boolean;
  expiryDate?: string;
  valid?: boolean;
  invalidReason?: string;
  uploaded: boolean;
  complete: boolean;
}

/** A KYC requirement group (e.g. "Identity document" or "Business license") */
export interface KycRequirementGroup {
  code: string;
  displayName: string;
  selectionMode: KycSelectionMode;
  requiredCount: number;
  satisfied: boolean;
  options: KycDocumentOption[];
}

/** Server-driven upload constraints from GET /v1/upload-policy */
export interface UploadPolicy {
  maxFileSizeBytes: number;
  maxFileSizeLabel: string;
  allowedContentTypes: string[];
}

// added types to support the new onboarding flow

export interface KycDocumentFile {
  id: string;
  side: DocumentSide;
  fileName: string;
  fileUrl?: string;
  contentType?: string;
  createdAt?: string;
}

export interface KycDocumentRecord {
  id: string;
  documentType: DocumentType;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  expiryDate?: string;
  verifiedAt?: string;
  files: KycDocumentFile[];
}

export interface KycSubmissionResponse {
  id?: string;
  merchantId?: string;
  status?:
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'REQUIRES_RESUBMISSION';
  documentType?: DocumentType;
  livenessScore?: number;
  faceMatchScore?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  createdAt?: string;
  documents?: KycDocumentRecord[];
}

// Additional types for the new setting flow

export interface MerchantUpdateRequest {
  businessName?: string;
  businessNameAm?: string;
  businessType?: BusinessType;
  email?: string;
  address?: AddressDto;
  estimatedMonthlyRevenue?: number;
  plan?: 'FREE' | 'PRO';
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresInSeconds: number;
}
