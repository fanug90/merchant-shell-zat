import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '@zat-main-web/auth';
import {
  BankAccountResponse,
  DocumentSide,
  DocumentType,
  KycDocumentRequirementResponse,
  KycSubmissionResponse,
  MerchantResponse,
  SettingApiService,
  SettlementOptionResponse,
  UploadPolicy,
} from '@zat-main-web/core-api';
import { of, throwError } from 'rxjs';
import { SettingsComponent } from './settings.component';

// ── Test data builders ─────────────────────────────────────────────────────

function makeMerchant(
  overrides: Partial<MerchantResponse> = {},
): MerchantResponse {
  return {
    id: 'MRC-00001',
    businessName: "Dawit's Cafe",
    businessNameAm: 'ዳዊት ካፌ',
    businessType: 'CAFE_RESTAURANT',
    email: 'dawit@example.com',
    address: { city: 'Addis Ababa', subcity: 'Bole', woreda: '03' },
    estimatedMonthlyRevenue: {
      amount: 25000,
      currency: 'ETB',
      display: 'ETB 25,000.00',
    },
    plan: 'FREE',
    ...overrides,
  } as MerchantResponse;
}

function makeKycRequirement(
  overrides: Partial<KycDocumentRequirementResponse> = {},
): KycDocumentRequirementResponse {
  return {
    documentType: 'KEBELE_ID' as DocumentType,
    displayName: 'Kebele ID',
    enabled: true,
    requiredSides: ['FRONT', 'BACK'] as DocumentSide[],
    expiryDateRequired: false,
    ...overrides,
  } as KycDocumentRequirementResponse;
}

function makeKycSubmission(
  overrides: Partial<KycSubmissionResponse> = {},
): KycSubmissionResponse {
  return {
    status: 'NOT_STARTED',
    documents: [],
    ...overrides,
  } as KycSubmissionResponse;
}

