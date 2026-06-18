import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BankAccountResponse,
  BusinessType,
  DocumentSide,
  DocumentType,
  KycDocumentRequirementResponse,
  OnboardingApiService,
  OnboardingSessionService,
  OnboardingStateResponse,
  OnboardingStep,
  SettlementOptionResponse,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsEmptyStateComponent,
  EsSpinnerComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { forkJoin, of, switchMap } from 'rxjs';

type UiStep = 'phone' | 'business' | 'kyc' | 'settlement' | 'review' | 'done';

interface UploadedKycFile {
  documentId: string;
  side: DocumentSide;
  fileName: string;
}

@Component({
  selector: 'es-onboarding',
  standalone: true,
  imports: [
    FormsModule,
    EsButtonComponent,
    EsCardComponent,
    EsEmptyStateComponent,
    EsSpinnerComponent,
    EsStatusBadgeComponent,
  ],
  template: `
    <main class="onboarding">
      <section class="hero">
        <div>
          <p class="eyebrow">Create account</p>
          <h1>Open your merchant workspace</h1>
          <p>
            Verify your phone, register the business, upload KYC documents, and choose a settlement account.
          </p>
        </div>
        <a href="/login">Back to welcome</a>
      </section>

      <section class="progress" aria-label="Onboarding progress">
        @for (item of steps; track item.key) {
          <button type="button" [class.active]="step() === item.key" [disabled]="!canVisit(item.key)" (click)="goTo(item.key)">
            <span>{{ $index + 1 }}</span>
            {{ item.label }}
          </button>
        }
      </section>

      @if (message()) {
        <p class="message" role="status">{{ message() }}</p>
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (loading()) {
        <div class="loading"><es-spinner label="Working..." /></div>
      }

      @switch (step()) {
        @case ('phone') {
          <es-card title="Phone verification">
            <form class="grid" (ngSubmit)="requestOtp()">
              <label>
                Phone number
                <input name="phone" required placeholder="+251912345678" [(ngModel)]="phone" />
              </label>
              <es-button type="submit" [disabled]="loading()">Send OTP</es-button>
            </form>

            <form class="grid verify" (ngSubmit)="verifyOtp()">
              <label>
                OTP code
                <input name="otpCode" required maxlength="6" minlength="6" inputmode="numeric" placeholder="842190" [(ngModel)]="otpCode" />
              </label>
              <es-button type="submit" variant="secondary" [disabled]="loading() || !otpRequested()">Verify and continue</es-button>
            </form>
          </es-card>
        }

        @case ('business') {
          <es-card title="Business details" subtitle="Create the merchant profile required by /v1/onboarding/business-details.">
            <form class="form" (ngSubmit)="submitBusinessDetails()">
              <div class="two">
                <label>
                  Business name
                  <input name="businessName" required [(ngModel)]="business.businessName" />
                </label>
                <label>
                  Amharic business name
                  <input name="businessNameAm" [(ngModel)]="business.businessNameAm" />
                </label>
              </div>
              <div class="two">
                <label>
                  Business type
                  <select name="businessType" required [(ngModel)]="business.businessType">
                    @for (type of businessTypes; track type) {
                      <option [value]="type">{{ label(type) }}</option>
                    }
                  </select>
                </label>
                <label>
                  Email
                  <input name="email" type="email" [(ngModel)]="business.email" />
                </label>
              </div>
              <div class="two">
                <label>
                  City
                  <input name="city" [(ngModel)]="business.city" />
                </label>
                <label>
                  Subcity
                  <input name="subcity" [(ngModel)]="business.subcity" />
                </label>
              </div>
              <div class="two">
                <label>
                  Woreda
                  <input name="woreda" [(ngModel)]="business.woreda" />
                </label>
                <label>
                  Estimated monthly revenue
                  <input name="estimatedMonthlyRevenue" type="number" min="0" [(ngModel)]="business.estimatedMonthlyRevenue" />
                </label>
              </div>
              <es-button type="submit" [disabled]="loading()">Save business details</es-button>
            </form>
          </es-card>
        }

        @case ('kyc') {
          <es-card title="KYC documents" subtitle="Upload required sides, then submit the document set for review.">
            @if (requirements().length === 0) {
              <es-empty-state icon="description" title="No KYC requirements loaded" description="Verify your phone first, then this screen will load document requirements." />
            } @else {
              <form class="form" (ngSubmit)="submitKyc()">
                <label>
                  Document type
                  <select name="documentType" [(ngModel)]="selectedDocumentType">
                    @for (requirement of enabledRequirements(); track requirement.documentType) {
                      <option [value]="requirement.documentType">{{ requirement.displayName }}</option>
                    }
                  </select>
                </label>

                <section class="upload-grid">
                  @for (side of selectedRequirement()?.requiredSides ?? []; track side) {
                    <label class="upload">
                      {{ side }}
                      <input type="file" accept="image/*,.pdf" (change)="uploadKycFile(side, $event)" />
                    </label>
                  }
                </section>

                @if (uploadedFiles().length) {
                  <ul class="uploads">
                    @for (file of uploadedFiles(); track file.side + file.fileName) {
                      <li>{{ file.side }} · {{ file.fileName }}</li>
                    }
                  </ul>
                }

                <es-button type="submit" [disabled]="loading() || uploadedDocumentIds().length === 0">Submit KYC</es-button>
              </form>
            }
          </es-card>
        }

        @case ('settlement') {
          <es-card title="Settlement account" subtitle="Link a bank or wallet account, then select it as the default settlement account.">
            <form class="form" (ngSubmit)="linkSettlementAccount()">
              <div class="two">
                <label>
                  Bank or wallet
                  <select name="bankCode" required [(ngModel)]="settlement.bankCode">
                    @for (option of settlementOptions(); track option.code) {
                      <option [value]="option.code">{{ option.displayName }}</option>
                    }
                  </select>
                </label>
                <label>
                  Account number
                  <input name="accountNumber" required [(ngModel)]="settlement.accountNumber" />
                </label>
              </div>
              <label class="checkbox">
                <input type="checkbox" name="makeDefault" [(ngModel)]="settlement.makeDefault" />
                Make this my default settlement account
              </label>
              <es-button type="submit" [disabled]="loading()">Link account</es-button>
            </form>

            @if (bankAccounts().length) {
              <div class="accounts">
                @for (account of bankAccounts(); track account.id) {
                  <button type="button" [class.selected]="selectedBankAccountId() === account.id" (click)="selectSettlementAccount(account)">
                    <strong>{{ account.bankName || account.bankCode }}</strong>
                    <span>{{ account.accountNumber }}</span>
                    @if (account.defaultAccount) {
                      <es-status-badge label="Default" tone="success" />
                    }
                  </button>
                }
              </div>
            }
          </es-card>
        }

        @case ('review') {
          <es-card title="Review and submit" subtitle="Submit once all required onboarding checklist items are complete.">
            @if (state(); as onboardingState) {
              <div class="review">
                <div><span>Merchant</span><strong>{{ onboardingState.review?.merchant?.businessName || 'Not captured' }}</strong></div>
                <div><span>KYC</span><strong>{{ onboardingState.review?.kyc?.status || 'Not submitted' }}</strong></div>
                <div><span>Settlement</span><strong>{{ onboardingState.review?.settlementAccount?.accountNumber || 'Not linked' }}</strong></div>
              </div>
              @if (onboardingState.blockers?.length) {
                <ul class="blockers">
                  @for (blocker of onboardingState.blockers; track blocker) {
                    <li>{{ blocker }}</li>
                  }
                </ul>
              }
            }

            <form class="form" (ngSubmit)="submitOnboarding()">
              <label class="checkbox"><input type="checkbox" name="terms" [(ngModel)]="consents.terms" /> Accept terms of service</label>
              <label class="checkbox"><input type="checkbox" name="privacy" [(ngModel)]="consents.privacy" /> Accept privacy policy</label>
              <label class="checkbox"><input type="checkbox" name="nbe" [(ngModel)]="consents.nbe" /> Accept NBE consent</label>
              <es-button type="submit" [disabled]="loading() || !allConsentsAccepted()">Submit onboarding</es-button>
            </form>
          </es-card>
        }

        @case ('done') {
          <es-empty-state
            icon="check_circle"
            title="Onboarding submitted"
            [description]="approvalMessage()"
            actionLabel="Go to sign in"
            (action)="goToLogin()"
          />
        }
      }
    </main>
  `,
  styles: [
    `
      .onboarding {
        background:
          radial-gradient(circle at 12% 12%, rgba(0, 168, 121, 0.14), transparent 28%),
          radial-gradient(circle at 82% 16%, rgba(21, 89, 209, 0.12), transparent 28%),
          linear-gradient(135deg, #f8fbff 0%, #eef8f4 48%, #f7f4ff 100%);
        color: var(--es-color-neutral-900);
        min-height: 100vh;
        padding: 2rem;
      }

      .hero {
        align-items: end;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(215, 227, 241, 0.9);
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(6, 26, 64, 0.1);
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        margin: 0 auto 1.25rem;
        max-width: 72rem;
        padding: 1.5rem;
      }

      .hero h1 {
        color: #061a40;
        font-size: 2.15rem;
        letter-spacing: 0;
        margin: 0.25rem 0;
      }

      .hero p {
        color: var(--es-color-neutral-600);
        margin: 0;
        max-width: 44rem;
      }

      .hero a {
        color: var(--es-color-accent-dark);
        font-weight: 700;
        text-decoration: none;
      }

      .eyebrow {
        color: var(--es-color-accent-dark) !important;
        font-size: 0.8125rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .progress,
      es-card,
      .message,
      .error,
      .loading,
      es-empty-state {
        display: block;
        margin: 0 auto 1rem;
        max-width: 72rem;
      }

      .progress {
        display: grid;
        gap: 0.5rem;
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }

      .progress button {
        align-items: center;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-neutral-700);
        cursor: pointer;
        display: flex;
        gap: 0.5rem;
        min-height: 2.75rem;
        padding: 0 0.75rem;
      }

      .progress button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .progress button.active {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.12);
        color: var(--es-color-accent-dark);
      }

      .progress span {
        align-items: center;
        background: rgba(0, 168, 121, 0.08);
        border-radius: 999px;
        color: var(--es-color-accent-dark);
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: 800;
        height: 1.5rem;
        justify-content: center;
        width: 1.5rem;
      }

      .grid,
      .form {
        display: grid;
        gap: 1rem;
      }

      .verify {
        border-top: 1px solid var(--es-color-border);
        margin-top: 1rem;
        padding-top: 1rem;
      }

      .two {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      label {
        color: var(--es-color-neutral-700);
        display: grid;
        font-weight: 650;
        gap: 0.375rem;
      }

      input,
      select {
        background: white;
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
      }

      input:focus,
      select:focus {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
        outline: 0;
      }

      .checkbox {
        align-items: center;
        display: flex;
        gap: 0.625rem;
      }

      .checkbox input {
        min-height: auto;
      }

      .message,
      .error {
        border-radius: var(--es-radius-sm);
        padding: 0.875rem 1rem;
      }

      .message {
        background: #def7ec;
        color: #03543f;
      }

      .error {
        background: #fde8e8;
        color: #9b1c1c;
      }

      .loading {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        padding: 1rem;
      }

      .upload-grid,
      .accounts,
      .review {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      }

      .upload {
        border: 1px dashed var(--es-color-border);
        border-radius: var(--es-radius-sm);
        padding: 1rem;
      }

      .uploads,
      .blockers {
        margin: 0;
        padding-left: 1.25rem;
      }

      .accounts button {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        cursor: pointer;
        display: grid;
        gap: 0.375rem;
        padding: 1rem;
        text-align: left;
      }

      .accounts button.selected {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
      }

      .review div {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        padding: 1rem;
      }

      .review span {
        color: var(--es-color-neutral-600);
        display: block;
        font-size: 0.8125rem;
      }

      @media (max-width: 760px) {
        .onboarding {
          padding: 1rem;
        }

        .hero {
          align-items: start;
          flex-direction: column;
        }

        .progress,
        .two {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent {
  private readonly api = inject(OnboardingApiService);
  private readonly session = inject(OnboardingSessionService);

  readonly steps: { key: UiStep; label: string }[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'business', label: 'Business' },
    { key: 'kyc', label: 'KYC' },
    { key: 'settlement', label: 'Settlement' },
    { key: 'review', label: 'Review' },
  ];

  readonly businessTypes: BusinessType[] = [
    'CAFE_RESTAURANT',
    'RETAIL_SHOP',
    'TAXI_TRANSPORT',
    'ONLINE_SELLER',
    'FREELANCER',
    'OTHER',
  ];

  readonly step = signal<UiStep>('phone');
  readonly loading = signal(false);
  readonly otpRequested = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly state = signal<OnboardingStateResponse | null>(null);
  readonly requirements = signal<KycDocumentRequirementResponse[]>([]);
  readonly settlementOptions = signal<SettlementOptionResponse[]>([]);
  readonly bankAccounts = signal<BankAccountResponse[]>([]);
  readonly uploadedFiles = signal<UploadedKycFile[]>([]);
  readonly selectedBankAccountId = signal<string | null>(null);
  readonly approvalMessage = signal('Your merchant onboarding request has been submitted.');

  phone = '+251';
  otpCode = '';
  selectedDocumentType: DocumentType = 'KEBELE_ID';

  business = {
    businessName: '',
    businessNameAm: '',
    businessType: 'CAFE_RESTAURANT' as BusinessType,
    email: '',
    city: '',
    subcity: '',
    woreda: '',
    estimatedMonthlyRevenue: null as number | null,
  };

  settlement = {
    bankCode: 'CBE',
    accountNumber: '',
    makeDefault: true,
  };

  consents = {
    terms: false,
    privacy: false,
    nbe: false,
  };

  readonly enabledRequirements = computed(() =>
    this.requirements().filter((requirement) => requirement.enabled)
  );
  readonly selectedRequirement = computed(() =>
    this.enabledRequirements().find((item) => item.documentType === this.selectedDocumentType)
  );
  readonly uploadedDocumentIds = computed(() => [
    ...new Set(this.uploadedFiles().map((file) => file.documentId)),
  ]);

  requestOtp(): void {
    this.run(() =>
      this.api.requestPhoneOtp({ phone: this.phone }).subscribe({
        next: (response) => {
          this.otpRequested.set(true);
          this.message.set(
            `OTP accepted for ${response.phone}. Resend available after ${response.resendAfterSeconds} seconds.`
          );
        },
        error: (error) => this.showError(error),
        complete: () => this.loading.set(false),
      })
    );
  }

  verifyOtp(): void {
    this.run(() =>
      this.api
        .verifyPhoneOtp({ phone: this.phone, otpCode: this.otpCode })
        .pipe(
          switchMap((response) => {
            this.session.setVerification(this.phone, response);
            return forkJoin({
              state: this.api.getOnboardingState(),
              requirements: this.api.listKycRequirements(),
              settlementOptions: this.api.listSettlementOptions(),
              // bankAccounts: this.api.listBankAccounts(),
            });
          })
        )
        .subscribe({
          next: ({ state, requirements, settlementOptions }) => {
            this.state.set(state);
            this.requirements.set(requirements);
            this.setDefaultDocumentType(requirements);
            this.settlementOptions.set(settlementOptions);
            this.setDefaultSettlementOption(settlementOptions);
            // this.bankAccounts.set(bankAccounts);

            // Determine UI step from backend state; fallback to 'business'
            const uiStep = this.mapServerStepToUiStep(state?.currentStep) ?? 'business';

            // If backend supplied a current step, show a message that reflects restored state
            if (state && state.currentStep) {
              this.message.set(`Phone verified. Resuming at ${this.label(uiStep)}.`);
            } else {
              this.message.set('Phone verified. Continue with business details.');
            }

            this.step.set(uiStep);
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  submitBusinessDetails(): void {
    this.run(() => 
      this.api
        .submitBusinessDetails({
          businessName: this.business.businessName,
          businessNameAm: this.business.businessNameAm || undefined,
          businessType: this.business.businessType,
          email: this.business.email || undefined,
          address: {
            city: this.business.city || undefined,
            subcity: this.business.subcity || undefined,
            woreda: this.business.woreda || undefined,
          },
          estimatedMonthlyRevenue: this.business.estimatedMonthlyRevenue ?? undefined,
        })
        .pipe(switchMap(() => this.refreshState()))
        .subscribe({
          next: () => {
            this.message.set('Business details saved.');
            this.step.set('kyc');
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  uploadKycFile(side: DocumentSide, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.run(() =>
      this.api.uploadKycDocument(this.selectedDocumentType, side, file).subscribe({
        next: (response) => {
          this.uploadedFiles.update((files) => [
            ...files.filter((item) => item.side !== side),
            { documentId: response.documentId, side: response.side, fileName: response.fileName },
          ]);
          this.message.set(`${side} uploaded.`);
        },
        error: (error) => this.showError(error),
        complete: () => this.loading.set(false),
      })
    );
  }

  submitKyc(): void {
    this.run(() =>
      this.api
        .submitKyc({
          documentType: this.selectedDocumentType,
          documentIds: this.uploadedDocumentIds(),
        })
        .pipe(switchMap(() => this.refreshState()))
        .subscribe({
          next: () => {
            this.message.set('KYC submitted for review.');
            this.step.set('settlement');
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  linkSettlementAccount(): void {
    this.run(() =>
      this.api
        .linkBankAccount({
          bankCode: this.settlement.bankCode,
          accountNumber: this.settlement.accountNumber,
          makeDefault: this.settlement.makeDefault,
        })
        .pipe(
          switchMap((account) =>
            this.settlement.makeDefault
              ? this.api.selectSettlementAccount(account.id)
              : of(account)
          ),
          switchMap(() =>
            forkJoin({
              accounts: this.api.listBankAccounts(),
              state: this.refreshState(),
            })
          )
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(accounts.find((item) => item.defaultAccount)?.id ?? null);
            this.message.set('Settlement account linked.');
            this.step.set('review');
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  selectSettlementAccount(account: BankAccountResponse): void {
    this.run(() =>
      this.api
        .selectSettlementAccount(account.id)
        .pipe(
          switchMap(() =>
            forkJoin({
              accounts: this.api.listBankAccounts(),
              state: this.refreshState(),
            })
          )
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(account.id);
            this.message.set('Default settlement account selected.');
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  submitOnboarding(): void {
    this.run(() =>
      this.api
        .submitOnboarding({
          acceptTermsOfService: this.consents.terms,
          acceptPrivacyPolicy: this.consents.privacy,
          acceptNbeConsent: this.consents.nbe,
        })
        .subscribe({
          next: (response) => {
            this.approvalMessage.set(
              `${response.status}. ${response.nextActions?.join(' ') || 'You can now continue to sign in.'}`
            );
            this.step.set('done');
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  canVisit(target: UiStep): boolean {
    if (target === 'phone') {
      return true;
    }

    return Boolean(this.session.accessToken());
  }

  goTo(target: UiStep): void {
    if (this.canVisit(target)) {
      this.step.set(target);
    }
  }

  allConsentsAccepted(): boolean {
    return this.consents.terms && this.consents.privacy && this.consents.nbe;
  }

  label(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  goToLogin(): void {
    window.location.assign('/login');
  }

  private refreshState() {
    return this.api.getOnboardingState().pipe(
      switchMap((state) => {
        this.state.set(state);
        // If backend returned a current step, update the UI to match it
        // const uiStep = this.mapServerStepToUiStep(state?.currentStep);
        // if (uiStep) {
        //   this.step.set(uiStep);
        // }
        return of(state);
      })
    );
  }

  private mapServerStepToUiStep(serverStep?: OnboardingStep): UiStep | null {
    switch (serverStep) {
      case 'PHONE_VERIFY':
        return 'phone';
      case 'BUSINESS_DETAILS':
        return 'business';
      case 'KYC_ID_UPLOAD':
        return 'kyc';
      case 'BANK_WALLET_LINK':
        return 'settlement';
      case 'REVIEW_SUBMIT':
        return 'review';
      case 'APPROVED':
        return 'done';
      default:
        return null;
    }
  }

  private run(start: () => void): void {
    this.error.set('');
    this.message.set('');
    this.loading.set(true);
    start();
  }

  private showError(error: unknown): void {
    const maybeHttpError = error as { error?: { message?: string }; message?: string };
    this.error.set(maybeHttpError.error?.message ?? maybeHttpError.message ?? 'The onboarding request failed.');
  }

  private setDefaultDocumentType(requirements: KycDocumentRequirementResponse[]): void {
    const defaultRequirement = requirements.find((requirement) => requirement.enabled);

    if (defaultRequirement) {
      this.selectedDocumentType = defaultRequirement.documentType;
    }
  }

  private setDefaultSettlementOption(options: SettlementOptionResponse[]): void {
    const defaultOption = options[0];

    if (defaultOption) {
      this.settlement.bankCode = defaultOption.code;
    }
  }
}
