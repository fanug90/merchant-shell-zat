import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiError,
  BankAccountResponse,
  BusinessType,
  DocumentSide,
  DocumentType,
  KycDocumentRequirementResponse,
  OnboardingApiService,
  OnboardingSessionService,
  OnboardingStateResponse,
  OnboardingSubmitResponse,
  SettlementOptionResponse,
  UploadPolicyResponse,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsEmptyStateComponent,
  EsSpinnerComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { Observable, catchError, forkJoin, of, switchMap, throwError } from 'rxjs';

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


<div class="popup-container">
  @if (message()) {
    <div class="message" role="status">
      <button class="close" (click)="message.set('')">×</button>
      <span>{{ message() }}</span>
    </div>
  }

  @if (error()) {
    <div class="error" role="alert">
      <button class="close" (click)="error.set('')">×</button>
      <span>{{ error() }}</span>
    </div>
  }
</div>

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
                      <input type="file" [accept]="uploadAccept()" (change)="uploadKycFile(side, $event)" />
                    </label>
                  }
                </section>

                <!--
                   @if (uploadPolicy(); as policy) {
                     <p class="upload-policy">
                          Max {{ uploadLimitLabel(policy) }}. Accepted: {{ uploadTypeLabels(policy).join(', ') }}.
                               </p>
                                     }
                       -->


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
              <es-button type="submit" [disabled]="loading() || disableLinkAccountButton">
  Link account
</es-button>

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

            <div class="navigation">
    <button type="button" class="previous" (click)="goToPreviousStep()" [disabled]="!canGoPrevious()">Previous</button>
    <button type="button" class="next" (click)="goToNextStep()" [disabled]="!canGoNext()">Next</button>
  </div>
          </es-card>
        }

        @case ('review') {
          <es-card title="Review and submit" subtitle="Submit once all required onboarding checklist items are complete.">
            @if (state(); as onboardingState) {
              <div class="review">
                <div class="review-card"><span>Merchant</span><strong>{{ onboardingState.review?.merchant?.businessName || 'Not captured' }}</strong></div>
                <div class="review-card"><span>KYC</span><strong>{{ reviewLabel(onboardingState.review?.kyc?.status || 'Not submitted') }}</strong></div>
                <div class="review-card"><span>Settlement</span><strong>{{ onboardingState.review?.settlementAccount?.accountNumber || 'Not linked' }}</strong></div>
              </div>
            @if (onboardingState.blockers?.length) {
  <section class="attention-panel" aria-label="Items to complete">
    <ul class="blockers">
      @for (blocker of onboardingState.blockers; track blocker) {
        <li class="blocker-item">{{ reviewLabel(blocker) }}</li>
      }
    </ul>
  </section>
}



            }

            <form class="form" (ngSubmit)="submitOnboarding()">
              <label class="checkbox"><input type="checkbox" name="terms" [(ngModel)]="consents.terms" /> Accept terms of service</label>
              <label class="checkbox"><input type="checkbox" name="privacy" [(ngModel)]="consents.privacy" /> Accept privacy policy</label>
              <label class="checkbox"><input type="checkbox" name="nbe" [(ngModel)]="consents.nbe" /> Accept NBE consent</label>
              <div class="two">
                <label>
                  Password
                  <input type="password" name="password" required minlength="8" autocomplete="new-password" [(ngModel)]="password" />
                </label>
                <label>
                  Confirm password
                  <input type="password" name="confirmPassword" required minlength="8" autocomplete="new-password" [(ngModel)]="confirmPassword" />
                </label>
              </div>
              <es-button type="submit" [disabled]="loading() || !canSubmitReview()">Submit onboarding</es-button>
            </form>

            <div class="navigation">
  <button type="button" class="previous" (click)="goToPreviousStep()" [disabled]="!canGoPrevious()">Previous</button>
  </div>
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
        
.navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem; /* pushes buttons down */
}

.navigation button {
  border: none;
  border-radius: var(--es-radius-sm);
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
}

.navigation button.next {
  background: var(--es-gradient-brand); /* identical to Link account */
  color: white;
}

.navigation button.previous {
  background: #e2e8f0; /* neutral gray */
  color: #061a40;
}




.message,
.error {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: var(--es-radius-sm);
 padding: 1.5rem 1.5rem 1rem; /* extra top padding for space below X */
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;

  display: flex;
  flex-direction: column; /* ✅ stack text and button vertically */
  align-items: center;    /* ✅ center horizontally */
  gap: 0.5rem;            /* ✅ small space between text and button */
  border: none;           /* ✅ remove highlighted line */
}

close {
  position: absolute;           /* ✅ pinned in top corner */
  top: -0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  font-weight: bold;
  cursor: pointer;
  color: inherit;
}

