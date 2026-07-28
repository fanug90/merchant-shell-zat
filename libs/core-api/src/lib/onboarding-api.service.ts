import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CORE_API_CONFIG, DEFAULT_CORE_API_CONFIG } from './core-api.config';
import { OnboardingSessionService } from './onboarding-session.service';
import {
  BankAccountLinkRequest,
  BankAccountResponse,
  BusinessDetailsRequest,
  DocumentSide,
  DocumentType,
  KycDocumentRequirementResponse,
  KycDocumentUploadResponse,
  KycSubmitRequest,
  KycSubmissionResponse,
  MerchantResponse,
  OnboardingStateResponse,
  OnboardingSubmitRequest,
  OnboardingSubmitResponse,
  PhoneOtpRequest,
  PhoneOtpResponse,
  PhoneOtpVerificationRequest,
  PhoneOtpVerificationResponse,
  SettlementOptionResponse,
  UploadPolicy,
  normalizePhoneOtpVerificationResponse,
} from './onboarding.types';

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(OnboardingSessionService);
  private readonly config =
    inject(CORE_API_CONFIG, { optional: true }) ?? DEFAULT_CORE_API_CONFIG;

  requestPhoneOtp(request: PhoneOtpRequest): Observable<PhoneOtpResponse> {
    return this.http.post<PhoneOtpResponse>(
      this.url('/v1/onboarding/phone/otp'),
      request,
    );
  }

  verifyPhoneOtp(
    request: PhoneOtpVerificationRequest,
  ): Observable<PhoneOtpVerificationResponse> {
    return this.http
      .post<
        PhoneOtpVerificationResponse & Record<string, unknown>
      >(this.url('/v1/onboarding/phone/otp/verify'), request)
      .pipe(
        map((response) =>
          normalizePhoneOtpVerificationResponse(
            response as PhoneOtpVerificationResponse | Record<string, unknown>,
          ),
        ),
      );
  }

  getOnboardingState(): Observable<OnboardingStateResponse> {
    return this.http.get<OnboardingStateResponse>(
      this.url('/v1/onboarding'),
      this.authOptions(),
    );
  }

  submitBusinessDetails(
    request: BusinessDetailsRequest,
  ): Observable<MerchantResponse> {
    return this.http.post<MerchantResponse>(
      this.url('/v1/onboarding/business-details'),
      request,
      {
        headers: this.authHeaders().set('Idempotency-Key', crypto.randomUUID()),
      },
    );
  }

  listKycRequirements(): Observable<KycDocumentRequirementResponse[]> {
    return this.http.get<KycDocumentRequirementResponse[]>(
      this.url('/v1/merchants/me/kyc/requirements'),
      this.authOptions(),
    );
  }

  uploadKycDocument(
    documentType: DocumentType,
    side: DocumentSide,
    file: File,
  ): Observable<KycDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new HttpParams()
      .set('documentType', documentType)
      .set('side', side);

    return this.http.post<KycDocumentUploadResponse>(
      this.url('/v1/merchants/me/kyc/documents'),
      formData,
      {
        headers: this.authHeaders(),
        params,
      },
    );
  }

  submitKyc(request: KycSubmitRequest): Observable<KycSubmissionResponse> {
    return this.http.post<KycSubmissionResponse>(
      this.url('/v1/merchants/me/kyc/submit'),
      request,
      this.authOptions(),
    );
  }

  /** Server-driven upload constraints. No auth required — public endpoint. */
  getUploadPolicy(): Observable<UploadPolicy> {
    return this.http.get<UploadPolicy>(this.url('/v1/upload-policy'));
  }

  listSettlementOptions(): Observable<SettlementOptionResponse[]> {
    return this.http.get<SettlementOptionResponse[]>(
      this.url('/v1/onboarding/settlement-options'),
      this.authOptions(),
    );
  }

  listBankAccounts(): Observable<BankAccountResponse[]> {
    return this.http.get<BankAccountResponse[]>(
      this.url('/v1/merchants/me/bank-accounts'),
      this.authOptions(),
    );
  }

  linkBankAccount(
    request: BankAccountLinkRequest,
  ): Observable<BankAccountResponse> {
    return this.http.post<BankAccountResponse>(
      this.url('/v1/merchants/me/bank-accounts'),
      request,
      this.authOptions(),
    );
  }

  selectSettlementAccount(
    bankAccountId: string,
  ): Observable<BankAccountResponse> {
    return this.http.put<BankAccountResponse>(
      this.url('/v1/onboarding/settlement-account'),
      { bankAccountId },
      this.authOptions(),
    );
  }

  submitOnboarding(
    request: OnboardingSubmitRequest,
  ): Observable<OnboardingSubmitResponse> {
    return this.http.post<OnboardingSubmitResponse>(
      this.url('/v1/onboarding/submit'),
      request,
      this.authOptions(),
    );
  }

  private authOptions(): { headers: HttpHeaders } {
    return { headers: this.authHeaders() };
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(this.session.authorizationHeader());
  }

  private url(path: string): string {
    return `${this.config.merchantServiceBaseUrl.replace(/\/$/, '')}${path}`;
  }
}