function makeUploadPolicy(): UploadPolicy {
  return {
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxFileSizeLabel: '10MB',
    allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  } as UploadPolicy;
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

function makeBankAccount(
  overrides: Partial<BankAccountResponse> = {},
): BankAccountResponse {
  return {
    id: 'ACC-1',
    bankCode: 'CBE',
    bankName: 'Commercial Bank of Ethiopia',
    accountNumber: '1000123456',
    defaultAccount: false,
    ...overrides,
  } as BankAccountResponse;
}

// ── Suite ────────────────────────────────────────────────────────────────

describe('SettingsComponent', () => {
  const api = {
    getMerchantProfile: vi.fn(),
    updateMerchantProfile: vi.fn(),
    changePassword: vi.fn(),
    getKycStatus: vi.fn(),
    listKycRequirements: vi.fn(),
    uploadKycDocument: vi.fn(),
    replaceKycDocument: vi.fn(),
    submitKyc: vi.fn(),
    listBankAccounts: vi.fn(),
    linkBankAccount: vi.fn(),
    updateBankAccount: vi.fn(),
    listSettlementOptions: vi.fn(),
    selectDefaultBankAccount: vi.fn(),
    getUploadPolicy: vi.fn(),
  };

  const auth = {
    setToken: vi.fn(),
  };

  function createComponent() {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    api.getMerchantProfile.mockReturnValue(of(makeMerchant()));
    api.listKycRequirements.mockReturnValue(
      of([
        makeKycRequirement({ documentType: 'KEBELE_ID' as DocumentType }),
        makeKycRequirement({
          documentType: 'TRADE_LICENSE' as DocumentType,
          displayName: 'Trade License',
          requiredSides: ['FRONT'] as DocumentSide[],
        }),
      ]),
    );
    api.getKycStatus.mockReturnValue(of(makeKycSubmission()));
    api.getUploadPolicy.mockReturnValue(of(makeUploadPolicy()));
    api.listSettlementOptions.mockReturnValue(of([makeSettlementOption()]));
    api.listBankAccounts.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: SettingApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('loads and hydrates the workspace on creation', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.business.businessName).toBe("Dawit's Cafe");
    expect(component.revenueDisplay()).toBe('25,000');
    expect(component.kycRequirements().length).toBe(2);
    expect(component.uploadPolicy()).toEqual(makeUploadPolicy());
    expect(component.settlementOptions().length).toBe(1);
    expect(component.loading()).toBe(false);
    // No documents uploaded yet -> falls back to the first identity requirement.
    expect(component.identitySelection()).toBe('KEBELE_ID');
  });

  it('preselects the identity document type that already has an uploaded document', () => {
    api.getKycStatus.mockReturnValue(
      of(
        makeKycSubmission({
          documents: [
            { id: 'doc-1', documentType: 'PASSPORT', files: [] } as never,
          ],
        }),
      ),
    );
    api.listKycRequirements.mockReturnValue(
      of([
        makeKycRequirement({ documentType: 'KEBELE_ID' as DocumentType }),
        makeKycRequirement({
          documentType: 'PASSPORT' as DocumentType,
          displayName: 'Passport',
        }),
      ]),
    );

    const fixture = createComponent();
    expect(fixture.componentInstance.identitySelection()).toBe('PASSPORT');
  });

  it('surfaces an error and stops loading if any bootstrap request fails', () => {
    api.getMerchantProfile.mockReturnValue(
      throwError(() => ({
        error: { message: 'Merchant profile unavailable' },
      })),
    );

    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.error()).toBe('Merchant profile unavailable');
    expect(component.loading()).toBe(false);
  });

  describe('business details', () => {
    it('businessValid requires name, Amharic name, a valid email, and positive revenue', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.businessValid()).toBe(true); // seeded with a valid merchant

      component.business.email = 'not-an-email';
      component.bumpBusinessTick();
      expect(component.businessValid()).toBe(false);
    });

    it('onRevenueInput strips non-digits and formats with thousands separators', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      const input = document.createElement('input');
      input.value = '1300000';

      component.onRevenueInput({ target: input } as unknown as Event);

      expect(component.business.estimatedMonthlyRevenue).toBe(1300000);
      expect(component.revenueDisplay()).toBe('1,300,000');
    });

    it('saveBusiness persists changes and re-hydrates the form from the response', () => {
      api.updateMerchantProfile.mockReturnValue(
        of(makeMerchant({ businessName: 'Renamed Cafe' })),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.business.businessName = 'Renamed Cafe';

      component.saveBusiness();

      expect(api.updateMerchantProfile).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: 'Renamed Cafe' }),
      );
      expect(component.business.businessName).toBe('Renamed Cafe');
      expect(component.message()).toBe('Business details saved.');
    });

    it('saveBusiness surfaces server errors', () => {
      api.updateMerchantProfile.mockReturnValue(
        throwError(() => ({ error: { message: 'Email already in use' } })),
      );

      const fixture = createComponent();
      fixture.componentInstance.saveBusiness();

      expect(fixture.componentInstance.error()).toBe('Email already in use');
    });
  });

  describe('KYC accordion state', () => {
    it('toggleDocument expands and collapses a business-license row', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(
        component.isDocumentExpanded('TRADE_LICENSE' as DocumentType),
      ).toBe(false);

      component.toggleDocument('TRADE_LICENSE' as DocumentType);
      expect(
        component.isDocumentExpanded('TRADE_LICENSE' as DocumentType),
      ).toBe(true);

      component.toggleDocument('TRADE_LICENSE' as DocumentType);
      expect(
        component.isDocumentExpanded('TRADE_LICENSE' as DocumentType),
      ).toBe(false);
    });

    it('isRequirementComplete / uploadedSidesCount reflect uploaded files on the submission', () => {
      api.getKycStatus.mockReturnValue(
        of(
          makeKycSubmission({
            documents: [
              {
                id: 'doc-1',
                documentType: 'KEBELE_ID',
                files: [{ side: 'FRONT', fileName: 'front.png' }],
              } as never,
            ],
          }),
        ),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      const requirement = makeKycRequirement();

      expect(component.uploadedSidesCount(requirement)).toBe(1);
      expect(component.isRequirementComplete(requirement)).toBe(false);
    });
  });

  describe('isDocumentReadyForResubmit', () => {
    it('trusts the server-reported completeness for an untouched document', () => {
      api.getKycStatus.mockReturnValue(
        of(
          makeKycSubmission({
            documents: [
              {
                id: 'doc-1',
                documentType: 'KEBELE_ID',
                files: [
                  { side: 'FRONT', fileName: 'front.png' },
                  { side: 'BACK', fileName: 'back.png' },
                ],
              } as never,
            ],
          }),
        ),
      );

      const fixture = createComponent();
      expect(
        fixture.componentInstance.isDocumentReadyForResubmit(
          makeKycRequirement(),
        ),
      ).toBe(true);
    });

    it('requires every required side to be freshly re-uploaded once any side is touched this session', () => {
      api.uploadKycDocument.mockReturnValue(
        of({ documentId: 'doc-1', fileId: 'file-1' }),
      );
      api.getKycStatus
        .mockReturnValueOnce(of(makeKycSubmission())) // bootstrap
        .mockReturnValueOnce(
          of(
            makeKycSubmission({
              documents: [
                {
                  id: 'doc-1',
                  documentType: 'KEBELE_ID',
                  files: [{ side: 'FRONT', fileName: 'front.png' }],
                } as never,
              ],
            }),
          ),
        );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      const requirement = makeKycRequirement(); // requires FRONT + BACK
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', {
        value: [new File(['front'], 'front.png', { type: 'image/png' })],
      });

      component.onFileChange(requirement, 'FRONT', {
        target: input,
      } as unknown as Event);

      // Only FRONT was touched this session; BACK still isn't — not ready,
      // even though the server has never marked this document "incomplete".
      expect(component.isDocumentReadyForResubmit(requirement)).toBe(false);
    });
  });

  describe('KYC document upload', () => {
    function fileInputEvent(file: File): Event {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [file] });
      return { target: input } as unknown as Event;
    }

    it('rejects an oversized file client-side without calling the API', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      const requirement = makeKycRequirement();
      const oversized = new File(
        [new Uint8Array(11 * 1024 * 1024)],
        'front.png',
        {
          type: 'image/png',
        },
      );

      component.onFileChange(requirement, 'FRONT', fileInputEvent(oversized));

      expect(api.uploadKycDocument).not.toHaveBeenCalled();
      expect(
        component.sideStatusFor(requirement.documentType, 'FRONT')?.type,
      ).toBe('error');
    });

    it('rejects a disallowed content type client-side without calling the API', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      const requirement = makeKycRequirement();
      const badType = new File(['data'], 'front.gif', { type: 'image/gif' });

      component.onFileChange(requirement, 'FRONT', fileInputEvent(badType));

      expect(api.uploadKycDocument).not.toHaveBeenCalled();
      expect(
        component.sideStatusFor(requirement.documentType, 'FRONT')?.type,
      ).toBe('error');
    });

    it('uploads via uploadKycDocument when the side has no existing file', () => {
      api.uploadKycDocument.mockReturnValue(
        of({ documentId: 'doc-1', fileId: 'file-1' }),
      );
      api.getKycStatus
        .mockReturnValueOnce(of(makeKycSubmission()))
        .mockReturnValueOnce(
          of(
            makeKycSubmission({
              documents: [
                {
                  id: 'doc-1',
                  documentType: 'KEBELE_ID',
                  files: [{ side: 'FRONT', fileName: 'front.png' }],
                } as never,
              ],
            }),
          ),
        );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      const requirement = makeKycRequirement();
      const file = new File(['front'], 'front.png', { type: 'image/png' });

      component.onFileChange(requirement, 'FRONT', fileInputEvent(file));

      expect(api.uploadKycDocument).toHaveBeenCalledWith(
        'KEBELE_ID',
        'FRONT',
        file,
      );
      expect(api.replaceKycDocument).not.toHaveBeenCalled();
      expect(
        component.sideStatusFor('KEBELE_ID' as DocumentType, 'FRONT'),
      ).toEqual({
        type: 'success',
        message: 'Kebele ID FRONT uploaded successfully.',
      });
    });

    it('uploads via replaceKycDocument when the side already has a file', () => {
      api.getKycStatus.mockReturnValue(
        of(
          makeKycSubmission({
            documents: [
              {
                id: 'doc-1',
                documentType: 'KEBELE_ID',
                files: [{ side: 'FRONT', fileName: 'front-v1.png' }],
              } as never,
            ],
          }),
        ),
      );
      api.replaceKycDocument.mockReturnValue(
        of({ documentId: 'doc-1', fileId: 'file-2' }),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      const requirement = makeKycRequirement();
      const file = new File(['front-v2'], 'front-v2.png', {
        type: 'image/png',
      });

      component.onFileChange(requirement, 'FRONT', fileInputEvent(file));

      expect(api.replaceKycDocument).toHaveBeenCalledWith(
        'KEBELE_ID',
        'FRONT',
        file,
      );
      expect(api.uploadKycDocument).not.toHaveBeenCalled();
    });
  });

  describe('submitKyc', () => {
    it('blocks submission when no relevant documents have been uploaded', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.submitKyc();

      expect(api.submitKyc).not.toHaveBeenCalled();
      expect(component.kycSubmitError()).toBe('No documents found to submit.');
    });

    it('submits ids for the selected identity type plus all business-license types', () => {
      api.getKycStatus.mockReturnValue(
        of(
          makeKycSubmission({
            documents: [
              { id: 'doc-1', documentType: 'KEBELE_ID', files: [] } as never,
              {
                id: 'doc-2',
                documentType: 'TRADE_LICENSE',
                files: [],
              } as never,
            ],
          }),
        ),
      );
      api.submitKyc.mockReturnValue(
        of(makeKycSubmission({ status: 'SUBMITTED' })),
      );

      const fixture = createComponent();
      fixture.componentInstance.submitKyc();

      expect(api.submitKyc).toHaveBeenCalledWith({
        documentIds: expect.arrayContaining(['doc-1', 'doc-2']),
      });
      expect(fixture.componentInstance.message()).toBe(
        'KYC documents resubmitted for review.',
      );
    });

    it('surfaces a server error on resubmission', () => {
      api.getKycStatus.mockReturnValue(
        of(
          makeKycSubmission({
            documents: [
              { id: 'doc-1', documentType: 'KEBELE_ID', files: [] } as never,
            ],
          }),
        ),
      );
      api.submitKyc.mockReturnValue(
        throwError(() => ({
          error: { message: 'Documents are still under review' },
        })),
      );

      const fixture = createComponent();
      fixture.componentInstance.submitKyc();

      expect(fixture.componentInstance.kycSubmitError()).toBe(
        'Documents are still under review',
      );
    });
  });

  describe('settlement account', () => {
    it('linkSettlementAccount links, refreshes the account list, and selects the default', () => {
      api.linkBankAccount.mockReturnValue(of(makeBankAccount()));
      api.listBankAccounts.mockReturnValue(
        of([makeBankAccount({ defaultAccount: true })]),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.settlement = {
        bankCode: 'CBE',
        accountNumber: '1000123456',
        makeDefault: true,
      };

      component.linkSettlementAccount();

      expect(api.linkBankAccount).toHaveBeenCalledWith({
        bankCode: 'CBE',
        accountNumber: '1000123456',
        makeDefault: true,
      });
      expect(component.bankAccounts().length).toBe(1);
      expect(component.selectedBankAccountId()).toBe('ACC-1');
      expect(component.message()).toBe('Settlement account linked.');
    });

    it('selectDefault delegates to selectDefaultBankAccount and refreshes the list', () => {
      const account = makeBankAccount({ id: 'ACC-2' });
      api.selectDefaultBankAccount.mockReturnValue(
        of({ ...account, defaultAccount: true }),
      );
      api.listBankAccounts.mockReturnValue(
        of([{ ...account, defaultAccount: true }]),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.selectDefault(account);

      expect(api.selectDefaultBankAccount).toHaveBeenCalledWith(account);
      expect(component.selectedBankAccountId()).toBe('ACC-2');
      expect(component.message()).toBe('Default settlement account updated.');
    });
  });

  describe('password change', () => {
    it('passwordMismatch flags a differing confirmation; passwordValid needs 8+ matching chars plus a current password', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.passwordForm.newPassword = 'password123';
      component.passwordForm.confirmPassword = 'different';
      component.bumpPasswordTick();
      expect(component.passwordMismatch()).toBe(true);
      expect(component.passwordValid()).toBe(false);

      component.passwordForm.currentPassword = 'old-password';
      component.passwordForm.confirmPassword = 'password123';
      component.bumpPasswordTick();
      expect(component.passwordMismatch()).toBe(false);
      expect(component.passwordValid()).toBe(true);
    });

    it('changePassword updates the shell token and clears the form on success', () => {
      api.changePassword.mockReturnValue(
        of({
          accessToken: 'refreshed-token',
          tokenType: 'Bearer',
          expiresInSeconds: 3600,
        }),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.passwordForm = {
        currentPassword: 'old-password',
        newPassword: 'password123',
        confirmPassword: 'password123',
      };

      component.changePassword();

      expect(auth.setToken).toHaveBeenCalledWith('refreshed-token');
      expect(component.passwordForm).toEqual({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      expect(component.message()).toBe('Password updated.');
    });

    it('changePassword surfaces an error and leaves the entered values in place', () => {
      api.changePassword.mockReturnValue(
        throwError(() => ({
          error: { message: 'Current password is incorrect' },
        })),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.passwordForm = {
        currentPassword: 'wrong-password',
        newPassword: 'password123',
        confirmPassword: 'password123',
      };

      component.changePassword();

      expect(component.error()).toBe('Current password is incorrect');
      expect(component.passwordForm.currentPassword).toBe('wrong-password');
    });
  });

  describe('document preview', () => {
    it('openPreview shows the matching uploaded file, closePreview hides it', () => {
      api.getKycStatus.mockReturnValue(
        of(
          makeKycSubmission({
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
              } as never,
            ],
          }),
        ),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.openPreview('KEBELE_ID' as DocumentType, 'FRONT');
      expect(component.previewFile()?.fileName).toBe('front.png');

      component.closePreview();
      expect(component.previewFile()).toBeNull();
    });

    it('does nothing when no uploaded file matches the requested side', () => {
      const fixture = createComponent();
      fixture.componentInstance.openPreview(
        'KEBELE_ID' as DocumentType,
        'FRONT',
      );
      expect(fixture.componentInstance.previewFile()).toBeNull();
    });
  });

  describe('status/label helpers', () => {
    it('kycStatusTone maps server statuses to badge tones', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.kycStatusTone('APPROVED')).toBe('success');
      expect(component.kycStatusTone('SUBMITTED')).toBe('success');
      expect(component.kycStatusTone('REJECTED')).toBe('danger');
      expect(component.kycStatusTone('REQUIRES_RESUBMISSION')).toBe('danger');
      expect(component.kycStatusTone('IN_PROGRESS')).toBe('warning');
      expect(component.kycStatusTone('NOT_STARTED')).toBe('neutral');
      expect(component.kycStatusTone(undefined)).toBe('neutral');
    });

    it('kycStatusLabel humanizes SUBMITTED and falls back to the raw status otherwise', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.kycStatusLabel('SUBMITTED')).toBe(
        'Submitted for review',
      );
      expect(component.kycStatusLabel('REJECTED')).toBe('REJECTED');
      expect(component.kycStatusLabel(undefined)).toBe('NOT_STARTED');
    });

    it('label() converts SNAKE_CASE enum values to Title Case', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.label('CAFE_RESTAURANT')).toBe(
        'Cafe Restaurant',
      );
    });
  });

  it('renders the settings tabs and defaults to the Business tab', () => {
    const fixture = createComponent();
    const tabs = fixture.debugElement.queryAll(By.css('.settings-tabs button'));

    expect(
      tabs.map((t) => (t.nativeElement.textContent as string).trim()),
    ).toEqual(['Business', 'KYC', 'Settlement', 'Password']);
    expect((tabs[0].nativeElement as HTMLElement).classList).toContain(
      'active',
    );
  });
});
