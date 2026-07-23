import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import {
  ApiError,
  BankAccountResponse,
  BusinessType,
  DocumentSide,
  DocumentType,
  KycDocumentFile,
  KycDocumentOption,
  KycDocumentRecord,
  KycRequirementGroup,
  OnboardingApiService,
  OnboardingSessionService,
  OnboardingStateResponse,
  OnboardingStep,
  // OnboardingSubmitResponse,
  // SettlementOptionResponse,
  SideUploadStatus,
  UploadPolicy,
  OnboardingSubmitResponse,
  SettlementOptionResponse,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsEmptyStateComponent,
  EsSpinnerComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { HttpErrorResponse } from '@angular/common/http';

type UiStep = 'phone' | 'business' | 'kyc' | 'settlement' | 'review' | 'done';

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

      <!-- <div class="popup-container">
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
      </div> -->

      @if (loading()) {
        <div class="loading"><es-spinner label="Working..." /></div>
      }

      @switch (step()) {
        @case ('phone') {
          <es-card class="phone-card">
            <div class="phone-step">
              @if (!otpRequested()) {
                <h2 class="phone-step__title">Verify your phone</h2>
                <p class="phone-step__subtitle">
                  We'll text a 6-digit code to confirm it's you.
                </p>

                <form class="phone-step__form" (ngSubmit)="requestOtp()">
                  <div
                    class="phone-input"
                    role="group"
                    aria-labelledby="phone-label"
                  >
                    <span class="sr-only" id="phone-label">Phone number</span>
                    <span class="phone-input__prefix" aria-hidden="true">
                      <span class="phone-input__flag">🇪🇹</span> +251
                    </span>
                    <input
                      id="phone-input"
                      type="text"
                      inputmode="numeric"
                      maxlength="9"
                      placeholder="912345678"
                      autocomplete="tel-national"
                      aria-label="9-digit phone number, without the country code"
                      [value]="phoneNationalNumber()"
                      (input)="onPhoneNumberInput($event)"
                    />
                  </div>

                  <es-button type="submit" [disabled]="sendOtpDisabled()">
                    @if (editingPhoneCooldownActive()) {
                      Please wait
                    } @else {
                      Send OTP
                    }
                  </es-button>
                </form>
              } @else {
                <h2 class="phone-step__title">Phone Verification</h2>
                <p class="phone-step__subtitle">
                  Enter the 6-digit code sent to
                  <strong class="phone-step__number">{{
                    maskedPhone()
                  }}</strong>
                </p>

                <form class="phone-step__form" (ngSubmit)="verifyOtp()">
                  <div
                    class="otp-boxes"
                    role="group"
                    aria-labelledby="otp-label"
                  >
                    <span class="sr-only" id="otp-label"
                      >Enter the 6-digit code</span
                    >
                    @for (digit of otpDigits(); track $index) {
                      <input
                        #otpBox
                        type="text"
                        inputmode="numeric"
                        maxlength="1"
                        autocomplete="one-time-code"
                        class="otp-box"
                        [attr.aria-label]="'Digit ' + ($index + 1) + ' of 6'"
                        [value]="digit"
                        (input)="onOtpDigitInput($index, $event)"
                        (keydown)="onOtpKeydown($index, $event)"
                        (paste)="onOtpPaste($event)"
                      />
                    }
                  </div>

                  <div class="phone-step__meta">
                    @if (canResend()) {
                      <button
                        type="button"
                        class="change-number"
                        (click)="requestOtp()"
                      >
                        Resend code
                      </button>
                    } @else {
                      <span class="resend-countdown"
                        >Resend code in {{ resendCountdownLabel() }}</span
                      >
                    }
                    <button
                      type="button"
                      class="change-number"
                      (click)="changePhoneNumber()"
                    >
                      Change number
                    </button>
                  </div>

                  <es-button type="submit" [disabled]="verifyOtpDisabled()">
                    Verify and Continue
                  </es-button>
                </form>
              }
            </div>
          </es-card>
        }

        @case ('business') {
          <es-card
            title="Business details"
            subtitle="Provide your business information to create your merchant account."
          >
            @if (businessDetailsLocked()) {
              <p class="business-locked__hint">
                <span aria-hidden="true">🔒</span>
                Business details submitted. To make changes, update them from
                your profile after onboarding.
              </p>
            }

            <form class="form" (ngSubmit)="submitBusinessDetails()">
              <div class="two">
                <label for="businessName">
                  Business name
                  <input
                    id="businessName"
                    name="businessName"
                    required
                    [disabled]="businessDetailsLocked()"
                    [(ngModel)]="business.businessName"
                    (ngModelChange)="onBusinessFieldChange()"
                  />
                </label>
                <label for="businessNameAm">
                  Amharic business name
                  <input
                    id="businessNameAm"
                    name="businessNameAm"
                    required
                    [disabled]="businessDetailsLocked()"
                    [(ngModel)]="business.businessNameAm"
                    (ngModelChange)="onBusinessFieldChange()"
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
                    [disabled]="businessDetailsLocked()"
                    [(ngModel)]="business.businessType"
                    (ngModelChange)="onBusinessFieldChange()"
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
                    required
                    autocomplete="email"
                    [disabled]="businessDetailsLocked()"
                    [(ngModel)]="business.email"
                    (ngModelChange)="onBusinessFieldChange()"
                  />
                </label>
              </div>
              <div class="two">
                <label for="city">
                  City
                  <input
                    id="city"
                    name="city"
                    placeholder="optional"
                    [disabled]="businessDetailsLocked()"
                    [(ngModel)]="business.city"
                  />
                </label>
                <label for="subcity">
                  Subcity
                  <input
                    id="subcity"
                    name="subcity"
                    placeholder="optional"
                    [disabled]="businessDetailsLocked()"
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
                    placeholder="optional"
                    [disabled]="businessDetailsLocked()"
                    [(ngModel)]="business.woreda"
                  />
                </label>
                <label for="revenue">
                  Estimated monthly revenue
                  <span class="currency-input">
                    <span class="currency-input__prefix" aria-hidden="true"
                      >ETB</span
                    >
                    <input
                      id="revenue"
                      name="estimatedMonthlyRevenue"
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      placeholder="0"
                      required
                      aria-describedby="revenue-hint"
                      [disabled]="businessDetailsLocked()"
                      [value]="estimatedMonthlyRevenueDisplay()"
                      (input)="onRevenueInput($event)"
                    />
                  </span>
                  <span id="revenue-hint" class="field-hint"
                    >Enter the amount in Ethiopian Birr</span
                  >
                </label>
              </div>

              @if (!businessDetailsLocked()) {
                <es-button
                  type="submit"
                  [disabled]="loading() || !businessDetailsValid()"
                >
                  Save business details
                </es-button>
              }
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
              @if (uploadPolicy(); as policy) {
                <p class="upload-hint upload-hint--top" aria-live="polite">
                  Accepted formats: {{ allowedFormatsLabel(policy) }} · Max
                  size: {{ policy.maxFileSizeLabel }}
                </p>
              }
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
                          [disabled]="isGroupLocked(group)"
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
                          <ng-container
                            *ngTemplateOutlet="expiryInfo; context: { option }"
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

                          @if (
                            !isOptionComplete(option) &&
                            uploadedSidesCount(option) > 0
                          ) {
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
                          <ng-container
                            *ngTemplateOutlet="expiryInfo; context: { option }"
                          />
                        </div>
                      }
                    }
                  </section>
                }
              </div>

              <!-- Submit all KYC -->
              <div class="kyc-submit">
                @if (kycSubmitError()) {
                  <p class="kyc-submit__error" role="alert">
                    {{ kycSubmitError() }}
                  </p>
                }

                <es-button
                  [disabled]="loading() || !canSubmitKyc()"
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
          <ng-template #expiryInfo let-option="option">
            @if (requiresExpiryDate(option)) {
              <div class="expiry-info">
                @if (option.expiryDate) {
                  <span class="expiry-info__label"
                    >Expiry date of the {{ option.displayName }}</span
                  >
                  <strong class="expiry-info__value">{{
                    formatExpiryDate(option.expiryDate)
                  }}</strong>
                  @if (option.complete && option.valid === false) {
                    <span class="expiry-info__warning" role="alert">
                      {{
                        option.invalidReason ||
                          'This document could not be validated.'
                      }}
                    </span>
                  }
                } @else if (option.uploaded) {
                  <span class="expiry-info__pending"
                    >Extracting expiry date…</span
                  >
                }
              </div>
            }
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

              <es-button
                type="submit"
                [disabled]="loading() || disableLinkAccountButton"
              >
                Link account
              </es-button>
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

            <div class="navigation">
              <button
                type="button"
                class="previous"
                (click)="goToPreviousStep()"
                [disabled]="!canGoPrevious()"
              >
                Previous
              </button>
              <button
                type="button"
                class="next"
                (click)="goToNextStep()"
                [disabled]="!canGoNext()"
              >
                Next
              </button>
            </div>
          </es-card>
        }

        @case ('review') {
          <es-card
            title="Review and submit"
            subtitle="Submit once all required onboarding checklist items are complete."
          >
            @if (state(); as onboardingState) {
              <div class="review">
                <div class="review-card">
                  <span>Merchant</span
                  ><strong>{{
                    onboardingState.review?.merchant?.businessName ||
                      'Not captured'
                  }}</strong>
                </div>
                <div class="review-card">
                  <span>KYC</span
                  ><strong>{{
                    reviewLabel(
                      onboardingState.review?.kyc?.status || 'Not submitted'
                    )
                  }}</strong>
                </div>
                <div class="review-card">
                  <span>Settlement</span
                  ><strong>{{
                    onboardingState.review?.settlementAccount?.accountNumber ||
                      'Not linked'
                  }}</strong>
                </div>
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
              <div class="two">
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    [(ngModel)]="password"
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    [(ngModel)]="confirmPassword"
                  />
                </label>
              </div>
              <es-button
                type="submit"
                [disabled]="loading() || !canSubmitReview()"
                >Submit onboarding</es-button
              >
            </form>

            <div class="navigation">
              <button
                type="button"
                class="previous"
                (click)="goToPreviousStep()"
                [disabled]="!canGoPrevious()"
              >
                Previous
              </button>
            </div>
          </es-card>
        }

        @case ('done') {
          <es-empty-state
            icon="check_circle"
            title="Onboarding submitted"
            [description]="approvalMessage()"
            actionLabel="Go to Dashboard"
            (action)="goToDashboard()"
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

    @if (kycSubmitSuccess()) {
      <div
        class="preview-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="KYC submitted for review"
        (click)="continueAfterKycSubmit()"
      >
        <div class="preview-dialog success-dialog">
          <p class="success-dialog__icon" aria-hidden="true">✓</p>
          <h2>KYC submitted for review</h2>
          <p>
            We'll review your documents and notify you once they're verified.
          </p>
          <es-button (click)="continueAfterKycSubmit()">Continue</es-button>
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;

        display: flex;
        flex-direction: column; /* ✅ stack text and button vertically */
        align-items: center; /* ✅ center horizontally */
        gap: 0.5rem; /* ✅ small space between text and button */
        border: none; /* ✅ remove highlighted line */
      }

      close {
        position: absolute; /* ✅ pinned in top corner */
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
        margin-bottom: 0.5rem; /* ✅ space between text and button */
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
        background: #def7ec; /* green success/info background */
        color: #03543f; /* dark green text */
      }

      .error {
        background: #fde8e8; /* red error background */
        color: #9b1c1c; /* dark red text */
      }

      .loading {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        padding: 1rem;
        margin: 0 auto 1rem;
        max-width: 72rem;
      }

      /* phone verification step style*/

      .phone-step {
        display: grid;
        gap: 0.375rem;
        justify-items: center;
        padding: 1.5rem 1rem 1rem;
        text-align: center;
      }

      .phone-step__title {
        color: var(--es-color-neutral-900);
        font-size: 1.75rem;
        font-weight: 800;
        margin: 0;
      }

      .phone-step__subtitle {
        color: var(--es-color-neutral-600);
        margin: 0 0 1.5rem;
        max-width: 24rem;
      }

      .phone-step__number {
        color: var(--es-color-neutral-900);
        display: block;
        font-size: 1.0625rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        margin-top: 0.375rem;
      }

      .phone-step__form {
        display: grid;
        gap: 1.5rem;
        width: 100%;
        max-width: 22rem;
      }

      .phone-step__meta {
        align-items: center;
        display: flex;
        justify-content: space-between;
      }

      .phone-input {
        display: flex;
      }

      .phone-input__prefix {
        align-items: center;
        background: var(--es-color-neutral-100);
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-lg) 0 0 var(--es-radius-lg);
        border-right: 0;
        color: var(--es-color-neutral-700);
        display: flex;
        font-weight: 700;
        gap: 0.375rem;
        padding: 0 0.875rem;
        white-space: nowrap;
      }

      .phone-input__flag {
        font-size: 1rem;
      }

      .phone-input input {
        border: 1px solid #cbd8e7;
        border-radius: 0 var(--es-radius-lg) var(--es-radius-lg) 0;
        flex: 1;
        min-height: 2.75rem;
        min-width: 0;
        padding: 0 0.75rem;
      }

      .otp-boxes {
        display: flex;
        gap: 0.625rem;
        justify-content: center;
      }

      .otp-box {
        background: var(--es-color-neutral-100);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-lg);
        color: var(--es-color-neutral-900);
        font-size: 1.5rem;
        font-weight: 800;
        height: 3.5rem;
        text-align: center;
        width: 3.25rem;
      }

      .otp-box:focus {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
        outline: 0;
      }

      .resend-countdown {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-weight: 650;
      }

      .change-number {
        background: none;
        border: 0;
        color: var(--es-color-accent-dark);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 700;
        padding: 0;
        text-decoration: underline;
      }

      .change-number:hover {
        color: var(--es-color-primary-hover);
      }

      @media (max-width: 480px) {
        .otp-box {
          height: 2.75rem;
          width: 2.5rem;
        }
      }

      /* ── currency style ───────────────────────────────── */

      .currency-input {
        align-items: center;
        display: flex;
      }

      .currency-input__prefix {
        background: var(--es-color-neutral-100);
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm) 0 0 var(--es-radius-sm);
        border-right: 0;
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-weight: 700;
        height: 2.75rem;
        align-items: center;
        display: flex;
        padding: 0 0.625rem;
      }

      .currency-input input {
        border-radius: 0 var(--es-radius-sm) var(--es-radius-sm) 0;
        flex: 1;
      }

      .field-hint {
        color: var(--es-color-neutral-600);
        font-size: 0.75rem;
        font-weight: 400;
      }

      //business detail

      .business-locked__hint {
        align-items: center;
        background: rgba(0, 168, 121, 0.08);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-accent-dark);
        display: flex;
        font-size: 0.8125rem;
        font-weight: 650;
        gap: 0.375rem;
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
      }

      input:disabled,
      select:disabled {
        background: var(--es-color-neutral-100);
        color: var(--es-color-neutral-700);
        cursor: not-allowed;
        opacity: 0.85;
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

      .group-locked-hint {
        align-items: center;
        color: var(--es-color-accent-dark);
        display: flex;
        font-size: 0.8125rem;
        font-weight: 650;
        gap: 0.375rem;
        margin: -0.5rem 0 1rem;
      }

      .doc-select-label select:disabled {
        background: var(--es-color-neutral-100);
        color: var(--es-color-neutral-700);
        cursor: not-allowed;
        opacity: 0.85;
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

      .upload-hint--top {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 0 0 1.25rem;
        padding: 0.625rem 0.875rem;
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

      .success-dialog {
        cursor: default;
        justify-items: center;
        padding: 2rem;
        text-align: center;
      }

      .success-dialog__icon {
        align-items: center;
        background: rgba(0, 168, 121, 0.12);
        border-radius: 999px;
        color: var(--es-color-accent-dark);
        display: flex;
        font-size: 1.75rem;
        font-weight: 800;
        height: 3.5rem;
        justify-content: center;
        margin: 0 0 0.5rem;
        width: 3.5rem;
      }

      .success-dialog h2 {
        color: var(--es-color-neutral-900);
        font-size: 1.25rem;
        margin: 0;
      }

      .success-dialog p {
        color: var(--es-color-neutral-600);
        margin: 0 0 0.5rem;
        max-width: 24rem;
      }

      //expiry date style

      .expiry-info {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }

      .expiry-info__label {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
      }

      .expiry-info__value {
        color: var(--es-color-neutral-900);
        font-size: 0.875rem;
      }

      .expiry-info__pending {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-style: italic;
      }

      .expiry-info__warning {
        background: #fde8e8;
        border-radius: var(--es-radius-sm);
        color: #9b1c1c;
        font-size: 0.75rem;
        font-weight: 650;
        padding: 0.25rem 0.5rem;
        width: 100%;
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

      @keyframes side-upload-toast {
        0% {
          opacity: 0;
          transform: translateY(-4px);
        }
        8% {
          opacity: 1;
          transform: translateY(0);
        }
        82% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-4px);
        }
      }

      .side-upload__status--success {
        animation: side-upload-toast 2600ms ease forwards;
      }

      /* ── Settlement ───────────────────────────────── */

      .accounts {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        margin-top: 1rem;
      }
      .accounts {
        margin-top: 1rem; /* ✅ adds space above the accounts list */
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
      .blocker-item {
        font-weight: 700;
        color: #9b1c1c; /* red warning tone */
        background: #fde8e8; /* light red background */
        padding: 0.5rem 0.75rem;
        border-radius: var(--es-radius-sm);
      }

      .blockers {
        margin: 0 0 1rem;
        padding-left: 1.25rem;
      }

      .field-error {
        color: #9b1c1c;
        font-size: 0.75rem;
        font-weight: 650;
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly statusTimeouts = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

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

  readonly phoneVerified = signal(false);
  readonly step = signal<UiStep>('phone');
  readonly loading = signal(false);
  readonly otpRequested = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly state = signal<OnboardingStateResponse | null>(null);
  readonly settlementOptions = signal<SettlementOptionResponse[]>([]);
  readonly bankAccounts = signal<BankAccountResponse[]>([]);
  // readonly uploadedFiles = signal<UploadedKycFile[]>([]);
  readonly selectedBankAccountId = signal<string | null>(null);
  readonly approvalMessage = signal(
    'Your merchant onboarding request has been submitted.',
  );

  private readonly businessFormTick = signal(0);

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** What the user sees in the input, e.g. "1,300,000" */
  readonly estimatedMonthlyRevenueDisplay = signal('');
  readonly uploadPolicy = signal<UploadPolicy | null>(null);

  /** Which document type is selected per group code (for ONE_OF groups) */
  readonly groupSelections = signal<GroupSelection>({});

  /** File currently shown in the preview modal (null = closed) */
  readonly previewFile = signal<KycDocumentFile | null>(null);

  /** Slots currently uploading, keyed by "documentType-side" */
  readonly uploadingKeys = signal<Set<string>>(new Set());

  /** Error shown next to the "Submit KYC documents" button */
  readonly kycSubmitError = signal('');

  /** Last success/error message per slot, keyed by "documentType-side" */
  readonly sideStatus = signal<Record<string, SideUploadStatus>>({});

  /** True while the user is re-entering their number but still under the previous cooldown */
  readonly editingPhoneCooldownActive = computed(
    () => !this.otpRequested() && this.resendSecondsRemaining() > 0,
  );

  /** True once the current file set has been submitted this session; resets on any new/replaced upload */
  readonly kycSubmittedThisSession = signal(false);

  readonly verifyOtpDisabled = computed(
    () => this.loading() || !this.otpRequested() || !this.otpCodeValid(),
  );

  /** Epoch ms when resend becomes available, null when no OTP is in flight */
  readonly resendAvailableAt = signal<number | null>(null);
  private readonly nowTick = signal(Date.now());
  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  readonly resendSecondsRemaining = computed(() => {
    const availableAt = this.resendAvailableAt();
    if (availableAt === null) {
      return 0;
    }
    return Math.max(0, Math.ceil((availableAt - this.nowTick()) / 1000));
  });

  readonly resendCountdownLabel = computed(() => {
    const seconds = this.resendSecondsRemaining();
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  });

  readonly canResend = computed(
    () => this.otpRequested() && this.resendSecondsRemaining() === 0,
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopCountdown();
      this.clearAllStatusTimeouts();
      if (this.kycSuccessTimeout !== null) {
        clearTimeout(this.kycSuccessTimeout);
      }
    });
  }

  readonly anyUploadInProgress = computed(() => this.uploadingKeys().size > 0);

  /** Raw document+file records from the server — the single source of truth for KYC uploads */
  readonly kycDocuments = computed<KycDocumentRecord[]>(
    () => this.state()?.review?.kyc?.documents ?? [],
  );

  /** Document ids to submit — always freshly derived from server state, never stale local memory */
  readonly documentIdsForSubmit = computed<string[]>(() => [
    ...new Set(this.kycDocuments().map((doc) => doc.id)),
  ]);

  readonly canSubmitKyc = computed(
    () =>
      this.allGroupsSatisfied() &&
      !this.anyUploadInProgress() &&
      !this.kycSubmittedThisSession(),
  );

  readonly kycSubmitSuccess = signal(false);
  private kycSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

  /** National number only — the 9 digits after +251, entered by the user */
  readonly phoneNationalNumber = signal('');

  readonly phoneNumberValid = computed(() =>
    /^\d{9}$/.test(this.phoneNationalNumber()),
  );

  /** Full E.164 phone number sent to the backend */
  readonly fullPhone = computed(() => `+251${this.phoneNationalNumber()}`);

  /** One entry per OTP box */
  readonly otpDigits = signal<string[]>(['', '', '', '', '', '']);

  readonly otpCode = computed(() => this.otpDigits().join(''));
  readonly otpCodeValid = computed(() => /^\d{6}$/.test(this.otpCode()));

  private readonly otpBoxRefs =
    viewChildren<ElementRef<HTMLInputElement>>('otpBox');

  readonly sendOtpDisabled = computed(
    () =>
      this.loading() ||
      this.otpRequested() ||
      this.resendSecondsRemaining() > 0 ||
      !this.phoneNumberValid(),
  );

  readonly phoneCardSubtitle = computed(() =>
    this.otpRequested()
      ? 'Enter the code below to finish verifying your number.'
      : "We'll text a one-time code to verify your number.",
  );

  readonly maskedPhone = computed(() => {
    const digits = this.phoneNationalNumber();
    if (digits.length !== 9) {
      return this.fullPhone();
    }
    return `+251 ${digits.slice(0, 2)}•• •••${digits.slice(-2)}`;
  });

  /** Password fields for final account creation  */
  readonly reviewPassword = signal('');
  readonly reviewConfirmPassword = signal('');

  readonly reviewPasswordValid = computed(() => {
    const pwd = this.reviewPassword();
    const confirm = this.reviewConfirmPassword();
    return pwd.length >= 8 && pwd === confirm;
  });

  readonly reviewPasswordMismatch = computed(() => {
    const confirm = this.reviewConfirmPassword();
    return confirm.length > 0 && this.reviewPassword() !== confirm;
  });

  onReviewPasswordChange(value: string): void {
    this.reviewPassword.set(value);
  }

  onReviewConfirmPasswordChange(value: string): void {
    this.reviewConfirmPassword.set(value);
  }

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
  password = '';
  confirmPassword = '';

  // readonly enabledRequirements = computed(() =>
  //   this.requirements().filter((requirement) => requirement.enabled)
  // );

  /** The accept attribute value derived from the upload policy */
  readonly acceptAttr = computed<string>(() => {
    const policy = this.uploadPolicy();
    return policy
      ? policy.allowedContentTypes.join(',')
      : 'application/pdf,image/jpeg,image/png,image/webp';
  });

  readonly businessDetailsValid = computed(() => {
    this.businessFormTick(); // establishes the reactive dependency
    const b = this.business;
    return (
      b.businessName.trim().length > 0 &&
      b.businessNameAm.trim().length > 0 &&
      !!b.businessType &&
      this.emailPattern.test(b.email.trim()) &&
      b.estimatedMonthlyRevenue !== null &&
      b.estimatedMonthlyRevenue > 0
    );
  });

  readonly businessDetailsLocked = computed(() => {
    const checklist = this.state()?.checklist;
    return !!checklist?.businessDetailsCompleted;
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** True when the minimum required business fields are filled. */

  private optionFor(documentType: DocumentType): KycDocumentOption | undefined {
    for (const group of this.kycGroups()) {
      const option = group.options.find((o) => o.documentType === documentType);
      if (option) {
        return option;
      }
    }
    return undefined;
  }
  isOptionComplete(option: KycDocumentOption): boolean {
    return option.complete;
  }

  uploadedSidesCount(option: KycDocumentOption): number {
    return option.uploadedSides.length;
  }

  private fileRecordFor(
    documentType: DocumentType,
    side: DocumentSide,
  ): KycDocumentFile | undefined {
    const doc = this.kycDocuments().find(
      (d) => d.documentType === documentType,
    );
    return doc?.files.find((f) => f.side === side);
  }

  selectedOption(group: KycRequirementGroup): KycDocumentOption | undefined {
    const selected = this.groupSelections()[group.code];
    return group.options.find((o) => o.documentType === selected);
  }

  isSideUploaded(documentType: DocumentType, side: DocumentSide): boolean {
    return this.optionFor(documentType)?.uploadedSides.includes(side) ?? false;
  }

  openPreview(documentType: DocumentType, side: DocumentSide): void {
    const file = this.fileRecordFor(documentType, side);
    if (file) {
      this.previewFile.set(file);
    }
  }

  closePreview(): void {
    this.previewFile.set(null);
  }

  isGroupLocked(group: KycRequirementGroup): boolean {
    if (group.selectionMode !== 'ONE_OF') {
      return false;
    }
    const selected = this.selectedOption(group);
    return !!selected && this.isOptionComplete(selected);
  }

  isOneOfGroupLocked(
    group: KycRequirementGroup,
    option: KycDocumentOption,
  ): boolean {
    return group.selectionMode === 'ONE_OF' && this.isOptionComplete(option);
  }

  onRevenueInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '');

    if (!digitsOnly) {
      this.business.estimatedMonthlyRevenue = null;
      this.estimatedMonthlyRevenueDisplay.set('');
      return;
    }

    const numericValue = Number(digitsOnly);
    this.business.estimatedMonthlyRevenue = numericValue;
    this.estimatedMonthlyRevenueDisplay.set(formatThousands(numericValue));

    queueMicrotask(() => {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }

  onBusinessFieldChange(): void {
    this.businessFormTick.update((n) => n + 1);
  }

  private readonly expiryRequiredTypes: ReadonlySet<DocumentType> = new Set([
    'PASSPORT',
    'DRIVERS_LICENSE',
    'TRADE_LICENSE',
  ]);
  readonly uploadAccept = computed(() => {
    const contentTypes = this.uploadPolicy()?.allowedContentTypes;

    return contentTypes?.length ? contentTypes.join(',') : 'image/*,.pdf';
  });

  requiresExpiryDate(option: KycDocumentOption): boolean {
    return this.expiryRequiredTypes.has(option.documentType);
  }

  formatExpiryDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  canVisit(target: UiStep): boolean {
    if (target === 'phone') {
      return !this.phoneVerified();
    }
    return Boolean(this.session.accessToken());
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
    this.clearStatusTimeout(key);
    this.sideStatus.update((statuses) => ({
      ...statuses,
      [key]: { type, message },
    }));

    if (type === 'success') {
      const handle = setTimeout(() => {
        this.sideStatus.update((statuses) => {
          // Don't clobber a newer status that may have replaced this one
          if (statuses[key]?.message !== message) {
            return statuses;
          }
          const next = { ...statuses };
          delete next[key];
          return next;
        });
        this.statusTimeouts.delete(key);
      }, 2600);
      this.statusTimeouts.set(key, handle);
    }
  }

  private clearSideStatus(key: string): void {
    this.clearStatusTimeout(key);
    this.sideStatus.update((statuses) => {
      const next = { ...statuses };
      delete next[key];
      return next;
    });
  }

  private clearAllStatusTimeouts(): void {
    for (const handle of this.statusTimeouts.values()) {
      clearTimeout(handle);
    }
    this.statusTimeouts.clear();
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

  allGroupsSatisfied(): boolean {
    const groups = this.kycGroups();
    return groups.length > 0 && groups.every((g) => g.satisfied);
  }

  allowedFormatsLabel(policy: UploadPolicy): string {
    return policy.allowedContentTypes
      .map((mime) => mime.split('/')[1]?.toUpperCase() ?? mime)
      .join(', ');
  }

  onOtpDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.replace(/\D/g, '');

    if (rawValue.length > 1) {
      // Handles mobile/browser autofill dropping the full code into one box
      this.distributeOtpDigits(rawValue, index);
      return;
    }

    this.otpDigits.update((digits) => {
      const next = [...digits];
      next[index] = rawValue;
      return next;
    });
    input.value = rawValue;

    if (rawValue && index < this.otpDigits().length - 1) {
      this.focusOtpBox(index + 1);
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      event.preventDefault();
      this.otpDigits.update((digits) => {
        const next = [...digits];
        next[index - 1] = '';
        return next;
      });
      this.focusOtpBox(index - 1);
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusOtpBox(index - 1);
    }

    if (event.key === 'ArrowRight' && index < this.otpDigits().length - 1) {
      event.preventDefault();
      this.focusOtpBox(index + 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(
      /\D/g,
      '',
    );

    if (digits) {
      this.distributeOtpDigits(digits, 0);
    }
  }

  onPhoneNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 9);
    this.phoneNationalNumber.set(digits);
    input.value = digits;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  selectDocumentType(groupCode: string, documentType: DocumentType): void {
    this.groupSelections.update((prev) => ({
      ...prev,
      [groupCode]: documentType,
    }));
  }

  requestOtp(): void {
    this.run(() =>
      this.api.requestPhoneOtp({ phone: this.fullPhone() }).subscribe({
        next: (response) => {
          this.otpRequested.set(true);
          this.resetOtpDigits();
          this.startCountdown(response.resendAfterSeconds);
          this.focusOtpBox(0);
        },
        error: (err: unknown) => this.showError(err),

        complete: () => this.loading.set(false),
      }),
    );
  }

  changePhoneNumber(): void {
    this.otpRequested.set(false);
    this.resetOtpDigits();
    this.stopCountdown();
    this.resendAvailableAt.set(null);
    this.message.set('');
    this.error.set('');
  }

  verifyOtp(): void {
    this.run(() =>
      this.api
        .verifyPhoneOtp({ phone: this.fullPhone(), otpCode: this.otpCode() })
        .pipe(
          switchMap((response) => {
            this.session.setVerification(this.fullPhone(), response);
            return forkJoin({
              state: this.api.getOnboardingState(),
              uploadPolicy: this.api.getUploadPolicy(),
              settlementOptions: this.api.listSettlementOptions(),
            });
          }),
        )
        .subscribe({
          next: ({ state, uploadPolicy, settlementOptions }) => {
            this.phoneVerified.set(true);

            this.state.set(state);
            this.uploadPolicy.set(uploadPolicy);
            this.initGroupSelections(state.kycRequirements ?? []);
            this.settlementOptions.set(settlementOptions);
            this.setDefaultSettlementOption(settlementOptions);
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
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
    );
  }

  // private showMessage(text: string): void {
  //   this.message.set(text);
  //   setTimeout(() => this.message.set(''), 4000); // auto‑dismiss after 4s
  // }

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

  onFileChange(
    option: KycDocumentOption,
    side: DocumentSide,
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const key = this.keyFor(option.documentType, side);
    const policy = this.uploadPolicy();

    if (policy) {
      if (file.size > policy.maxFileSizeBytes) {
        this.setSideStatus(
          key,
          'error',
          `File exceeds the ${policy.maxFileSizeLabel} size limit.`,
        );
        input.value = '';
        return;
      }
      if (!policy.allowedContentTypes.includes(file.type)) {
        this.setSideStatus(
          key,
          'error',
          `Only ${this.allowedFormatsLabel(policy)} files are accepted.`,
        );
        input.value = '';
        return;
      }
    }

    this.clearSideStatus(key);
    this.beginUpload(key);

    this.api
      .uploadKycDocument(option.documentType, side, file)
      .pipe(
        switchMap(() => this.refreshState()),
        finalize(() => {
          this.endUpload(key);
          input.value = '';
        }),
      )
      .subscribe({
        next: () => {
          this.kycSubmittedThisSession.set(false);
          this.setSideStatus(
            key,
            'success',
            `${option.displayName} ${side} uploaded successfully.`,
          );
        },
        error: (err: unknown) => {
          this.setSideStatus(key, 'error', this.extractErrorMessage(err));
        },
      });
  }

  submitAllKyc(): void {
    const documentIds = this.documentIdsForSubmit();

    if (documentIds.length === 0) {
      this.kycSubmitError.set(
        'No documents found to submit. Please upload all required documents first.',
      );
      return;
    }

    this.kycSubmitError.set('');
    this.loading.set(true);

    this.api
      .submitKyc({ documentIds })
      .pipe(
        switchMap(() => this.refreshState()),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.kycSubmittedThisSession.set(true);
          this.showKycSuccess();
        },
        error: (err: unknown) => {
          this.kycSubmitError.set(this.extractErrorMessage(err));
        },
      });
  }

  continueAfterKycSubmit(): void {
    if (this.kycSuccessTimeout !== null) {
      clearTimeout(this.kycSuccessTimeout);
      this.kycSuccessTimeout = null;
    }
    this.kycSubmitSuccess.set(false);
    // this.message.set('KYC submitted for review.');
    this.step.set('settlement');
    // this.router.navigate(['/home']);
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
              accounts: this.loadBankAccounts(),
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
              accounts: this.loadBankAccounts(),
              state: this.refreshState(),
            }),
          ),
        )
        .subscribe({
          next: ({ accounts }) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(account.id);
            // this.showMessage('Default settlement account selected.');
            this.message.set('Default settlement account selected.');
          },
          error: (err: unknown) => this.showError(err),

          complete: () => this.loading.set(false),
        }),
    );
  }

  submitOnboarding(): void {
    if (this.password !== this.confirmPassword) {
      this.showError('Passwords do not match.');
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
            if (response.token?.accessToken) {
              this.auth.setToken(response.token.accessToken);
            }
            this.approvalMessage.set(
              `${response.status}. ${response.nextActions?.join(' ') || 'Your merchant workspace is ready.'}`,
            );
            this.step.set('done');
          },
          error: (error) => this.showError(error),
          complete: () => this.loading.set(false),
        }),
    );
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

  goToNextStep(): void {
    const order: UiStep[] = [
      'phone',
      'business',
      'kyc',
      'settlement',
      'review',
      'done',
    ];
    const currentIndex = order.indexOf(this.step());
    if (currentIndex < order.length - 1) {
      this.step.set(order[currentIndex + 1]);
    }
  }

  goToPreviousStep(): void {
    const order: UiStep[] = [
      'phone',
      'business',
      'kyc',
      'settlement',
      'review',
      'done',
    ];
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

    this.estimatedMonthlyRevenueDisplay.set(
      money?.display
        ? stripCurrencyLabel(money.display)
        : money?.amount != null
          ? formatThousands(money.amount)
          : '',
    );
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
  reviewLabel(value: string): string {
    return this.label(value)
      .replace(/\bKyc\b/g, 'KYC')
      .replace(/\bNbe\b/g, 'NBE');
  }

  // private formatSubmitSuccessMessage(
  //   response: OnboardingSubmitResponse,
  // ): string {
  //   const actions = response.nextActions?.map((action) => this.label(action));

  //   if (!actions?.length) {
  //     return 'Onboarding complete. You can now sign in.';
  //   }

  //   if (actions.length === 1) {
  //     return `Onboarding complete. ${actions[0]}.`;
  //   }

  //   const last = actions[actions.length - 1];
  //   const rest = actions.slice(0, -1).join(', ');
  //   return `Onboarding complete. ${rest}, and ${last}.`;
  // }

  goToDashboard(): void {
    this.router.navigate(['/home']);
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
      typeof error === 'string'
        ? error
        : (maybeHttpError.error?.message ??
            maybeHttpError.message ??
            'The request failed.'),
    );
    this.loading.set(false);
  }
  //show error message has the same function as showError
  //that is why it is commented out

  // private showErrorMessage(error: unknown): void {
  //   this.loading.set(false);
  //   const httpError = error as { error?: ApiError; message?: string };
  //   const body = httpError.error;
  //   const message =
  //     typeof error === 'string'
  //       ? error
  //       : (body?.message ??
  //         httpError.message ??
  //         'The onboarding request failed.');

  //   if (body?.details) {
  //     const detailText = Object.entries(body.details)
  //       .map(([key, value]) => `${key}: ${value}`)
  //       .join('. ');
  //     if (detailText) {
  //       message = `${message} ${detailText}`;
  //     }
  //   }

  //   this.error.set(message);

  //   // ✅ Auto‑dismiss after 4 seconds
  //   setTimeout(() => this.error.set(''), 4000);
  // }

  disableLinkAccountButton = false;

  private refreshBankAccounts(): void {
    this.loadBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccounts.set(accounts);
        this.disableLinkAccountButton = accounts.length >= 5;
      },
      error: (error) => this.showError(error),
      complete: () => this.loading.set(false),
    });
  }

  private loadBankAccounts(): Observable<BankAccountResponse[]> {
    return this.api
      .listBankAccounts()
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 403 ? of([]) : throwError(() => error),
        ),
      );
  }

  private clearStatusTimeout(key: string): void {
    const handle = this.statusTimeouts.get(key);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.statusTimeouts.delete(key);
    }
  }

  private setDefaultSettlementOption(
    options: SettlementOptionResponse[],
  ): void {
    const first = options[0];
    if (first) this.settlement.bankCode = first.code;
  }

  private startCountdown(resendAfterSeconds: number): void {
    this.stopCountdown();
    this.resendAvailableAt.set(Date.now() + resendAfterSeconds * 1000);
    this.nowTick.set(Date.now());
    this.countdownHandle = setInterval(() => {
      this.nowTick.set(Date.now());
      if (this.resendSecondsRemaining() === 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownHandle !== null) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }
  private showKycSuccess(): void {
    this.kycSubmitSuccess.set(true);
    this.kycSuccessTimeout = setTimeout(
      () => this.continueAfterKycSubmit(),
      1800,
    );
  }

  private distributeOtpDigits(rawValue: string, startIndex: number): void {
    const digits = rawValue.slice(0, 6 - startIndex).split('');

    this.otpDigits.update((current) => {
      const next = [...current];
      digits.forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });

    this.focusOtpBox(Math.min(startIndex + digits.length, 6) - 1);
  }

  private focusOtpBox(index: number): void {
    queueMicrotask(() => this.otpBoxRefs()[index]?.nativeElement.focus());
  }

  private resetOtpDigits(): void {
    this.otpDigits.set(['', '', '', '', '', '']);
  }
}

function formatThousands(value: number): string {
  return value.toLocaleString('en-US');
}

/** Finds where the cursor should land after formatting, based on how many
 *  digits preceded it before the reformat (so typing mid-number doesn't jump). */
function cursorPositionForDigitCount(
  formatted: string,
  digitCount: number,
): number {
  if (digitCount <= 0) {
    return 0;
  }

  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted[index])) {
      seen++;
      if (seen === digitCount) {
        return index + 1;
      }
    }
  }

  return formatted.length;
}
function parseAmountFromDisplay(display: string | undefined): number | null {
  if (!display) {
    return null;
  }

  const numericPortion = display.replace(/[^\d.]/g, '');
  if (!numericPortion) {
    return null;
  }

  const parsed = Number(numericPortion);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function stripCurrencyLabel(display: string): string {
  return display.replace(/[A-Za-z]+\s*/g, '').trim();
}
