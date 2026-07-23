import { TestBed } from '@angular/core/testing';
import { SettingApiService } from './setting-api-service';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CORE_API_CONFIG } from './core-api.config';
import { AuthService } from '@zat-main-web/auth';
import { provideHttpClient } from '@angular/common/http';

// Helper to flush Promise microtasks synchronously in Vitest without zone.js/fakeAsync
const flushMicrotasks = () => Promise.resolve();

describe('SettingApiService', () => {
  let api: SettingApiService;
  let http: HttpTestingController;

  const auth = {
    getToken: vi.fn(),
  };

  beforeEach(() => {
    auth.getToken.mockReset();
    auth.getToken.mockResolvedValue('shell-access-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SettingApiService,
        { provide: AuthService, useValue: auth },
        {
          provide: CORE_API_CONFIG,
          useValue: {
            bffBaseUrl: '',
            merchantServiceBaseUrl: 'http://merchant-service.test',
            coreApiVersion: 'v1',
            useMockWorkspace: false,
          },
        },
      ],
    });
    api = TestBed.inject(SettingApiService);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(api).toBeTruthy();
  });

  // ── Business profile ────────────────────────────────────────────────────

  it('fetches the merchant profile with a bearer token resolved from AuthService', async () => {
    let result: { id?: string } | undefined;
    api.getMerchantProfile().subscribe((response) => (result = response));

    // Await the auth.getToken() Promise microtask to resolve before checking HTTP controller
    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(auth.getToken).toHaveBeenCalledTimes(1);

    request.flush({ id: 'MRC-00001', businessName: "Dawit's Cafe" });
    expect(result?.id).toBe('MRC-00001');
  });

  it('updates the merchant profile via PUT', async () => {
    api
      .updateMerchantProfile({ businessName: 'New Name' } as never)
      .subscribe();

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body).toEqual({ businessName: 'New Name' });

    request.flush({ id: 'MRC-00001', businessName: 'New Name' });
  });

  // ── Password ─────────────────────────────────────────────────────────────

  it('changes the password and returns a flat AuthTokenResponse (no extra nesting)', async () => {
    let token: { accessToken: string } | undefined;
    api
      .changePassword({
        currentPassword: 'old-password',
        newPassword: 'new-password',
        confirmPassword: 'new-password',
      } as never)
      .subscribe((response) => (token = response));

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/password',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body).toEqual({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmPassword: 'new-password',
    });

    request.flush({
      accessToken: 'refreshed-shell-token',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
    });

    expect(token?.accessToken).toBe('refreshed-shell-token');
  });

  // ── KYC ──────────────────────────────────────────────────────────────────

  it('fetches the current KYC submission status', async () => {
    api.getKycStatus().subscribe((submission) => {
      expect(submission.status).toBe('IN_PROGRESS');
    });

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    request.flush({ status: 'IN_PROGRESS', documents: [] });
  });

  it('lists KYC document requirements', async () => {
    api.listKycRequirements().subscribe((requirements) => {
      expect(requirements).toHaveLength(1);
    });

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc/requirements',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    request.flush([
      {
        documentType: 'KEBELE_ID',
        displayName: 'Kebele ID',
        enabled: true,
        requiredSides: ['FRONT', 'BACK'],
        expiryDateRequired: false,
      },
    ]);
  });

  it('uploads a new KYC document as multipart form data via POST', async () => {
    const file = new File(['front'], 'front.png', { type: 'image/png' });

    api.uploadKycDocument('KEBELE_ID', 'FRONT', file).subscribe();

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc/documents',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body instanceof FormData).toBe(true);

    const body = request.request.body as FormData;
    expect(body.get('documentType')).toBe('KEBELE_ID');
    expect(body.get('side')).toBe('FRONT');
    expect(body.get('file')).toBe(file);

    request.flush({
      documentId: 'doc-1',
      fileId: 'file-1',
      side: 'FRONT',
      fileName: 'front.png',
    });
  });

  it('replaces an existing KYC document via PUT to the same endpoint', async () => {
    const file = new File(['front-v2'], 'front-v2.png', { type: 'image/png' });

    api.replaceKycDocument('KEBELE_ID', 'FRONT', file).subscribe();

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc/documents',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body instanceof FormData).toBe(true);

    request.flush({
      documentId: 'doc-1',
      fileId: 'file-2',
      side: 'FRONT',
      fileName: 'front-v2.png',
    });
  });

  it('submits KYC document ids for resubmission', async () => {
    api
      .submitKyc({ documentIds: ['doc-1', 'doc-2'] } as never)
      .subscribe((submission) => {
        expect(submission.status).toBe('SUBMITTED');
      });

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc/submit',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body).toEqual({ documentIds: ['doc-1', 'doc-2'] });
    request.flush({ status: 'SUBMITTED' });
  });

  // ── Settlement accounts ──────────────────────────────────────────────────

  it('lists linked bank accounts', async () => {
    api.listBankAccounts().subscribe((accounts) => {
      expect(accounts).toHaveLength(1);
    });

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/bank-accounts',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    request.flush([
      { id: 'ACC-1', bankCode: 'CBE', accountNumber: '1000123456' },
    ]);
  });

  it('links a new bank account', async () => {
    api
      .linkBankAccount({
        bankCode: 'CBE',
        accountNumber: '1000123456',
        makeDefault: false,
      } as never)
      .subscribe((account) => {
        expect(account.id).toBe('ACC-1');
      });

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/bank-accounts',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body).toEqual({
      bankCode: 'CBE',
      accountNumber: '1000123456',
      makeDefault: false,
    });
    request.flush({
      id: 'ACC-1',
      bankCode: 'CBE',
      accountNumber: '1000123456',
    });
  });

  it('updates a bank account by id', async () => {
    api
      .updateBankAccount('ACC-1', {
        bankCode: 'CBE',
        accountNumber: '1000123456',
        makeDefault: true,
      } as never)
      .subscribe();

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/bank-accounts/ACC-1',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    expect(request.request.body).toEqual({
      bankCode: 'CBE',
      accountNumber: '1000123456',
      makeDefault: true,
    });
    request.flush({ id: 'ACC-1', defaultAccount: true });
  });

  it('lists settlement options', async () => {
    api.listSettlementOptions().subscribe((options) => {
      expect(options[0].code).toBe('CBE');
    });

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/settlement-options',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer shell-access-token',
    );
    request.flush([
      {
        code: 'CBE',
        displayName: 'Commercial Bank of Ethiopia',
        requiresAccountNumber: true,
      },
    ]);
  });

  it('selectDefaultBankAccount reuses updateBankAccount with makeDefault forced to true', async () => {
    const account = {
      id: 'ACC-2',
      bankCode: 'ETT',
      accountNumber: '2000456789',
      defaultAccount: false,
    } as never;

    api.selectDefaultBankAccount(account).subscribe();

    await flushMicrotasks();

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/bank-accounts/ACC-2',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      bankCode: 'ETT',
      accountNumber: '2000456789',
      makeDefault: true,
    });
    request.flush({ id: 'ACC-2', defaultAccount: true });
  });

  // ── Public endpoint ──────────────────────────────────────────────────────

  // Remains fully synchronous as it doesn't await the AuthService token promise
  it('fetches the upload policy without a bearer token', () => {
    api.getUploadPolicy().subscribe((policy) => {
      expect(policy.maxFileSizeLabel).toBe('10MB');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/upload-policy',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(auth.getToken).not.toHaveBeenCalled();

    request.flush({
      maxFileSizeBytes: 10485760,
      maxFileSizeLabel: '10MB',
      allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    });
  });

  // ── Auth failure propagation ─────────────────────────────────────────────

  it('propagates an AuthService.getToken() rejection without issuing an HTTP request', async () => {
    auth.getToken.mockReset();
    auth.getToken.mockRejectedValue(new Error('Authentication required.'));

    let caught: unknown;
    api.getMerchantProfile().subscribe({ error: (err) => (caught = err) });

    await flushMicrotasks();

    expect(caught).toBeInstanceOf(Error);
    http.expectNone('http://merchant-service.test/v1/merchants/me');
  });
});
