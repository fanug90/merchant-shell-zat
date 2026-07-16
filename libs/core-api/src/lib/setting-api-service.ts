import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CORE_API_CONFIG, DEFAULT_CORE_API_CONFIG } from './core-api.config';
import { AuthService } from '@zat-main-web/auth';
import {
  AuthTokenResponse,
  BankAccountLinkRequest,
  BankAccountResponse,
  DocumentSide,
  DocumentType,
  KycDocumentRequirementResponse,
  KycDocumentUploadResponse,
  KycSubmissionResponse,
  KycSubmitRequest,
  MerchantResponse,
  MerchantUpdateRequest,
  PasswordChangeRequest,
  SettlementOptionResponse,
  UploadPolicy,
} from './onboarding.types';
import { from, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly config =
    inject(CORE_API_CONFIG, { optional: true }) ?? DEFAULT_CORE_API_CONFIG;

  // ── Business profile ─────────────────────────────────────────────────────

  getMerchantProfile(): Observable<MerchantResponse> {
    return this.authorized((headers) =>
      this.http.get<MerchantResponse>(this.url('/v1/merchants/me'), {
        headers,
      }),
    );
  }

  updateMerchantProfile(
    request: MerchantUpdateRequest,
  ): Observable<MerchantResponse> {
    return this.authorized((headers) =>
      this.http.put<MerchantResponse>(this.url('/v1/merchants/me'), request, {
        headers,
      }),
    );
  }

  // ── Password ─────────────────────────────────────────────────────────────

  changePassword(
    request: PasswordChangeRequest,
  ): Observable<AuthTokenResponse> {
    return this.authorized((headers) =>
      this.http.put<AuthTokenResponse>(
        this.url('/v1/merchants/me/password'),
        request,
        { headers },
      ),
    );
  }

  // ── KYC (flat requirement shape — see note on grouping gap) ────────────────

  getKycStatus(): Observable<KycSubmissionResponse> {
    return this.authorized((headers) =>
      this.http.get<KycSubmissionResponse>(this.url('/v1/merchants/me/kyc'), {
        headers,
      }),
    );
  }

  listKycRequirements(): Observable<KycDocumentRequirementResponse[]> {
    return this.authorized((headers) =>
      this.http.get<KycDocumentRequirementResponse[]>(
        this.url('/v1/merchants/me/kyc/requirements'),
        { headers },
      ),
    );
  }

  uploadKycDocument(
    documentType: DocumentType,
    side: DocumentSide,
    file: File,
  ): Observable<KycDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('documentType', documentType.toString());
    formData.append('side', side);
    formData.append('file', file);

    return this.authorized((headers) =>
      this.http.post<KycDocumentUploadResponse>(
        this.url('/v1/merchants/me/kyc/documents'),
        formData,
        {
          headers,
        },
      ),
    );
  }

  replaceKycDocument(
    documentType: DocumentType,
    side: DocumentSide,
    file: File,
  ): Observable<KycDocumentUploadResponse> {
    const formData = new FormData();
    formData.append('documentType', documentType.toString());
    formData.append('side', side);
    formData.append('file', file);

    return this.authorized((headers) =>
      this.http.put<KycDocumentUploadResponse>(
        this.url('/v1/merchants/me/kyc/documents'),
        formData,
        {
          headers,
        },
      ),
    );
  }

  submitKyc(request: KycSubmitRequest): Observable<KycSubmissionResponse> {
    return this.authorized((headers) =>
      this.http.post<KycSubmissionResponse>(
        this.url('/v1/merchants/me/kyc/submit'),
        request,
        {
          headers,
        },
      ),
    );
  }

  // ── Settlement accounts ──────────────────────────────────────────────────

  listBankAccounts(): Observable<BankAccountResponse[]> {
    return this.authorized((headers) =>
      this.http.get<BankAccountResponse[]>(
        this.url('/v1/merchants/me/bank-accounts'),
        { headers },
      ),
    );
  }

  linkBankAccount(
    request: BankAccountLinkRequest,
  ): Observable<BankAccountResponse> {
    return this.authorized((headers) =>
      this.http.post<BankAccountResponse>(
        this.url('/v1/merchants/me/bank-accounts'),
        request,
        {
          headers,
        },
      ),
    );
  }

  updateBankAccount(
    bankAccountId: string,
    request: BankAccountLinkRequest,
  ): Observable<BankAccountResponse> {
    return this.authorized((headers) =>
      this.http.put<BankAccountResponse>(
        this.url(`/v1/merchants/me/bank-accounts/${bankAccountId}`),
        request,
        { headers },
      ),
    );
  }

  listSettlementOptions(): Observable<SettlementOptionResponse[]> {
    return this.authorized((headers) =>
      this.http.get<SettlementOptionResponse[]>(
        this.url('/v1/onboarding/settlement-options'),
        { headers },
      ),
    );
  }

  /** Selecting a settlement account as default reuses the update endpoint with makeDefault: true,
   *  since there is no separate onboarding-style "select default" route once past onboarding. */
  selectDefaultBankAccount(
    account: BankAccountResponse,
  ): Observable<BankAccountResponse> {
    return this.updateBankAccount(account.id, {
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      makeDefault: true,
    });
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  private authorized<T>(
    request: (headers: HttpHeaders) => Observable<T>,
  ): Observable<T> {
    return from(this.auth.getToken()).pipe(
      switchMap((token) =>
        request(new HttpHeaders({ Authorization: `Bearer ${token}` })),
      ),
    );
  }

  private url(path: string): string {
    return `${this.config.merchantServiceBaseUrl.replace(/\/$/, '')}${path}`;
  }

  getUploadPolicy(): Observable<UploadPolicy> {
    return this.http.get<UploadPolicy>(this.url('/v1/upload-policy'));
  }
}
