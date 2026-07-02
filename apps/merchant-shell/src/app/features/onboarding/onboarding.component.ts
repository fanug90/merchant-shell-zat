import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import {
  BankAccountResponse,
  BusinessType,
  DocumentSide,
  DocumentType,
  KycDocumentOption,
  KycRequirementGroup,
  MerchantResponse,
  OnboardingApiService,
  OnboardingSessionService,
  OnboardingStateResponse,
  OnboardingStep,
  SettlementOptionResponse,
  SideUploadStatus,
  UploadPolicy,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsEmptyStateComponent,
  EsSpinnerComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';

type UiStep = 'phone' | 'business' | 'kyc' | 'settlement' | 'review' | 'done';

interface UploadedKycFile {
  documentId: string;
  documentType: DocumentType;
  side: DocumentSide;
  fileUrl?: string;
  fileName: string;
}

/** Track which document type the user has selected per group code */
type GroupSelection = Record<string, DocumentType>;

@Component({
  selector: 'es-onboarding',
  host: {
    '(document:keydown.escape)': 'closePreview()',
  },
  standalone: true,
  imports: [
    FormsModule,
    EsButtonComponent,
    EsCardComponent,
    EsEmptyStateComponent,
    EsSpinnerComponent,
    EsStatusBadgeComponent,
    NgTemplateOutlet,
  ],
  template: `
    <main class="onboarding">
      <section class="hero">
        <div>
          <p class="eyebrow">Create account</p>
          <h1>Open your merchant workspace</h1>
          <p>
            Verify your phone, register the business, upload KYC documents, and
            choose a settlement account.
          </p>
        </div>
        <a href="/login">Back to welcome</a>
      </section>

      <section class="progress" aria-label="Onboarding progress">
        @for (item of steps; track item.key) {
          <button
            type="button"
            [class.active]="step() === item.key"
            [disabled]="!canVisit(item.key)"
            (click)="goTo(item.key)"
          >
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
              <label for="phone-input">
                Phone number
                <input
                  id="phone-input"
                  name="phone"
                  required
                  placeholder="+251912345678"
                  autocomplete="tel"
                  [(ngModel)]="phone"
                />
              </label>
              <es-button type="submit" [disabled]="loading()"
                >Send OTP</es-button
              >
            </form>

            <form class="grid verify" (ngSubmit)="verifyOtp()">
              <label for="otp-input">
                OTP code
                <input
                  id="otp-input"
                  name="otpCode"
                  required
                  maxlength="6"
                  minlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="842190"
                  [(ngModel)]="otpCode"
                />
              </label>
              <es-button
                type="submit"
                variant="secondary"
                [disabled]="loading() || !otpRequested()"
                >Verify and continue</es-button
              >
            </form>
          </es-card>
        }

        @case ('business') {
          <es-card
            title="Business details"
            subtitle="Provide your business information to create your merchant account."
          >
            <form class="form" (ngSubmit)="submitBusinessDetails()">
              <div class="two">
                <label for="businessName">
                  Business name
                  <input
                    id="businessName"
                    name="businessName"
                    required
                    [(ngModel)]="business.businessName"
                  />
                </label>
                <label for="businessNameAm">
                  Amharic business name
                  <input
                    id="businessNameAm"
                    name="businessNameAm"
                    [(ngModel)]="business.businessNameAm"
                  />
                </label>
              </div>
              <div class="two">
                <label for="businessType">
                  Business type
                  <select
                    id="businessType"
                    name="businessType"
                    required
                    [(ngModel)]="business.businessType"
                  >
                    @for (type of businessTypes; track type) {
                      <option [value]="type">{{ label(type) }}</option>
                    }
                  </select>
                </label>
                <label for="email">
                  Email
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    [(ngModel)]="business.email"
                  />
                </label>
              </div>
              <div class="two">
                <label for="city">
                  City
                  <input id="city" name="city" [(ngModel)]="business.city" />
                </label>
                <label for="subcity">
                  Subcity
                  <input
                    id="subcity"
                    name="subcity"
                    [(ngModel)]="business.subcity"
                  />
                </label>
              </div>
              <div class="two">
                <label for="woreda">
                  Woreda
                  <input
                    id="woreda"
                    name="woreda"
                    [(ngModel)]="business.woreda"
                  />
                </label>
                <label for="revenue">
                  Estimated monthly revenue
                  <input
                    id="revenue"
                    name="estimatedMonthlyRevenue"
                    type="number"
                    min="0"
                    [(ngModel)]="business.estimatedMonthlyRevenue"
                  />
                </label>
              </div>
              <es-button type="submit" [disabled]="loading()"
                >Save business details</es-button
              >
            </form>
          </es-card>
        }

        @case ('kyc') {
          <es-card
            title="KYC documents"
            subtitle="Upload required identity and business documents for review."
          >
            @if (kycGroups().length === 0) {
              <es-empty-state
                icon="description"
                title="No KYC requirements loaded"
                description="Verify your phone first, then this screen will load document requirements."
              />
            } @else {
              <div class="kyc-groups">
                @for (group of kycGroups(); track group.code) {
                  <section
                    class="kyc-group"
                    [attr.aria-labelledby]="'group-' + group.code"
                  >
                    <!-- Group header -->
                    <div class="kyc-group__header">
                      <div>
                        <h3 [id]="'group-' + group.code">
                          {{ group.displayName }}
                        </h3>
                        <p class="kyc-group__meta">
                          @if (group.selectionMode === 'ONE_OF') {
                            Choose one of the following document types.
                          } @else {
                            All of the following documents are required
                          }
                        </p>

                             <!-- Upload policy hint -->
              @if (uploadPolicy(); as policy) {
                <p class="upload-hint" aria-live="polite">
                  Accepted formats: {{ allowedFormatsLabel(policy) }} · Max
                  size: {{ policy.maxFileSizeLabel }}
                </p>
              }

                      </div>
                      @if (group.satisfied) {
                        <es-status-badge label="Complete" tone="success" />
                      } @else {
                        <es-status-badge label="Incomplete" tone="warning" />
                      }
                    </div>

                    <!-- ONE_OF: dropdown selector -->
                    @if (group.selectionMode === 'ONE_OF') {
                      <label
                        [for]="'select-' + group.code"
                        class="doc-select-label"
                      >
                        Document type
                        <select
                          [id]="'select-' + group.code"
                          [name]="'doc-type-' + group.code"
                          [attr.aria-label]="
                            'Choose document type for ' + group.displayName
                          "
                          (change)="
                            selectDocumentType(
                              group.code,
                              $any($event.target).value
                            )
                          "
                        >
                          @for (
                            option of group.options;
                            track option.documentType
                          ) {
                            <option
                              [value]="option.documentType"
                              [selected]="
                                groupSelections()[group.code] ===
                                option.documentType
                              "
                            >
                              {{ option.displayName }}
                              @if (isOptionComplete(option)) {
                                ✓
                              }
                            </option>
                          }
                        </select>
                      </label>

                      <!-- Upload area for the selected option -->
                      @if (selectedOption(group); as option) {
                        <div class="upload-area">
                          <ng-container
                            *ngTemplateOutlet="
                              sideUploads;
                              context: { option, group }
                            "
                          />
                        </div>
                      }
                    }

                    <!-- ALL_OF: dropdown locked to the single required option, ready for future types -->
                    @if (group.selectionMode === 'ALL_OF') {
                      @for (
                        option of group.options;
                        track option.documentType
                      ) {
                        <div class="upload-area all-of">
                          <label
                            [for]="'select-allof-' + option.documentType"
                            class="doc-select-label"
                          >
                            Document type
                            <select
                              [id]="'select-allof-' + option.documentType"
                              disabled
                              [attr.aria-label]="
                                option.displayName + ' (required)'
                              "
                            >
                              <option [value]="option.documentType" selected>
                                {{ option.displayName }}
                              </option>
                            </select>
                          </label>
                          @if (isOptionComplete(option)) {
                            <div class="upload-area__status">
                              <es-status-badge
                                label="Complete"
                                tone="success"
                              />
                            </div>
                          } @else if (uploadedSidesCount(option) > 0) {
                            <div class="upload-area__status">
                              <es-status-badge
                                [label]="
                                  uploadedSidesCount(option) +
                                  '/' +
                                  option.requiredSides.length +
                                  ' sides'
                                "
                                tone="warning"
                              />
                            </div>
                          }
                          <ng-container
                            *ngTemplateOutlet="
                              sideUploads;
                              context: { option, group }
                            "
                          />
                        </div>
                      }
                    }
                  </section>
                }
              </div>

              <!-- Upload policy hint
              @if (uploadPolicy(); as policy) {
                <p class="upload-hint" aria-live="polite">
                  Accepted formats: {{ allowedFormatsLabel(policy) }} · Max
                  size: {{ policy.maxFileSizeLabel }}
                </p>
              } -->

              <!-- Submit all KYC -->
              <div class="kyc-submit">
                 @if (kycSubmitError()) {
    <p class="kyc-submit__error" role="alert">{{ kycSubmitError() }}</p>
  }
                <es-button
                  [disabled]="loading() || !allGroupsSatisfied() || anyUploadInProgress()"
                  (click)="submitAllKyc()"
                >
                  Submit KYC documents
                </es-button>
              </div>
            }
          </es-card>

          <ng-template #sideUploads let-option="option" let-group="group">
            <div class="side-uploads">
              @for (side of option.requiredSides; track side) {
                <div
                  class="side-upload"
                  [class.side-upload--done]="
                    isSideUploaded(option.documentType, side)
                  "
                  [class.side-upload--uploading]="
                    isUploading(option.documentType, side)
                  "
                >
                  <div class="side-upload__meta">
                    <span class="side-label">{{ side }}</span>
                    @if (isSideUploaded(option.documentType, side)) {
                      <span class="side-done" aria-label="Uploaded">✓</span>
                    }
                  </div>

                  <div class="side-upload__actions">
                    @if (isSideUploaded(option.documentType, side)) {
                      <button
                        type="button"
                        class="view-button"
                        [disabled]="isUploading(option.documentType, side)"
                        (click)="openPreview(option.documentType, side)"
                      >
                        View
                      </button>
                    }

                    <label
                      [for]="'file-' + option.documentType + '-' + side"
                      class="file-label"
                      [class.file-label--disabled]="
                        isUploading(option.documentType, side)
                      "
                    >
                      <span>
                        @if (isUploading(option.documentType, side)) {
                          <span
                            class="file-label__spinner"
                            aria-hidden="true"
                          ></span>
                          Uploading…
                        } @else {
                          {{
                            isSideUploaded(option.documentType, side)
                              ? 'Replace file'
                              : 'Choose file'
                          }}
                        }
                      </span>
                      <input
                        [id]="'file-' + option.documentType + '-' + side"
                        type="file"
                        [accept]="acceptAttr()"
                        [disabled]="isUploading(option.documentType, side)"
                        [attr.aria-label]="
                          option.displayName + ' ' + side + ' side'
                        "
                        (change)="onFileChange(option, side, $event)"
                      />
                    </label>
                  </div>

                  @if (sideStatusFor(option.documentType, side); as status) {
                    <p
                      class="side-upload__status"
                      [class.side-upload__status--error]="
                        status.type === 'error'
                      "
                      [class.side-upload__status--success]="
                        status.type === 'success'
                      "
                      role="status"
                      aria-live="polite"
                    >
                      {{ status.message }}
                    </p>
                  }
                </div>
              }
            </div>
          </ng-template>
        }

        @case ('settlement') {
          <es-card
            title="Settlement account"
            subtitle="Link a bank or wallet account, then select it as the default settlement account."
          >
            <form class="form" (ngSubmit)="linkSettlementAccount()">
              <div class="two">
                <label for="bankCode">
                  Bank or wallet
                  <select
                    id="bankCode"
                    name="bankCode"
                    required
                    [(ngModel)]="settlement.bankCode"
                  >
                    @for (option of settlementOptions(); track option.code) {
                      <option [value]="option.code">
                        {{ option.displayName }}
                      </option>
                    }
                  </select>
                </label>
                <label for="accountNumber">
                  Account number
                  <input
                    id="accountNumber"
                    name="accountNumber"
                    required
                    [(ngModel)]="settlement.accountNumber"
                  />
                </label>
              </div>
              <label class="checkbox">
                <input
                  type="checkbox"
                  name="makeDefault"
                  [(ngModel)]="settlement.makeDefault"
                />
                Make this my default settlement account
              </label>
              <es-button type="submit" [disabled]="loading()"
                >Link account</es-button
              >
            </form>

            @if (bankAccounts().length) {
              <div class="accounts">
                @for (account of bankAccounts(); track account.id) {
                  <button
                    type="button"
                    [class.selected]="selectedBankAccountId() === account.id"
                    (click)="selectSettlementAccount(account)"
                    [attr.aria-pressed]="selectedBankAccountId() === account.id"
                  >
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
          <es-card
            title="Review and submit"
            subtitle="Submit once all required onboarding checklist items are complete."
          >
            @if (state(); as onboardingState) {
              <div class="review">
                <div>
                  <span>Merchant</span
                  ><strong>{{
                    onboardingState.review?.merchant?.businessName ||
                      'Not captured'
                  }}</strong>
                </div>
                <div>
                  <span>KYC</span
                  ><strong>{{
                    onboardingState.review?.kyc?.status || 'Not submitted'
                  }}</strong>
                </div>
                <div>
                  <span>Settlement</span
                  ><strong>{{
                    onboardingState.review?.settlementAccount?.accountNumber ||
                      'Not linked'
                  }}</strong>
                </div>
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
              <label class="checkbox"
                ><input
                  type="checkbox"
                  name="terms"
                  [(ngModel)]="consents.terms"
                />
                Accept terms of service</label
              >
              <label class="checkbox"
                ><input
                  type="checkbox"
                  name="privacy"
                  [(ngModel)]="consents.privacy"
                />
                Accept privacy policy</label
              >
              <label class="checkbox"
                ><input type="checkbox" name="nbe" [(ngModel)]="consents.nbe" />
                Accept NBE consent</label
              >
              <es-button
                type="submit"
                [disabled]="loading() || !allConsentsAccepted()"
                >Submit onboarding</es-button
              >
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

    @if (previewFile(); as file) {
      <div
        class="preview-overlay"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="file.fileName + ' preview'"
        (click)="closePreview()"
      >
        <div class="preview-dialog">
          <button
            type="button"
            class="preview-close"
            (click)="closePreview()"
            aria-label="Close preview"
          >
            ✕
          </button>
          @if (file.fileUrl) {
            <img
              [src]="file.fileUrl"
              [alt]="file.fileName"
              class="preview-image"
            />
          } @else {
            <p class="preview-empty">No preview available for this file.</p>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .onboarding {
        background:
          radial-gradient(
            circle at 12% 12%,
            rgba(0, 168, 121, 0.14),
            transparent 28%
          ),
          radial-gradient(
            circle at 82% 16%,
            rgba(21, 89, 209, 0.12),
            transparent 28%
          ),
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
        white-space: nowrap;
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
        min-width: 1.5rem;
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

      input:not([type='radio']):not([type='checkbox']):not([type='file']),
      select {
        background: white;
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
      }

      input:not([type='radio']):not([type='checkbox']):not([type='file']):focus,
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
        margin: 0 auto 1rem;
        max-width: 72rem;
      }

      /* ── KYC groups ───────────────────────────────── */

      .kyc-groups {
        display: grid;
        gap: 1.5rem;
      }

      .kyc-group {
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        padding: 1.25rem;
      }

      .kyc-group__header {
        align-items: flex-start;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      .kyc-group__header h3 {
        color: var(--es-color-neutral-900);
        font-size: 1rem;
        margin: 0 0 0.25rem;
      }

      .kyc-group__meta {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-weight: 400;
        margin: 0;
      }

      /* ── Document type dropdown ───────────────────── */

      .doc-select-label {
        color: var(--es-color-neutral-700);
        display: grid;
        font-size: 0.875rem;
        font-weight: 650;
        gap: 0.375rem;
        margin-bottom: 1rem;
      }

      .doc-select-label select {
        background: white;
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
      }

      .doc-select-label select:focus {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
        outline: 0;
      }

      .doc-select-label select:disabled {
        background: var(--es-color-neutral-100);
        color: var(--es-color-neutral-700);
        cursor: not-allowed;
        opacity: 0.8;
      }

      /* ── Upload area ─────────────────────────────── */

      .upload-area {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        padding: 1rem;
      }

      .upload-area.all-of {
        margin-bottom: 0.75rem;
      }

      .upload-area__status {
        margin-bottom: 0.75rem;
      }

      .side-uploads {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      }

      .side-upload {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        display: grid;
        gap: 0.5rem;
        padding: 0.875rem;
      }

      .side-upload--done {
        border-color: var(--es-color-accent);
      }

      .side-upload__meta {
        align-items: center;
        display: flex;
        gap: 0.5rem;
        justify-content: space-between;
      }

      .side-label {
        color: var(--es-color-neutral-700);
        font-size: 0.8125rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .side-done {
        color: var(--es-color-accent-dark);
        font-weight: 800;
      }

      .file-label {
        cursor: pointer;
        display: block;
        font-weight: 400;
      }

      .file-label span {
        align-items: center;
        background: white;
        border: 1px dashed var(--es-color-border);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-primary);
        display: flex;
        font-size: 0.8125rem;
        font-weight: 700;
        justify-content: center;
        min-height: 2.25rem;
        padding: 0 0.75rem;
        transition:
          background-color 120ms ease,
          border-color 120ms ease;
      }

      .file-label:hover span {
        background: rgba(0, 128, 251, 0.05);
        border-color: var(--es-color-primary);
      }

      .file-label input[type='file'] {
        height: 0;
        opacity: 0;
        position: absolute;
        width: 0;
      }

      .expiry-label {
        color: var(--es-color-neutral-700);
        display: grid;
        font-size: 0.8125rem;
        font-weight: 650;
        gap: 0.25rem;
      }

      .expiry-label input[type='date'] {
        background: white;
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm);
        min-height: 2.25rem;
        padding: 0 0.625rem;
      }

      .file-error {
        color: #9b1c1c;
        font-size: 0.8125rem;
        margin: 0;
      }

      /* ── Upload hint & submit ─────────────────────── */

      .upload-hint {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 1rem 0 0;
      }

      .kyc-submit {
        border-top: 1px solid var(--es-color-border);
        margin-top: 1.25rem;
        padding-top: 1.25rem;
      }

      .kyc-submit__error {
  background: #fde8e8;
  border-radius: var(--es-radius-sm);
  color: #9b1c1c;
  font-size: 0.8125rem;
  margin: 0 0 0.75rem;
  padding: 0.625rem 0.875rem;
}

      .file-error {
        color: #9b1c1c;
        font-size: 0.8125rem;
        margin: 0;
      }

      /* image preview (popup) styles */

      .side-upload__actions {
        display: grid;
        gap: 0.5rem;
      }

      .view-button {
        background: white;
        border: 1px solid var(--es-color-accent);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-accent-dark);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 700;
        min-height: 2.25rem;
        padding: 0 0.75rem;
      }

      .view-button:hover {
        background: rgba(0, 168, 121, 0.08);
      }

      .preview-overlay {
        align-items: center;
        background: rgba(6, 26, 64, 0.72);
        cursor: pointer;
        display: grid;
        inset: 0;
        justify-items: center;
        padding: 2rem;
        position: fixed;
        z-index: 1000;
      }

      .preview-dialog {
        background: white;
        border-radius: var(--es-radius-md);
        cursor: default;
        display: grid;
        gap: 0.75rem;
        max-height: 90vh;
        max-width: min(90vw, 40rem);
        padding: 1rem;
        position: relative;
      }

      .preview-close {
        background: var(--es-color-neutral-100);
        border: 1px solid var(--es-color-border);
        border-radius: 999px;
        cursor: pointer;
        height: 2rem;
        position: absolute;
        right: 0.75rem;
        top: 0.75rem;
        width: 2rem;
      }

      .preview-image {
        border-radius: var(--es-radius-sm);
        max-height: 80vh;
        max-width: 100%;
        object-fit: contain;
      }

      .preview-empty {
        color: var(--es-color-neutral-600);
        margin: 1rem;
      }

      /* style for uploading and error message displaying in each line when image uploads */

      .side-upload {
        position: relative;
      }

      .side-upload--uploading {
        border-color: var(--es-color-primary);
      }

      .side-upload__status {
        border-radius: var(--es-radius-sm);
        font-size: 0.8125rem;
        margin: 0;
        padding: 0.5rem 0.625rem;
      }

      .side-upload__status--success {
        background: #def7ec;
        color: #03543f;
      }

      .side-upload__status--error {
        background: #fde8e8;
        color: #9b1c1c;
      }

      .file-label--disabled {
        cursor: not-allowed;
      }

      .file-label--disabled span {
        opacity: 0.75;
      }

      .file-label__spinner {
        animation: side-upload-spin 800ms linear infinite;
        border: 2px solid rgba(0, 128, 251, 0.25);
        border-radius: 999px;
        border-top-color: var(--es-color-primary);
        display: inline-block;
        height: 0.875rem;
        margin-right: 0.375rem;
        vertical-align: -2px;
        width: 0.875rem;
      }

      @keyframes side-upload-spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* ── Settlement ───────────────────────────────── */

      .accounts {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        margin-top: 1rem;
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

      /* ── Review ───────────────────────────────────── */

      .review {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        margin-bottom: 1rem;
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

      .blockers {
        margin: 0 0 1rem;
        padding-left: 1.25rem;
      }

      /* ── Accessibility ────────────────────────────── */

      .sr-only {
        border: 0;
        clip: rect(0 0 0 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
        width: 1px;
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

        .doc-options,
        .side-uploads {
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
  readonly settlementOptions = signal<SettlementOptionResponse[]>([]);
  readonly bankAccounts = signal<BankAccountResponse[]>([]);
  readonly selectedBankAccountId = signal<string | null>(null);
  readonly approvalMessage = signal(
    'Your merchant onboarding request has been submitted.',
  );
  readonly uploadPolicy = signal<UploadPolicy | null>(null);

  /** Which document type is selected per group code (for ONE_OF groups) */
  readonly groupSelections = signal<GroupSelection>({});

  /** All uploaded files, keyed by documentType + side */
  readonly uploadedFiles = signal<UploadedKycFile[]>([]);

  /** File currently shown in the preview modal (null = closed) */
  readonly previewFile = signal<UploadedKycFile | null>(null);

  /** Slots currently uploading, keyed by "documentType-side" */
  readonly uploadingKeys = signal<Set<string>>(new Set());

  /** Error shown next to the "Submit KYC documents" button */
  readonly kycSubmitError = signal('');

  /** Last success/error message per slot, keyed by "documentType-side" */
  readonly sideStatus = signal<Record<string, SideUploadStatus>>({});

  readonly anyUploadInProgress = computed(() => this.uploadingKeys().size > 0);

  phone = '+251';
  otpCode = '';

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

  /** KYC requirement groups from the onboarding state */
  readonly kycGroups = computed<KycRequirementGroup[]>(
    () => this.state()?.kycRequirements ?? [],
  );

  /** The accept attribute value derived from the upload policy */
  readonly acceptAttr = computed<string>(() => {
    const policy = this.uploadPolicy();
    return policy
      ? policy.allowedContentTypes.join(',')
      : 'application/pdf,image/jpeg,image/png,image/webp';
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** True when the minimum required business fields are filled. */

  businessFormValid(): boolean {
    return this.business.businessName.trim().length > 0;
  }

  isOptionComplete(option: KycDocumentOption): boolean {
    return option.requiredSides.every((side) =>
      this.isSideUploaded(option.documentType, side),
    );
  }

  uploadedSidesCount(option: KycDocumentOption): number {
    return option.requiredSides.filter((side) =>
      this.isSideUploaded(option.documentType, side),
    ).length;
  }

  uploadedFileFor(
    documentType: DocumentType,
    side: DocumentSide,
  ): UploadedKycFile | undefined {
    return this.uploadedFiles().find(
      (f) => f.documentType === documentType && f.side === side,
    );
  }

  selectedOption(group: KycRequirementGroup): KycDocumentOption | undefined {
    const selected = this.groupSelections()[group.code];
    return group.options.find((o) => o.documentType === selected);
  }

  isSideUploaded(documentType: DocumentType, side: DocumentSide): boolean {
    return this.uploadedFiles().some(
      (f) => f.documentType === documentType && f.side === side,
    );
  }

  openPreview(documentType: DocumentType, side: DocumentSide): void {
    const file = this.uploadedFileFor(documentType, side);
    if (file) {
      this.previewFile.set(file);
    }
  }

  closePreview(): void {
    this.previewFile.set(null);
  }

  //helper methods for display images in their line rather than intop which is not convenent to see for user

  private keyFor(documentType: DocumentType, side: DocumentSide): string {
    return `${documentType}-${side}`;
  }

  isUploading(documentType: DocumentType, side: DocumentSide): boolean {
    return this.uploadingKeys().has(this.keyFor(documentType, side));
  }

  sideStatusFor(
    documentType: DocumentType,
    side: DocumentSide,
  ): SideUploadStatus | null {
    return this.sideStatus()[this.keyFor(documentType, side)] ?? null;
  }

  private beginUpload(key: string): void {
    this.uploadingKeys.update((keys) => new Set(keys).add(key));
  }

  private endUpload(key: string): void {
    this.uploadingKeys.update((keys) => {
      const next = new Set(keys);
      next.delete(key);
      return next;
    });
  }

  private setSideStatus(
    key: string,
    type: SideUploadStatus['type'],
    message: string,
  ): void {
    this.sideStatus.update((statuses) => ({
      ...statuses,
      [key]: { type, message },
    }));
  }

  private clearSideStatus(key: string): void {
    this.sideStatus.update((statuses) => {
      const next = { ...statuses };
      delete next[key];
      return next;
    });
  }

  private extractErrorMessage(error: unknown): string {
    const maybeHttpError = error as {
      error?: { message?: string };
      message?: string;
    };
    return (
      maybeHttpError.error?.message ??
      maybeHttpError.message ??
      'The upload failed. Please try again.'
    );
  }

  // allGroupsHaveUploads(): boolean {
  //   return this.kycGroups().every((group) => {
  //     if (group.selectionMode === 'ONE_OF') {
  //       const selected = this.groupSelections()[group.code];
  //       if (!selected) return false;
  //       const option = group.options.find((o) => o.documentType === selected);
  //       if (!option) return false;
  //       return option.requiredSides.every((side) => this.isSideUploaded(selected, side));
  //     }
  //     // ALL_OF
  //     return group.options.every((option) =>
  //       option.requiredSides.every((side) => this.isSideUploaded(option.documentType, side))
  //     );
  //   });
  // }

  allGroupsSatisfied(): boolean {
    const groups = this.kycGroups();
    return groups.length > 0 && groups.every((g) => g.satisfied);
  }

  allowedFormatsLabel(policy: UploadPolicy): string {
    return policy.allowedContentTypes
      .map((mime) => mime.split('/')[1]?.toUpperCase() ?? mime)
      .join(', ');
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  selectDocumentType(groupCode: string, documentType: DocumentType): void {
    this.groupSelections.update((prev) => ({
      ...prev,
      [groupCode]: documentType,
    }));
  }

  // onFileChange(
  //   option: KycDocumentOption,
  //   side: DocumentSide,
  //   event: Event,
  // ): void {
  //   const input = event.target as HTMLInputElement;
  //   const file = input.files?.[0];
  //   if (!file) return;

  //   const key = `${option.documentType}-${side}`;

  //   // Client-side validation against upload policy
  //   const policy = this.uploadPolicy();
  //   if (policy) {
  //     if (file.size > policy.maxFileSizeBytes) {
  //       this.fileErrors.update((e) => ({
  //         ...e,
  //         [key]: `File exceeds the ${policy.maxFileSizeLabel} size limit.`,
  //       }));
  //       input.value = '';
  //       return;
  //     }
  //     if (!policy.allowedContentTypes.includes(file.type)) {
  //       this.fileErrors.update((e) => ({
  //         ...e,
  //         [key]: `Only ${this.allowedFormatsLabel(policy)} files are accepted.`,
  //       }));
  //       input.value = '';
  //       return;
  //     }
  //   }

  //   // Clear any prior error for this field
  //   this.fileErrors.update((e) => {
  //     const next = { ...e };
  //     delete next[key];
  //     return next;
  //   });

  //   this.run(() =>
  //     this.api
  //       .uploadKycDocument(option.documentType, side, file)
  //       .pipe(
  //         switchMap((response) => {
  //           // Record the upload locally first so the file name/id is available
  //           this.uploadedFiles.update((files) => [
  //             ...files.filter(
  //               (f) =>
  //                 !(f.documentType === option.documentType && f.side === side),
  //             ),
  //             {
  //               documentId: response.documentId,
  //               documentType: option.documentType,
  //               side: response.side,
  //               fileName: response.fileName,
  //               fileUrl: response.fileUrl,
  //             },
  //           ]);
  //           // Then refresh state so the server's uploadedSides/complete/satisfied
  //           return this.refreshState();
  //         }),
  //       )
  //       .subscribe({
  //         next: () => {
  //           this.message.set(`${option.displayName} ${side} uploaded.`);
  //         },
  //         error: (err: unknown) => this.showError(err),
  //         complete: () => this.loading.set(false),
  //       }),
  //   );

  //   // this.run(() =>
  //   //   this.api.uploadKycDocument(option.documentType, side, file)
  //   // // .pipe(
  //   // //     switchMap((response) => this.refreshState().pipe(map(() => response)))
  //   // //   )
  //   //   .subscribe({
  //   //     next: (response) => {
  //   //       this.uploadedFiles.update((files) => [
  //   //         ...files.filter(
  //   //           (f) => !(f.documentType === option.documentType && f.side === side)
  //   //         ),
  //   //         {
  //   //           documentId: response.documentId,
  //   //           documentType: option.documentType,
  //   //           side: response.side,
  //   //           fileName: response.fileName,
  //   //           fileUrl: response.fileUrl,
  //   //         },
  //   //       ]);
  //   //       this.message.set(`${option.displayName} ${side} uploaded.`);
  //   //     },
  //   //     error: (err: unknown) => this.showError(err),
  //   //     complete: () => this.loading.set(false),
  //   //   })
  //   // );
  // }

 onFileChange(option: KycDocumentOption, side: DocumentSide, event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const key = this.keyFor(option.documentType, side);
  const policy = this.uploadPolicy();

  if (policy) {
    if (file.size > policy.maxFileSizeBytes) {
      this.setSideStatus(key, 'error', `File exceeds the ${policy.maxFileSizeLabel} size limit.`);
      input.value = '';
      return;
    }
    if (!policy.allowedContentTypes.includes(file.type)) {
      this.setSideStatus(key, 'error', `Only ${this.allowedFormatsLabel(policy)} files are accepted.`);
      input.value = '';
      return;
    }
  }

  this.clearSideStatus(key);
  this.beginUpload(key);

  this.api
    .uploadKycDocument(option.documentType, side, file)
    .pipe(
      switchMap((response) => {
        this.uploadedFiles.update((files) => [
          ...files.filter((f) => !(f.documentType === option.documentType && f.side === side)),
          {
            documentId: response.documentId,
            documentType: option.documentType,
            side: response.side,
            fileName: response.fileName,
            fileUrl: response.fileUrl,
          },
        ]);
        return this.refreshState();
      }),
      finalize(() => {
        this.endUpload(key);
        input.value = ''; // allow re-selecting the same file after a failure
      }),
    )
    .subscribe({
      next: () => {
        this.setSideStatus(key, 'success', `${option.displayName} ${side} uploaded successfully.`);
      },
      error: (err: unknown) => {
        this.setSideStatus(key, 'error', this.extractErrorMessage(err));
      },
    });
}

  submitAllKyc(): void {
  const allDocumentIds = [...new Set(this.uploadedFiles().map((f) => f.documentId))];

  if (allDocumentIds.length === 0) {
    this.kycSubmitError.set(
      'No documents found to submit. Please upload all required documents first.',
    );
    return;
  }

  this.kycSubmitError.set('');
  this.loading.set(true);

  this.api
    .submitKyc({ documentIds: allDocumentIds })
    .pipe(
      switchMap(() => this.refreshState()),
      finalize(() => this.loading.set(false)),
    )
    .subscribe({
      next: () => {
        this.message.set('KYC submitted for review.');
        this.step.set('settlement');
      },
      error: (err: unknown) => {
        this.kycSubmitError.set(this.extractErrorMessage(err));
      },
    });
}

  // submitAllKyc(): void {
  //   // Build one submit request per distinct documentType that has uploads
  //   const uploadsByType = new Map<DocumentType, string[]>();
  //   for (const file of this.uploadedFiles()) {
  //     const existing = uploadsByType.get(file.documentType) ?? [];
  //     uploadsByType.set(file.documentType, [...existing, file.documentId]);
  //   }

  //   if (uploadsByType.size === 0) return;

  //   // Submit sequentially using the first documentType for now;
  //   // extend to parallel forkJoin if the API supports multiple submissions.
  //   const [firstType, firstIds] = [...uploadsByType.entries()][0]!;

  //   this.run(() =>
  //     this.api
  //       .submitKyc({ documentType: firstType, documentIds: firstIds })
  //       .pipe(switchMap(() => this.refreshState()))
  //       .subscribe({
  //         next: () => {
  //           this.message.set('KYC submitted for review.');
  //           this.step.set('settlement');
  //         },
  //         error: (err: unknown) => this.showError(err),
  //         complete: () => this.loading.set(false),
  //       })
  //   );
  // }

  requestOtp(): void {
    this.run(() =>
      this.api.requestPhoneOtp({ phone: this.phone }).subscribe({
        next: (response) => {
          this.otpRequested.set(true);
          this.message.set(
            `OTP sent to ${response.phone}. Resend available after ${response.resendAfterSeconds}s.`,
          );
        },
        error: (err: unknown) => this.showError(err),
        complete: () => this.loading.set(false),
      }),
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
              uploadPolicy: this.api.getUploadPolicy(),
              settlementOptions: this.api.listSettlementOptions(),
              // bankAccounts: this.api.listBankAccounts(),
            });
          }),
        )
        .subscribe({
          next: ({ state, uploadPolicy, settlementOptions }) => {
            this.state.set(state);
            this.uploadPolicy.set(uploadPolicy);
            this.initGroupSelections(state.kycRequirements ?? []);
            this.settlementOptions.set(settlementOptions);
            this.setDefaultSettlementOption(settlementOptions);
            // this.bankAccounts.set(bankAccounts);

            // Populate  the business form if the DB already has data
            this.hydrateBusiness(state);

            // Determine UI step from backend state; fallback to 'business'
            const uiStep =
              this.mapServerStepToUiStep(state?.currentStep) ?? 'business';

            // If backend supplied a current step, show a message that reflects restored state
            if (state && state.currentStep) {
              this.message.set(
                `Phone verified. Resuming at ${this.label(uiStep)}.`,
              );
            } else {
              this.message.set(
                'Phone verified. Continue with business details.',
              );
            }

            this.step.set(uiStep);

            // this.message.set('Phone verified. Continue with business details.');
            // this.step.set('business');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
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
          estimatedMonthlyRevenue:
            this.business.estimatedMonthlyRevenue ?? undefined,
        })
        .pipe(switchMap(() => this.refreshState()))
        .subscribe({
          next: (state) => {
            this.hydrateBusiness(state);
            this.message.set('Business details saved.');
            this.step.set('kyc');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
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
              : of(account),
          ),
          switchMap(() =>
            forkJoin({
              accounts: this.api.listBankAccounts(),
              state: this.refreshState(),
            }),
          ),
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(
              accounts.find((a) => a.defaultAccount)?.id ?? null,
            );
            this.message.set('Settlement account linked.');
            this.step.set('review');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
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
            }),
          ),
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(account.id);
            this.message.set('Default settlement account selected.');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
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
              `${response.status}. ${response.nextActions?.join(' ') || 'You can now continue to sign in.'}`,
            );
            this.step.set('done');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
    );
  }

  canVisit(target: UiStep): boolean {
    if (target === 'phone') return true;
    return Boolean(this.session.accessToken());
  }

  goTo(target: UiStep): void {
    if (this.canVisit(target)) this.step.set(target);
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

  // ── Private helpers ───────────────────────────────────────────────────────

  private hydrateBusiness(state: OnboardingStateResponse): void {
    const merchant = state.review?.merchant;
    if (!merchant?.businessName) return;

    this.business.businessName = merchant.businessName;
    this.business.businessNameAm = merchant.businessNameAm ?? '';
    this.business.businessType =
      merchant.businessType ?? this.business.businessType;
    this.business.email = merchant.email ?? '';
    this.business.city = merchant.address?.city ?? this.business.city;
    this.business.subcity = merchant.address?.subcity ?? this.business.subcity;
    this.business.woreda = merchant.address?.woreda ?? this.business.woreda;

    const money = merchant.estimatedMonthlyRevenue;
    this.business.estimatedMonthlyRevenue = money?.amount ?? null;
  }

  private initGroupSelections(groups: KycRequirementGroup[]): void {
    const selections: GroupSelection = {};
    for (const group of groups) {
      if (group.selectionMode === 'ONE_OF' && group.options[0]) {
        selections[group.code] = group.options[0].documentType;
      }
    }
    this.groupSelections.set(selections);
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

  private refreshState() {
    return this.api.getOnboardingState().pipe(
      switchMap((state) => {
        this.state.set(state);
        return of(state);
      }),
    );
  }

  private run(start: () => void): void {
    this.error.set('');
    this.message.set('');
    this.loading.set(true);
    start();
  }

  private showError(error: unknown): void {
    const maybeHttpError = error as {
      error?: { message?: string };
      message?: string;
    };
    this.error.set(
      maybeHttpError.error?.message ??
        maybeHttpError.message ??
        'The request failed.',
    );
    this.loading.set(false);
  }

  private setDefaultSettlementOption(
    options: SettlementOptionResponse[],
  ): void {
    const first = options[0];
    if (first) this.settlement.bankCode = first.code;
  }
}