.message span,
.error span {
  margin-bottom: 0.5rem;    /* ✅ space between text and button */
}

.continue {
  background: #0d9488; /* ✅ teal for success */
}

.retry {
  background: #b91c1c; /* ✅ red for error */
}

.close {
  position: absolute;
  top: 0rem;
  right: 0rem;
  background: none;
  border: none;
  font-size: 1.25rem;
  font-weight: bold;
  cursor: pointer;
  color: inherit;
}


.message {
  background: #def7ec;  /* green success/info background */
  color: #03543f;       /* dark green text */
}

.error {
  background: #fde8e8;  /* red error background */
  color: #9b1c1c;       /* dark red text */
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
.accounts {
  margin-top: 1rem;   /* ✅ adds space above the accounts list */
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
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
.blocker-item {
  font-weight: 700;
  color: #9b1c1c; /* red warning tone */
  background: #fde8e8; /* light red background */
  padding: 0.5rem 0.75rem;
  border-radius: var(--es-radius-sm);
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
  readonly uploadPolicy = signal<UploadPolicyResponse | null>(null);
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

  password = '';
  confirmPassword = '';

  readonly enabledRequirements = computed(() =>
    this.requirements().filter((requirement) => requirement.enabled)
  );
  readonly selectedRequirement = computed(() =>
    this.enabledRequirements().find((item) => item.documentType === this.selectedDocumentType)
  );
  readonly uploadedDocumentIds = computed(() => [
    ...new Set(this.uploadedFiles().map((file) => file.documentId)),
  ]);
  readonly uploadAccept = computed(() => {
    const contentTypes = this.uploadPolicy()?.allowedContentTypes;

    return contentTypes?.length ? contentTypes.join(',') : 'image/*,.pdf';
  });

  constructor() {
    this.api.getUploadPolicy().subscribe({
      next: (policy) => this.uploadPolicy.set(policy),
      error: () => this.uploadPolicy.set(null),
    });
  }

  requestOtp(): void {
    this.run(() =>
      this.api.requestPhoneOtp({ phone: this.phone }).subscribe({
        next: (response) => {
          this.otpRequested.set(true);
          this.showMessage(
            `OTP accepted for ${response.phone}. Resend available after ${response.resendAfterSeconds} seconds.`
          );
        },
        error: (error) => this.showErrorMessage(error),
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
            this.showMessage('Phone verified. Continue with business details.');
            this.step.set('business');
          },
          error: (error) => this.showErrorMessage(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  private showMessage(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message.set(''), 4000); // auto‑dismiss after 4s
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
            this.showMessage('Business details saved.');
            this.step.set('kyc');
          },
          error: (error) => this.showErrorMessage(error),
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

    const validationError = this.validateUpload(file);

    if (validationError) {
      input.value = '';
      this.error.set(validationError);
      this.message.set('');
      return;
    }

    this.run(() =>
      this.api.uploadKycDocument(this.selectedDocumentType, side, file).subscribe({
        next: (response) => {
          this.uploadedFiles.update((files) => [
            ...files.filter((item) => item.side !== side),
            { documentId: response.documentId, side: response.side, fileName: response.fileName },
          ]);
          this.showMessage(`${side} uploaded.`);
        },
        error: (error) => this.showErrorMessage(error),
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
            this.showMessage('KYC submitted for review.');
            this.step.set('settlement');
            this.refreshBankAccounts();
          },
          error: (error) => this.showErrorMessage(error),
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
              accounts: this.loadBankAccounts(),
              state: this.refreshState(),
            })
          )
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(accounts.find((item) => item.defaultAccount)?.id ?? null);
            this.showMessage('Settlement account linked.');
            this.step.set('review');
          },
          error: (error) => this.showErrorMessage(error),
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
              accounts: this.loadBankAccounts(),
              state: this.refreshState(),
            })
          )
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(account.id);
            this.showMessage('Default settlement account selected.');
          },
          error: (error) => this.showErrorMessage(error),
          complete: () => this.loading.set(false),
        })
    );
  }

  submitOnboarding(): void {
    if (this.password !== this.confirmPassword) {
      this.showErrorMessage('Passwords do not match.');
      return;
    }

    this.run(() =>
      this.api
        .submitOnboarding({
          acceptTermsOfService: this.consents.terms,
          acceptPrivacyPolicy: this.consents.privacy,
          acceptNbeConsent: this.consents.nbe,
          password: this.password,
          confirmPassword: this.confirmPassword,
        })
        .subscribe({
          next: (response) => {
            this.approvalMessage.set(this.formatSubmitSuccessMessage(response));
            this.step.set('done');
          },
          error: (error) => this.showErrorMessage(error),
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

      if (target === 'settlement') {
        this.refreshBankAccounts();
      }
    }
  }

  allConsentsAccepted(): boolean {
    return this.consents.terms && this.consents.privacy && this.consents.nbe;
  }

  canSubmitReview(): boolean {
    return (
      this.allConsentsAccepted() &&
      this.password.length >= 8 &&
      this.password === this.confirmPassword
    );
  }

  label(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  reviewLabel(value: string): string {
    return this.label(value)
      .replace(/\bKyc\b/g, 'KYC')
      .replace(/\bNbe\b/g, 'NBE');
  }

  uploadLimitLabel(policy: UploadPolicyResponse): string {
    return policy.maxFileSizeLabel || this.formatFileSize(policy.maxFileSizeBytes);
  }

  uploadTypeLabels(policy: UploadPolicyResponse): string[] {
    return policy.allowedContentTypes.map((contentType) =>
      contentType.replace('application/', '').replace('image/', '').toUpperCase()
    );
  }

  private formatSubmitSuccessMessage(response: OnboardingSubmitResponse): string {
    const actions = response.nextActions?.map((action) => this.label(action));

    if (!actions?.length) {
      return 'Onboarding complete. You can now sign in.';
    }

    if (actions.length === 1) {
      return `Onboarding complete. ${actions[0]}.`;
    }

    const last = actions[actions.length - 1];
    const rest = actions.slice(0, -1).join(', ');
    return `Onboarding complete. ${rest}, and ${last}.`;
  }

  goToLogin(): void {
    window.location.assign('/login');
  }

  private refreshState() {
    return this.api.getOnboardingState().pipe(
      switchMap((state) => {
        this.state.set(state);
        return of(state);
      })
    );
  }

  private run(start: () => void): void {
    this.error.set('');
    this.message.set('');
    this.loading.set(true);
    start();
  }

  private showErrorMessage(error: unknown): void {
    this.loading.set(false);
    const httpError = error as { error?: ApiError; message?: string };
    const body = httpError.error;
    let message = body?.message ?? httpError.message ?? 'The onboarding request failed.';

    if (body?.details) {
      const detailText = Object.entries(body.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join('. ');
      if (detailText) {
        message = `${message} ${detailText}`;
      }
    }

    this.error.set(message);

    // ✅ Auto‑dismiss after 4 seconds
    setTimeout(() => this.error.set(''), 4000);
  }

  private validateUpload(file: File): string | null {
    const policy = this.uploadPolicy();

    if (!policy) {
      return null;
    }

    if (file.size > policy.maxFileSizeBytes) {
      return `${file.name} is too large. Maximum upload size is ${this.uploadLimitLabel(policy)}.`;
    }

    if (!this.isAllowedContentType(file, policy.allowedContentTypes)) {
      return `${file.name} is not an accepted file type. Accepted: ${this.uploadTypeLabels(policy).join(', ')}.`;
    }

    return null;
  }

  private isAllowedContentType(file: File, allowedContentTypes: string[]): boolean {
    if (file.type && allowedContentTypes.includes(file.type)) {
      return true;
    }

    return allowedContentTypes.some((contentType) =>
      this.extensionsForContentType(contentType).some((extension) =>
        file.name.toLowerCase().endsWith(extension)
      )
    );
  }

  private extensionsForContentType(contentType: string): string[] {
    const extensions: Record<string, string[]> = {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    };

    return extensions[contentType] ?? [];
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.ceil(bytes / 1024)}KB`;
    }

    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  disableLinkAccountButton = false;

  private refreshBankAccounts(): void {
    this.loadBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccounts.set(accounts);
        this.disableLinkAccountButton = accounts.length >= 5;
      },
      error: (error) => this.showErrorMessage(error),
      complete: () => this.loading.set(false),
    });
  }


  private loadBankAccounts(): Observable<BankAccountResponse[]> {
    return this.api.listBankAccounts().pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 403 ? of([]) : throwError(() => error)
      )
    );
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

  goToNextStep(): void {
    const order: UiStep[] = ['phone', 'business', 'kyc', 'settlement', 'review', 'done'];
    const currentIndex = order.indexOf(this.step());
    if (currentIndex < order.length - 1) {
      this.step.set(order[currentIndex + 1]);
    }
  }

  goToPreviousStep(): void {
    const order: UiStep[] = ['phone', 'business', 'kyc', 'settlement', 'review', 'done'];
    const currentIndex = order.indexOf(this.step());
    if (currentIndex > 0) {
      this.step.set(order[currentIndex - 1]);
    }
  }

  canGoNext(): boolean {
    return this.step() !== 'done';
  }

  canGoPrevious(): boolean {
    return this.step() !== 'phone';
  }



}
