import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import {
  BankAccountResponse,
  DocumentSide,
  DocumentType,
  KycDocumentOption,
  KycRequirementGroup,
  OnboardingApiService,
  OnboardingSessionService,
  OnboardingStateResponse,
  SettlementOptionResponse,
  UploadPolicy,
} from '@zat-main-web/core-api';
import { of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';

// Test data builders

function makeUploadPolicy(): UploadPolicy {
  return {
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxFileSizeLabel: '10MB',
    allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  } as UploadPolicy;
}

function makeKycOption(
  overrides: Partial<KycDocumentOption> = {},
): KycDocumentOption {
  return {
    documentType: 'KEBELE_ID' as DocumentType,
    displayName: 'Kebele ID',
    requiredSides: ['FRONT', 'BACK'] as DocumentSide[],
    uploadedSides: [] as DocumentSide[],
    missingSides: ['FRONT', 'BACK'] as DocumentSide[],
    expiryDateRequired: false,
    uploaded: false,
    complete: false,
    ...overrides,
  } as KycDocumentOption;
}

function makeKycGroup(
  overrides: Partial<KycRequirementGroup> = {},
): KycRequirementGroup {
  return {
    code: 'IDENTITY_DOCUMENT',
    displayName: 'Identity document',
    selectionMode: 'ONE_OF',
    requiredCount: 1,
    satisfied: false,
    options: [makeKycOption()],
    ...overrides,
  } as KycRequirementGroup;
}

function makeOnboardingState(
  overrides: Partial<OnboardingStateResponse> = {},
): OnboardingStateResponse {
  return {
    merchantId: 'MRC-00001',
    currentStep: undefined,
    checklist: { businessDetailsCompleted: false },
    review: { merchant: undefined, kyc: { documents: [] } },
    kycRequirements: [makeKycGroup()],
    blockers: [],
    ...overrides,
  } as unknown as OnboardingStateResponse;
}

function makeBankAccount(
  overrides: Partial<BankAccountResponse> = {},
): BankAccountResponse {
  return {
    id: 'bank-1',
    bankCode: 'CBE',
    bankName: 'Commercial Bank of Ethiopia',
    accountNumber: '1000123456',
    defaultAccount: false,
    ...overrides,
  } as BankAccountResponse;
}

function makeSettlementOption(
  overrides: Partial<SettlementOptionResponse> = {},
): SettlementOptionResponse {
  return {
    code: 'CBE',
    displayName: 'Commercial Bank of Ethiopia',
    requiresAccountNumber: true,
    ...overrides,
  } as SettlementOptionResponse;
}

// ── Suite ────────────────────────────────────────────────────────────────

describe('OnboardingComponent', () => {
  const api = {
    requestPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
    getOnboardingState: vi.fn(),
    getUploadPolicy: vi.fn(),
    listSettlementOptions: vi.fn(),
    submitBusinessDetails: vi.fn(),
    uploadKycDocument: vi.fn(),
    submitKyc: vi.fn(),
    linkBankAccount: vi.fn(),
    selectSettlementAccount: vi.fn(),
    listBankAccounts: vi.fn(),
    submitOnboarding: vi.fn(),
  };

  const session = {
    accessToken: vi.fn(),
    setVerification: vi.fn(),
  };

  const auth = {
    setToken: vi.fn(),
  };

  const router = {
    navigate: vi.fn(),
  };

  function createComponent() {
    const fixture = TestBed.createComponent(OnboardingComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    session.accessToken.mockReturnValue('onboarding-token');
    api.listBankAccounts.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        provideRouter([]),
        { provide: OnboardingApiService, useValue: api },
        { provide: OnboardingSessionService, useValue: session },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates and starts on the phone step', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
    expect(component.step()).toBe('phone');
    expect(component.otpRequested()).toBe(false);
  });

  describe('phone verification', () => {
    it('formats and validates the national phone number as the user types', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      const input = fixture.nativeElement.querySelector(
        '#phone-input',
      ) as HTMLInputElement;

      input.value = '9-1-2 abc 345678';
      input.dispatchEvent(new Event('input'));

      expect(component.phoneNationalNumber()).toBe('912345678');
      expect(component.phoneNumberValid()).toBe(true);
      expect(component.fullPhone()).toBe('+251912345678');
    });

    it('disables Send OTP until a valid 9-digit number is entered', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.sendOtpDisabled()).toBe(true);

      component.phoneNationalNumber.set('912345678');
      expect(component.sendOtpDisabled()).toBe(false);
    });

    it('requestOtp sends the OTP, flips to the code-entry view, and starts the resend countdown', () => {
      api.requestPhoneOtp.mockReturnValue(
        of({
          phone: '+251912345678',
          deliveryChannel: 'SMS',
          expiresInSeconds: 300,
          resendAfterSeconds: 30,
        }),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.phoneNationalNumber.set('912345678');

      component.requestOtp();

      expect(api.requestPhoneOtp).toHaveBeenCalledWith({
        phone: '+251912345678',
      });
      expect(component.otpRequested()).toBe(true);
      expect(component.loading()).toBe(false);
      expect(component.canResend()).toBe(false);

      vi.advanceTimersByTime(30_000);
      expect(component.resendSecondsRemaining()).toBe(0);
      expect(component.canResend()).toBe(true);
    });

    it('requestOtp surfaces an error message when the API call fails', () => {
      api.requestPhoneOtp.mockReturnValue(
        throwError(() => ({ error: { message: 'Too many requests' } })),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.phoneNationalNumber.set('912345678');

      component.requestOtp();

      expect(component.error()).toBe('Too many requests');
      expect(component.otpRequested()).toBe(false);
    });

    it('changePhoneNumber resets the OTP step and clears messages', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.otpRequested.set(true);
      component.otpDigits.set(['1', '2', '3', '4', '5', '6']);
      component.message.set('stale message');
      component.error.set('stale error');

      component.changePhoneNumber();

      expect(component.otpRequested()).toBe(false);
      expect(component.otpDigits()).toEqual(['', '', '', '', '', '']);
      expect(component.message()).toBe('');
      expect(component.error()).toBe('');
    });

    it('otpCodeValid is only true for a complete 6-digit code', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.otpDigits.set(['8', '4', '2', '1', '9', '']);
      expect(component.otpCodeValid()).toBe(false);

      component.otpDigits.set(['8', '4', '2', '1', '9', '0']);
      expect(component.otpCodeValid()).toBe(true);
      expect(component.otpCode()).toBe('842190');
    });

    it('verifyOtp loads workspace state and jumps to business details on first-time onboarding', () => {
      const uploadPolicy = makeUploadPolicy();
      const settlementOptions = [makeSettlementOption()];
      const state = makeOnboardingState({ currentStep: undefined });

      api.verifyPhoneOtp.mockReturnValue(
        of({
          phoneVerified: true,
          accessToken: 'tok',
          tokenType: 'Bearer',
          expiresInSeconds: 300,
        }),
      );
      api.getOnboardingState.mockReturnValue(of(state));
      api.getUploadPolicy.mockReturnValue(of(uploadPolicy));
      api.listSettlementOptions.mockReturnValue(of(settlementOptions));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.phoneNationalNumber.set('912345678');
      component.otpDigits.set(['8', '4', '2', '1', '9', '0']);

      component.verifyOtp();

      expect(session.setVerification).toHaveBeenCalledWith(
        '+251912345678',
        expect.objectContaining({ phoneVerified: true }),
      );
      expect(component.phoneVerified()).toBe(true);
      expect(component.step()).toBe('business');
      expect(component.uploadPolicy()).toEqual(uploadPolicy);
      expect(component.settlementOptions()).toEqual(settlementOptions);
      expect(component.loading()).toBe(false);
    });

    it('verifyOtp resumes at the step reported by the backend', () => {
      const state = makeOnboardingState({ currentStep: 'KYC_ID_UPLOAD' });

      api.verifyPhoneOtp.mockReturnValue(
        of({ phoneVerified: true, accessToken: 'tok' }),
      );
      api.getOnboardingState.mockReturnValue(of(state));
      api.getUploadPolicy.mockReturnValue(of(makeUploadPolicy()));
      api.listSettlementOptions.mockReturnValue(of([]));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.phoneNationalNumber.set('912345678');
      component.otpDigits.set(['8', '4', '2', '1', '9', '0']);

      component.verifyOtp();

      expect(component.step()).toBe('kyc');
      expect(component.message()).toContain('Resuming at Kyc');
    });

    it('verifyOtp surfaces an API error and leaves the user on the phone step', () => {
      api.verifyPhoneOtp.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid or expired code' } })),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.phoneNationalNumber.set('912345678');
      component.otpDigits.set(['0', '0', '0', '0', '0', '0']);

      component.verifyOtp();

      expect(component.error()).toBe('Invalid or expired code');
      expect(component.phoneVerified()).toBe(false);
      expect(component.step()).toBe('phone');
    });
  });

  describe('step navigation guards', () => {
    it('canVisit blocks non-phone steps until the onboarding session has a token', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      session.accessToken.mockReturnValue(null);
      expect(component.canVisit('business')).toBe(false);

      session.accessToken.mockReturnValue('onboarding-token');
      expect(component.canVisit('business')).toBe(true);
    });

    it('canVisit only allows the phone step before it has been verified', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.canVisit('phone')).toBe(true);
      component.phoneVerified.set(true);
      expect(component.canVisit('phone')).toBe(false);
    });

    it('goTo refreshes bank accounts when navigating to the settlement step', () => {
      api.listBankAccounts.mockReturnValue(
        of([makeBankAccount({ defaultAccount: true })]),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.phoneVerified.set(true);

      component.goTo('settlement');

      expect(component.step()).toBe('settlement');
      expect(api.listBankAccounts).toHaveBeenCalled();
      expect(component.bankAccounts().length).toBe(1);
    });

    it('goToNextStep / goToPreviousStep stay within bounds', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.canGoPrevious()).toBe(false);
      component.goToPreviousStep();
      expect(component.step()).toBe('phone');

      component.goToNextStep();
      expect(component.step()).toBe('business');
      expect(component.canGoNext()).toBe(true);
    });
  });

  describe('business details', () => {
    it('businessDetailsValid requires name, Amharic name, type, a valid email, and positive revenue', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.businessDetailsValid()).toBe(false);

      component.business.businessName = "Dawit's Cafe";
      component.business.businessNameAm = 'ዳዊት ካፌ';
      component.business.email = 'not-an-email';
      component.business.estimatedMonthlyRevenue = 25000;
      component.onBusinessFieldChange();
      expect(component.businessDetailsValid()).toBe(false);

      component.business.email = 'dawit@example.com';
      component.onBusinessFieldChange();
      expect(component.businessDetailsValid()).toBe(true);
    });

    it('onRevenueInput strips non-digits and formats the display with thousands separators', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      const input = document.createElement('input');
      input.value = '1300000';

      component.onRevenueInput({ target: input } as unknown as Event);

      expect(component.business.estimatedMonthlyRevenue).toBe(1300000);
      expect(component.estimatedMonthlyRevenueDisplay()).toBe('1,300,000');
    });

    it('submitBusinessDetails saves details, refreshes state, and advances to KYC', () => {
      api.submitBusinessDetails.mockReturnValue(of({ id: 'MRC-00001' }));
      api.getOnboardingState.mockReturnValue(of(makeOnboardingState()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.business.businessName = "Dawit's Cafe";
      component.business.businessNameAm = 'ዳዊት ካፌ';
      component.business.email = 'dawit@example.com';
      component.business.estimatedMonthlyRevenue = 25000;

      component.submitBusinessDetails();

      expect(api.submitBusinessDetails).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: "Dawit's Cafe" }),
      );
      expect(component.step()).toBe('kyc');
      expect(component.message()).toBe('Business details saved.');
    });

    it('submitBusinessDetails surfaces server errors without advancing the step', () => {
      api.submitBusinessDetails.mockReturnValue(
        throwError(() => ({
          error: { message: 'Business name already in use' },
        })),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.business.businessName = "Dawit's Cafe";
      component.business.businessNameAm = 'ዳዊት ካፌ';
      component.business.email = 'dawit@example.com';
      component.business.estimatedMonthlyRevenue = 25000;

      component.submitBusinessDetails();

      expect(component.error()).toBe('Business name already in use');
      expect(component.step()).toBe('phone');
    });
  });

  describe('KYC document upload', () => {
    function fileInputEvent(file: File): Event {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [file] });
      return { target: input } as unknown as Event;
    }

    it('rejects files larger than the upload policy limit without calling the API', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.uploadPolicy.set(makeUploadPolicy());
      const option = makeKycOption();
      const oversized = new File(
        [new Uint8Array(11 * 1024 * 1024)],
        'front.png',
        {
          type: 'image/png',
        },
      );

      component.onFileChange(option, 'FRONT', fileInputEvent(oversized));

      expect(api.uploadKycDocument).not.toHaveBeenCalled();
      expect(component.sideStatusFor(option.documentType, 'FRONT')?.type).toBe(
        'error',
      );
    });

    it('rejects disallowed content types without calling the API', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.uploadPolicy.set(makeUploadPolicy());
      const option = makeKycOption();
      const badType = new File(['data'], 'front.gif', { type: 'image/gif' });

      component.onFileChange(option, 'FRONT', fileInputEvent(badType));

      expect(api.uploadKycDocument).not.toHaveBeenCalled();
      expect(component.sideStatusFor(option.documentType, 'FRONT')?.type).toBe(
        'error',
      );
    });

    it('uploads a valid file, refreshes state, and shows a success status', () => {
      api.uploadKycDocument.mockReturnValue(
        of({ documentId: 'doc-1', fileId: 'file-1' }),
      );
      api.getOnboardingState.mockReturnValue(of(makeOnboardingState()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.uploadPolicy.set(makeUploadPolicy());
      const option = makeKycOption();
      const validFile = new File(['data'], 'front.png', { type: 'image/png' });

      component.onFileChange(option, 'FRONT', fileInputEvent(validFile));

      expect(api.uploadKycDocument).toHaveBeenCalledWith(
        option.documentType,
        'FRONT',
        validFile,
      );
      expect(component.sideStatusFor(option.documentType, 'FRONT')).toEqual({
        type: 'success',
        message: 'Kebele ID FRONT uploaded successfully.',
      });
    });

    it('submitAllKyc blocks submission when there are no uploaded documents yet', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.submitAllKyc();

      expect(api.submitKyc).not.toHaveBeenCalled();
      expect(component.kycSubmitError()).toContain('No documents found');
    });

    it('submitAllKyc submits collected document ids and shows the success dialog', () => {
      const stateWithDocs = makeOnboardingState({
        review: {
          merchant: undefined,
          kyc: {
            documents: [{ id: 'doc-1', documentType: 'KEBELE_ID', files: [] }],
          },
        },
      } as unknown as Partial<OnboardingStateResponse>);

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.state.set(stateWithDocs);

      api.submitKyc.mockReturnValue(of({ status: 'SUBMITTED' }));
      api.getOnboardingState.mockReturnValue(of(stateWithDocs));

      component.submitAllKyc();

      expect(api.submitKyc).toHaveBeenCalledWith({ documentIds: ['doc-1'] });
      expect(component.kycSubmittedThisSession()).toBe(true);
      expect(component.kycSubmitSuccess()).toBe(true);

      component.continueAfterKycSubmit();
      expect(component.step()).toBe('settlement');
      expect(component.kycSubmitSuccess()).toBe(false);
    });
  });

  describe('settlement account', () => {
    it('linkSettlementAccount links, sets default when requested, and advances to review', () => {
      const linkedAccount = makeBankAccount();
      api.linkBankAccount.mockReturnValue(of(linkedAccount));
      api.selectSettlementAccount.mockReturnValue(of(linkedAccount));
      api.listBankAccounts.mockReturnValue(
        of([makeBankAccount({ defaultAccount: true })]),
      );
      api.getOnboardingState.mockReturnValue(of(makeOnboardingState()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.settlement.bankCode = 'CBE';
      component.settlement.accountNumber = '1000123456';
      component.settlement.makeDefault = true;

      component.linkSettlementAccount();

      expect(api.linkBankAccount).toHaveBeenCalledWith({
        bankCode: 'CBE',
        accountNumber: '1000123456',
        makeDefault: true,
      });
      expect(api.selectSettlementAccount).toHaveBeenCalledWith(
        linkedAccount.id,
      );
      expect(component.step()).toBe('review');
      expect(component.selectedBankAccountId()).toBe(linkedAccount.id);
    });

    it('selectSettlementAccount updates the selected account and message', () => {
      const account = makeBankAccount({ id: 'bank-2' });
      api.selectSettlementAccount.mockReturnValue(of(account));
      api.listBankAccounts.mockReturnValue(of([account]));
      api.getOnboardingState.mockReturnValue(of(makeOnboardingState()));

      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.selectSettlementAccount(account);

      expect(component.selectedBankAccountId()).toBe('bank-2');
      expect(component.message()).toBe('Default settlement account selected.');
    });
  });

  describe('final submission', () => {
    it('blocks submission client-side when the passwords do not match', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.consents.terms = true;
      component.consents.privacy = true;
      component.consents.nbe = true;
      component.password = 'password123';
      component.confirmPassword = 'different123';

      component.submitOnboarding();

      expect(api.submitOnboarding).not.toHaveBeenCalled();
      expect(component.error()).toBe('Passwords do not match.');
    });

    it('canSubmitReview requires all consents and matching 8+ char passwords', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.canSubmitReview()).toBe(false);

      component.consents.terms = true;
      component.consents.privacy = true;
      component.consents.nbe = true;
      component.password = 'password123';
      component.confirmPassword = 'password123';

      expect(component.canSubmitReview()).toBe(true);
    });

    it('submitOnboarding stores the returned token and moves to the done step', () => {
      api.submitOnboarding.mockReturnValue(
        of({
          merchantId: 'MRC-00001',
          status: 'ACTIVE',
          currentStep: 'APPROVED',
          nextActions: ['Sign in to your dashboard'],
          token: { accessToken: 'shell-access-token' },
        }),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.consents.terms = true;
      component.consents.privacy = true;
      component.consents.nbe = true;
      component.password = 'password123';
      component.confirmPassword = 'password123';

      component.submitOnboarding();

      expect(auth.setToken).toHaveBeenCalledWith('shell-access-token');
      expect(component.step()).toBe('done');
      expect(component.approvalMessage()).toContain('ACTIVE');
    });

    it('goToDashboard navigates to /home', () => {
      const fixture = createComponent();
      fixture.componentInstance.goToDashboard();

      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('document preview', () => {
    it('openPreview shows the matching file and closePreview / Escape hides it', () => {
      const stateWithFile = makeOnboardingState({
        review: {
          merchant: undefined,
          kyc: {
            documents: [
              {
                id: 'doc-1',
                documentType: 'KEBELE_ID',
                files: [
                  {
                    side: 'FRONT',
                    fileName: 'front.png',
                    fileUrl: 'blob:front',
                  },
                ],
              },
            ],
          },
        },
      } as unknown as Partial<OnboardingStateResponse>);

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.state.set(stateWithFile);

      component.openPreview('KEBELE_ID' as DocumentType, 'FRONT');
      expect(component.previewFile()?.fileName).toBe('front.png');

      component.closePreview();
      expect(component.previewFile()).toBeNull();

      component.openPreview('KEBELE_ID' as DocumentType, 'FRONT');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(component.previewFile()).toBeNull();
    });
  });

  it('renders the branded onboarding hero copy', () => {
    const fixture = createComponent();
    const text = fixture.nativeElement.textContent as string;
    const backLink = fixture.debugElement.query(By.css('a[href="/login"]'));

    expect(text).toContain('Open your merchant workspace');
    expect(backLink.nativeElement.textContent).toContain('Back to welcome');
  });
});
