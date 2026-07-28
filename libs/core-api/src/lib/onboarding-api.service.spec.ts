import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CORE_API_CONFIG } from './core-api.config';
import { OnboardingApiService } from './onboarding-api.service';
import { OnboardingSessionService } from './onboarding-session.service';

describe('OnboardingApiService', () => {
  let api: OnboardingApiService;
  let http: HttpTestingController;
  let session: OnboardingSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OnboardingApiService,
        OnboardingSessionService,
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

    api = TestBed.inject(OnboardingApiService);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(OnboardingSessionService);
  });

  afterEach(() => {
    http.verify();
  });

  it('calls the public onboarding OTP endpoint without bearer auth', () => {
    api.requestPhoneOtp({ phone: '+251912345678' }).subscribe();

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/phone/otp',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({ phone: '+251912345678' });
    request.flush({
      phone: '+251912345678',
      deliveryChannel: 'SMS',
      expiresInSeconds: 300,
      resendAfterSeconds: 45,
    });
  });

  it('normalizes wrapped token object responses', () => {
    api
      .verifyPhoneOtp({ phone: '+251912345678', otpCode: '123456' })
      .subscribe((response) => {
        expect(response.token.accessToken).toBe('wrapped-access-token');
        expect(response.token.refreshToken).toBe('wrapped-refresh-token');
        expect(response.token.tokenType).toBe('Bearer');
        expect(response.token.expiresInSeconds).toBe(1800);
      });

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/phone/otp/verify',
    );
    expect(request.request.method).toBe('POST');
    request.flush({
      phone_verified: true,
      token: {
        accessToken: 'wrapped-access-token',
        refreshToken: 'wrapped-refresh-token',
        tokenType: 'Bearer',
        expiresInSeconds: 1800,
      },
    });
  });

  it('attaches the verified onboarding bearer token to protected onboarding requests', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api
      .submitBusinessDetails({
        businessName: 'Dawit Cafe',
        businessType: 'CAFE_RESTAURANT',
      })
      .subscribe();

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/business-details',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    expect(request.request.headers.has('Idempotency-Key')).toBe(true);
    expect(request.request.body).toEqual({
      businessName: 'Dawit Cafe',
      businessType: 'CAFE_RESTAURANT',
    });
    request.flush({ id: 'MRC-00001', businessName: 'Dawit Cafe' });
  });

  it('builds KYC upload requests with query params and multipart body', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });
    const file = new File(['front'], 'front.png', { type: 'image/png' });

    api.uploadKycDocument('KEBELE_ID', 'FRONT', file).subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url ===
          'http://merchant-service.test/v1/merchants/me/kyc/documents' &&
        candidate.params.get('documentType') === 'KEBELE_ID' &&
        candidate.params.get('side') === 'FRONT',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    expect(request.request.body instanceof FormData).toBe(true);
    request.flush({
      documentId: 'doc-1',
      fileId: 'file-1',
      side: 'FRONT',
      fileName: 'front.png',
    });
  });
  it('links a settlement account successfully', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api
      .linkBankAccount({
        bankCode: 'CBE',
        accountNumber: '1234567890',
        makeDefault: true,
      })
      .subscribe((response) => {
        expect(response.id).toBe('ACC-00001');
        expect(response.bankCode).toBe('CBE');
        expect(response.accountNumber).toBe('1234567890');
        expect(response.defaultAccount).toBe(true);
      });

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/bank-accounts',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    expect(request.request.body).toEqual({
      bankCode: 'CBE',
      accountNumber: '1234567890',
      makeDefault: true,
    });

    request.flush({
      id: 'ACC-00001',
      bankCode: 'CBE',
      accountNumber: '1234567890',
      defaultAccount: true,
    });
  });
  it('fetches upload policy successfully', () => {
    api.getUploadPolicy().subscribe((response) => {
      expect(response.maxFileSizeBytes).toBe(10485760);
      expect(response.maxFileSizeLabel).toBe('10MB');
      expect(response.allowedContentTypes).toContain('image/png');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/upload-policy',
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      maxFileSizeBytes: 10485760,
      maxFileSizeLabel: '10MB',
      allowedContentTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    });
  });

  it('throws before issuing a request when an authenticated endpoint is called with no verified session', () => {
    expect(() => api.getOnboardingState().subscribe()).toThrowError(
      'Onboarding phone OTP must be verified before continuing.',
    );

    http.expectNone('http://merchant-service.test/v1/onboarding');
  });

  it('fetches the onboarding aggregate state with bearer auth', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api.getOnboardingState().subscribe((state) => {
      expect(state.merchantId).toBe('MRC-00001');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    request.flush({ merchantId: 'MRC-00001' });
  });

  it('lists the legacy KYC document requirements with bearer auth', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api.listKycRequirements().subscribe((requirements) => {
      expect(requirements).toHaveLength(1);
      expect(requirements[0].documentType).toBe('KEBELE_ID');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc/requirements',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
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

  it('submits collected KYC document ids for review with bearer auth', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api.submitKyc({ documentIds: ['doc-1', 'doc-2'] }).subscribe((response) => {
      expect(response.status).toBe('SUBMITTED');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/kyc/submit',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    expect(request.request.body).toEqual({ documentIds: ['doc-1', 'doc-2'] });
    request.flush({ status: 'SUBMITTED' });
  });

  it('lists settlement options with bearer auth', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api.listSettlementOptions().subscribe((options) => {
      expect(options[0].code).toBe('CBE');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/settlement-options',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    request.flush([
      {
        code: 'CBE',
        displayName: 'Commercial Bank of Ethiopia',
        requiresAccountNumber: true,
      },
    ]);
  });

  it('lists linked bank accounts with bearer auth', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api.listBankAccounts().subscribe((accounts) => {
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('ACC-00001');
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/merchants/me/bank-accounts',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    request.flush([
      { id: 'ACC-00001', bankCode: 'CBE', accountNumber: '1234567890' },
    ]);
  });

  it('selects the default settlement account by id with bearer auth', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api.selectSettlementAccount('ACC-00001').subscribe((response) => {
      expect(response.defaultAccount).toBe(true);
    });

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/settlement-account',
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    expect(request.request.body).toEqual({ bankAccountId: 'ACC-00001' });
    request.flush({ id: 'ACC-00001', defaultAccount: true });
  });

  it('submits final onboarding with credentials and returns the AuthTokenResponse-shaped shell token', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      token: {
        accessToken: 'onboarding-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 300,
      },
    });

    api
      .submitOnboarding({
        acceptTermsOfService: true,
        acceptPrivacyPolicy: true,
        acceptNbeConsent: true,
        password: 'password123',
        confirmPassword: 'password123',
      })
      .subscribe((response) => {
        expect(response.status).toBe('ACTIVE');
        expect(response.token?.accessToken).toBe('shell-access-token');
        expect(response.token?.expiresInSeconds).toBe(3600);
      });

    const request = http.expectOne(
      'http://merchant-service.test/v1/onboarding/submit',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer onboarding-access-token',
    );
    expect(request.request.body).toEqual({
      acceptTermsOfService: true,
      acceptPrivacyPolicy: true,
      acceptNbeConsent: true,
      password: 'password123',
      confirmPassword: 'password123',
    });
    request.flush({
      merchantId: 'MRC-00001',
      status: 'ACTIVE',
      currentStep: 'APPROVED',
      nextActions: ['Sign in to your dashboard'],
      token: {
        accessToken: 'shell-access-token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
      },
    });
  });
});
