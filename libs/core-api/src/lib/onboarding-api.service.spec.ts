import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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

    const request = http.expectOne('http://merchant-service.test/v1/onboarding/phone/otp');
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

  it('attaches the verified onboarding bearer token to protected onboarding requests', () => {
    session.setVerification('+251912345678', {
      phoneVerified: true,
      accessToken: 'onboarding-access-token',
      tokenType: 'Bearer',
      expiresInSeconds: 300,
    });

    api.submitBusinessDetails({
      businessName: 'Dawit Cafe',
      businessType: 'CAFE_RESTAURANT',
    }).subscribe();

    const request = http.expectOne('http://merchant-service.test/v1/onboarding/business-details');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer onboarding-access-token');
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
      accessToken: 'onboarding-access-token',
      tokenType: 'Bearer',
      expiresInSeconds: 300,
    });
    const file = new File(['front'], 'front.png', { type: 'image/png' });

    api.uploadKycDocument('KEBELE_ID', 'FRONT', file).subscribe();

    const request = http.expectOne((candidate) =>
      candidate.url === 'http://merchant-service.test/v1/merchants/me/kyc/documents' &&
      candidate.params.get('documentType') === 'KEBELE_ID' &&
      candidate.params.get('side') === 'FRONT'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer onboarding-access-token');
    expect(request.request.body instanceof FormData).toBe(true);
    request.flush({
      documentId: 'doc-1',
      fileId: 'file-1',
      side: 'FRONT',
      fileName: 'front.png',
    });
  });
});
