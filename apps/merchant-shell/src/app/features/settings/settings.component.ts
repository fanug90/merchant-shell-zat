import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@zat-main-web/auth';
import {
  AddressDto,
  BankAccountResponse,
  BusinessType,
  DocumentSide,
  DocumentType,
  KycDocumentFile,
  KycDocumentRecord,
  KycDocumentRequirementResponse,
  KycSubmissionResponse,
  MerchantResponse,
  SettingApiService,
  SettlementOptionResponse,
  SideUploadStatus,
  UploadPolicy,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsPageHeaderComponent,
  EsSpinnerComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { finalize, forkJoin, of, switchMap } from 'rxjs';

type SettingsTab = 'business' | 'kyc' | 'settlement' | 'password';

@Component({
  selector: 'es-settings',
  standalone: true,
  imports: [
    FormsModule,
    EsButtonComponent,
    EsCardComponent,
    EsPageHeaderComponent,
    EsSpinnerComponent,
    EsStatusBadgeComponent,
    NgTemplateOutlet,
  ],
  template: `
    <es-page-header
      title="Settings"
      subtitle="Manage your business profile, KYC documents, settlement account, and password."
    />

    <nav class="settings-tabs" aria-label="Settings sections">
      @for (tab of tabs; track tab.key) {
        <button
          type="button"
          [class.active]="activeTab() === tab.key"
          (click)="activeTab.set(tab.key)"
        >
          {{ tab.label }}
        </button>
      }
    </nav>

    @if (loading()) {
      <div class="loading"><es-spinner label="Working..." /></div>
    }

    @if (message()) {
      <p class="message" role="status">{{ message() }}</p>
    }

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    @switch (activeTab()) {
      @case ('business') {
        <es-card
          title="Business details"
          subtitle="These details appear on your merchant profile."
        >
          <form class="form" (ngSubmit)="saveBusiness()">
            <div class="two">
              <label for="s-businessName">
                Business name
                <input
                  id="s-businessName"
                  name="businessName"
                  required
                  [(ngModel)]="business.businessName"
                  (ngModelChange)="bumpBusinessTick()"
                />
              </label>
              <label for="s-businessNameAm">
                Amharic business name
                <input
                  id="s-businessNameAm"
                  name="businessNameAm"
                  required
                  [(ngModel)]="business.businessNameAm"
                  (ngModelChange)="bumpBusinessTick()"
                />
              </label>
            </div>
            <div class="two">
              <label for="s-businessType">
                Business type
                <select
                  id="s-businessType"
                  name="businessType"
                  required
                  [(ngModel)]="business.businessType"
                  (ngModelChange)="bumpBusinessTick()"
                >
                  @for (type of businessTypes; track type) {
                    <option [value]="type">{{ label(type) }}</option>
                  }
                </select>
              </label>
              <label for="s-email">
                Email
                <input
                  id="s-email"
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  [(ngModel)]="business.email"
                  (ngModelChange)="bumpBusinessTick()"
                />
              </label>
            </div>
            <div class="two">
              <label for="s-city"
                >City <span class="optional-tag">(optional)</span>
                <input id="s-city" name="city" [(ngModel)]="business.city" />
              </label>
              <label for="s-subcity"
                >Subcity <span class="optional-tag">(optional)</span>
                <input
                  id="s-subcity"
                  name="subcity"
                  [(ngModel)]="business.subcity"
                />
              </label>
            </div>
            <div class="two">
              <label for="s-woreda"
                >Woreda <span class="optional-tag">(optional)</span>
                <input
                  id="s-woreda"
                  name="woreda"
                  [(ngModel)]="business.woreda"
                />
              </label>
              <label for="s-revenue">
                Estimated monthly revenue
                <span class="currency-input">
                  <span class="currency-input__prefix" aria-hidden="true"
                    >ETB</span
                  >
                  <input
                    id="s-revenue"
                    name="estimatedMonthlyRevenue"
                    type="text"
                    inputmode="numeric"
                    required
                    [value]="revenueDisplay()"
                    (input)="onRevenueInput($event)"
                  />
                </span>
              </label>
            </div>
            <es-button type="submit" [disabled]="loading() || !businessValid()"
              >Save changes</es-button
            >
          </form>
        </es-card>
      }

      @case ('kyc') {
        <es-card
          title="KYC documents"
          subtitle="Upload or replace documents at any time."
        >
          @if (kycSubmission(); as submission) {
            <div class="kyc-status">
              <span
                class="kyc-pill"
                [class.kyc-pill--success]="
                  kycStatusTone(submission.status) === 'success'
                "
                [class.kyc-pill--warning]="
                  kycStatusTone(submission.status) === 'warning'
                "
                [class.kyc-pill--danger]="
                  kycStatusTone(submission.status) === 'danger'
                "
                [class.kyc-pill--neutral]="
                  kycStatusTone(submission.status) === 'neutral'
                "
              >
                @if (kycStatusTone(submission.status) === 'success') {
                  <span aria-hidden="true">✓</span>
                }
                {{ kycStatusLabel(submission.status) }}
              </span>
              @if (submission.rejectionReason) {
                <span class="kyc-status__reason">{{
                  submission.rejectionReason
                }}</span>
              }
            </div>
            @if (submission.status === 'SUBMITTED' && merchantPlan()) {
              <p class="kyc-status__plan">
                Current plan: <strong>{{ merchantPlan() }}</strong>
              </p>
            }
          }

          @if (uploadPolicy(); as policy) {
            <p class="upload-hint upload-hint--top">
              Accepted formats: {{ allowedFormatsLabel(policy) }} · Max size:
              {{ policy.maxFileSizeLabel }}
            </p>
          }

          <!-- Identity document — single dropdown, one active side-upload set -->
          <section class="kyc-group kyc-group--identity">
            <div class="kyc-group__panel">
              <label for="identity-select" class="doc-select-label">
                Identity document
                <select
                  id="identity-select"
                  [ngModel]="identitySelection()"
                  (ngModelChange)="selectIdentityDocumentType($event)"
                >
                  @for (
                    requirement of identityRequirements();
                    track requirement.documentType
                  ) {
                    <option [value]="requirement.documentType">
                      {{ requirement.displayName }}
                      @if (isRequirementComplete(requirement)) {
                        ✓
                      }
                    </option>
                  }
                </select>
              </label>

              @if (activeIdentityRequirement(); as requirement) {
                @if (requiresExpiryDate(requirement)) {
                  @if (expiryDateFor(requirement.documentType); as expiryDate) {
                    <p class="expiry-info">
                      <span class="expiry-info__label">Expiry date</span>
                      <strong class="expiry-info__value">{{
                        formatExpiryDate(expiryDate)
                      }}</strong>
                    </p>
                  } @else if (
                    isSideUploaded(
                      requirement.documentType,
                      requirement.requiredSides[0]
                    )
                  ) {
                    <p class="expiry-info__pending">Extracting expiry date…</p>
                  }
                }
                <ng-container
                  *ngTemplateOutlet="sideUploadsPanel; context: { requirement }"
                />
              }
            </div>
          </section>

          <!-- Business license — accordion, one row per required type -->
          <div class="kyc-groups">
            @for (
              requirement of businessLicenseRequirements();
              track requirement.documentType
            ) {
              <section class="kyc-group">
                <button
                  type="button"
                  class="kyc-group__toggle"
                  [attr.aria-expanded]="
                    isDocumentExpanded(requirement.documentType)
                  "
                  (click)="toggleDocument(requirement.documentType)"
                >
                  <div class="kyc-group__toggle-info">
                    <h3>{{ requirement.displayName }}</h3>
                    @if (
                      requiresExpiryDate(requirement) &&
                        expiryDateFor(requirement.documentType);
                      as expiryDate
                    ) {
                      <span class="kyc-group__toggle-meta"
                        >Expires {{ formatExpiryDate(expiryDate) }}</span
                      >
                    }
                  </div>
                  <div class="kyc-group__toggle-status">
                    @if (isRequirementComplete(requirement)) {
                      <es-status-badge label="Complete" tone="success" />
                    } @else if (uploadedSidesCount(requirement) > 0) {
                      <es-status-badge
                        [label]="
                          uploadedSidesCount(requirement) +
                          '/' +
                          requirement.requiredSides.length +
                          ' sides'
                        "
                        tone="warning"
                      />
                    } @else {
                      <es-status-badge label="Not uploaded" tone="neutral" />
                    }
                    <span
                      class="kyc-group__chevron"
                      [class.kyc-group__chevron--open]="
                        isDocumentExpanded(requirement.documentType)
                      "
                      aria-hidden="true"
                      >›</span
                    >
                  </div>
                </button>

                @if (isDocumentExpanded(requirement.documentType)) {
                  <div class="kyc-group__panel">
                    <ng-container
                      *ngTemplateOutlet="
                        sideUploadsPanel;
                        context: { requirement }
                      "
                    />
                  </div>
                }
              </section>
            }
          </div>

          <div class="kyc-submit">
            @if (kycSubmitError()) {
              <p class="kyc-submit__error" role="alert">
                {{ kycSubmitError() }}
              </p>
            }
            <es-button
              [disabled]="loading() || !canSubmitKyc()"
              (click)="submitKyc()"
              >Resubmit KYC documents</es-button
            >
          </div>
        </es-card>

        <ng-template #sideUploadsPanel let-requirement="requirement">
          <div class="side-uploads">
            @for (side of requirement.requiredSides; track side) {
              <div
                class="side-upload"
                [class.side-upload--done]="
                  isSideUploaded(requirement.documentType, side)
                "
                [class.side-upload--uploading]="
                  isUploading(requirement.documentType, side)
                "
              >
                <div class="side-upload__meta">
                  <span class="side-label">{{ side }}</span>
                  @if (isSideUploaded(requirement.documentType, side)) {
                    <span class="side-done" aria-label="Uploaded">✓</span>
                  }
                </div>
                <div class="side-upload__actions">
                  @if (isSideUploaded(requirement.documentType, side)) {
                    <button
                      type="button"
                      class="view-button"
                      [disabled]="isUploading(requirement.documentType, side)"
                      (click)="openPreview(requirement.documentType, side)"
                    >
                      View
                    </button>
                  }
                  <label
                    [for]="'s-file-' + requirement.documentType + '-' + side"
                    class="file-label"
                    [class.file-label--disabled]="
                      isUploading(requirement.documentType, side)
                    "
                  >
                    <span>
                      @if (isUploading(requirement.documentType, side)) {
                        <span
                          class="file-label__spinner"
                          aria-hidden="true"
                        ></span>
                        Uploading…
                      } @else {
                        {{
                          isSideUploaded(requirement.documentType, side)
                            ? 'Replace file'
                            : 'Choose file'
                        }}
                      }
                    </span>
                    <input
                      [id]="'s-file-' + requirement.documentType + '-' + side"
                      type="file"
                      [accept]="acceptAttr()"
                      [disabled]="isUploading(requirement.documentType, side)"
                      (change)="onFileChange(requirement, side, $event)"
                    />
                  </label>
                </div>
                @if (sideStatusFor(requirement.documentType, side); as status) {
                  <p
                    class="side-upload__status"
                    [class.side-upload__status--error]="status.type === 'error'"
                    [class.side-upload__status--success]="
                      status.type === 'success'
                    "
                    role="status"
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
          subtitle="Link or update your settlement bank/wallet account."
        >
          <form class="form" (ngSubmit)="linkSettlementAccount()">
            <div class="two">
              <label for="s-bankCode">
                Bank or wallet
                <select
                  id="s-bankCode"
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
              <label for="s-accountNumber">
                Account number
                <input
                  id="s-accountNumber"
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
                  (click)="selectDefault(account)"
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

      @case ('password') {
        <es-card
          title="Change password"
          subtitle="You'll stay signed in with a refreshed session after changing your password."
        >
          <form class="form" (ngSubmit)="changePassword()">
            <label for="s-currentPassword">
              Current password
              <input
                id="s-currentPassword"
                name="currentPassword"
                type="password"
                required
                autocomplete="current-password"
                [(ngModel)]="passwordForm.currentPassword"
              />
            </label>
            <div class="two">
              <label for="s-newPassword">
                New password
                <input
                  id="s-newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minlength="8"
                  autocomplete="new-password"
                  [(ngModel)]="passwordForm.newPassword"
                  (ngModelChange)="bumpPasswordTick()"
                />
              </label>
              <label for="s-confirmPassword">
                Confirm new password
                <input
                  id="s-confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autocomplete="new-password"
                  [(ngModel)]="passwordForm.confirmPassword"
                  (ngModelChange)="bumpPasswordTick()"
                />
                @if (passwordMismatch()) {
                  <span class="field-error" role="alert"
                    >Passwords don't match</span
                  >
                }
              </label>
            </div>
            <es-button type="submit" [disabled]="loading() || !passwordValid()"
              >Update password</es-button
            >
          </form>
        </es-card>
      }
    }

    @if (previewFile(); as file) {
      <div
        class="preview-overlay"
        role="dialog"
        aria-modal="true"
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
            <p class="preview-empty">No preview available.</p>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .settings-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
      }
      .settings-tabs button {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-neutral-700);
        cursor: pointer;
        font-weight: 650;
        min-height: 2.5rem;
        padding: 0 1rem;
      }
      .settings-tabs button.active {
        border-color: var(--es-color-accent);
        color: var(--es-color-accent-dark);
      }

      .form {
        display: grid;
        gap: 1rem;
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
      .optional-tag {
        color: var(--es-color-neutral-600);
        font-weight: 400;
      }
      input:not([type='checkbox']):not([type='file']),
      select {
        background: white;
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
      }
      .checkbox {
        align-items: center;
        display: flex;
        gap: 0.625rem;
      }
      .checkbox input {
        min-height: auto;
      }
      .field-error {
        color: #9b1c1c;
        font-size: 0.75rem;
        font-weight: 650;
      }

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
        display: flex;
        align-items: center;
        font-weight: 700;
        padding: 0 0.625rem;
      }
      .currency-input input {
        border-radius: 0 var(--es-radius-sm) var(--es-radius-sm) 0;
        flex: 1;
      }

      .message,
      .error,
      .loading {
        border-radius: var(--es-radius-sm);
        margin-bottom: 1rem;
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
      }

      .kyc-status {
        align-items: center;
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .kyc-status__reason {
        color: #9b1c1c;
        font-size: 0.8125rem;
        font-weight: 650;
      }

      .kyc-status__check {
        color: var(--es-color-accent-dark);
        font-size: 1.125rem;
        font-weight: 800;
      }

      .kyc-status__plan {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 0 0 1rem;
      }

      .upload-hint--top {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 0 0 1.25rem;
        padding: 0.625rem 0.875rem;
      }

      .kyc-pill {
        align-items: center;
        border-radius: 999px;
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: 700;
        gap: 0.25rem;
        padding: 0.375rem 0.625rem;
      }
      .kyc-pill--success {
        background: #def7ec;
        color: #03543f;
      }
      .kyc-pill--warning {
        background: #feecdc;
        color: #8a2c0d;
      }
      .kyc-pill--danger {
        background: #fde8e8;
        color: #9b1c1c;
      }
      .kyc-pill--neutral {
        background: var(--es-color-neutral-100);
        color: var(--es-color-neutral-700);
      }

      .kyc-group--identity {
        padding: 0;
      }
      .kyc-group--identity .kyc-group__panel {
        border-top: 0;
        padding: 1.25rem;
      }
      .doc-select-label {
        color: var(--es-color-neutral-700);
        display: grid;
        font-size: 0.875rem;
        font-weight: 650;
        gap: 0.375rem;
        margin: 0 0 1rem;
      }
      .doc-select-label select {
        background: white;
        border: 1px solid #cbd8e7;
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
      }

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
        align-items: center;
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }
      .kyc-group__header h3 {
        color: var(--es-color-neutral-900);
        font-size: 1rem;
        margin: 0;
      }
      .kyc-group {
        padding: 0;
        overflow: hidden;
      }

      .kyc-group__toggle {
        align-items: center;
        background: white;
        border: 0;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        padding: 1.25rem;
        text-align: left;
        width: 100%;
      }

      .kyc-group__toggle-info h3 {
        color: var(--es-color-neutral-900);
        font-size: 1rem;
        margin: 0;
      }

      .kyc-group__toggle-meta {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
      }

      .kyc-group__toggle-status {
        align-items: center;
        display: flex;
        gap: 0.75rem;
      }

      .kyc-group__chevron {
        color: var(--es-color-neutral-600);
        font-size: 1.25rem;
        transform: rotate(90deg);
        transition: transform 150ms ease;
      }

      .kyc-group__chevron--open {
        transform: rotate(-90deg);
      }

      .kyc-group__panel {
        border-top: 1px solid var(--es-color-border);
        padding: 1.25rem;
      }

      .expiry-info {
        color: var(--es-color-neutral-700);
        font-size: 0.875rem;
        margin: 0 0 0.75rem;
      }
      .expiry-info__label {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
      }
      .expiry-info__pending {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-style: italic;
        margin: 0 0 0.75rem;
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
        position: relative;
      }
      .side-upload--done {
        border-color: var(--es-color-accent);
      }
      .side-upload--uploading {
        border-color: var(--es-color-primary);
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
      .file-label {
        cursor: pointer;
        display: block;
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
      }
      .file-label--disabled {
        cursor: not-allowed;
      }
      .file-label--disabled span {
        opacity: 0.75;
      }
      .file-label input[type='file'] {
        height: 0;
        opacity: 0;
        position: absolute;
        width: 0;
      }
      .file-label__spinner {
        animation: settings-spin 800ms linear infinite;
        border: 2px solid rgba(0, 128, 251, 0.25);
        border-radius: 999px;
        border-top-color: var(--es-color-primary);
        display: inline-block;
        height: 0.875rem;
        margin-right: 0.375rem;
        width: 0.875rem;
      }
      @keyframes settings-spin {
        to {
          transform: rotate(360deg);
        }
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly api = inject(SettingApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly statusTimeouts = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  readonly tabs: { key: SettingsTab; label: string }[] = [
    { key: 'business', label: 'Business' },
    { key: 'kyc', label: 'KYC' },
    { key: 'settlement', label: 'Settlement' },
    { key: 'password', label: 'Password' },
  ];

  readonly businessTypes: BusinessType[] = [
    'CAFE_RESTAURANT',
    'RETAIL_SHOP',
    'TAXI_TRANSPORT',
    'ONLINE_SELLER',
    'FREELANCER',
    'OTHER',
  ];
  private readonly expiryRequiredTypes: ReadonlySet<DocumentType> = new Set([
    'PASSPORT',
    'DRIVERS_LICENSE',
    'TRADE_LICENSE',
  ]);
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  readonly activeTab = signal<SettingsTab>('business');
  readonly loading = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  // ── Business ──────────────────────────────────────────────────────────────
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
  readonly revenueDisplay = signal('');
  private readonly businessTick = signal(0);
  bumpBusinessTick(): void {
    this.businessTick.update((n) => n + 1);
  }
  readonly businessValid = computed(() => {
    this.businessTick();
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

  onRevenueInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    this.business.estimatedMonthlyRevenue = digits ? Number(digits) : null;
    this.revenueDisplay.set(
      digits ? Number(digits).toLocaleString('en-US') : '',
    );
    this.bumpBusinessTick();
  }

  // ── KYC ───────────────────────────────────────────────────────────────────
  readonly kycRequirements = signal<KycDocumentRequirementResponse[]>([]);
  readonly kycSubmission = signal<KycSubmissionResponse | null>(null);
  readonly uploadPolicy = signal<UploadPolicy | null>(null);
  readonly uploadingKeys = signal<Set<string>>(new Set());
  readonly sideStatus = signal<Record<string, SideUploadStatus>>({});
  readonly kycSubmitError = signal('');
  readonly previewFile = signal<KycDocumentFile | null>(null);
  readonly merchantPlan = signal<string | null>(null);
  readonly expandedDocumentType = signal<DocumentType | null>(null);

  private readonly identityDocumentTypes: DocumentType[] = [
    'KEBELE_ID',
    'PASSPORT',
    'DRIVERS_LICENSE',
  ];
  private readonly businessLicenseDocumentTypes: DocumentType[] = [
    'TRADE_LICENSE',
  ];
  /** Sides uploaded this editing session, per document type — used to require every required
   *  side be freshly re-uploaded once any one side of that document is touched. */
  readonly touchedSidesThisSession = signal<
    Map<DocumentType, Set<DocumentSide>>
  >(new Map());

  readonly identityRequirements = computed(() =>
    this.kycRequirements().filter((r) =>
      this.identityDocumentTypes.includes(r.documentType),
    ),
  );
  readonly businessLicenseRequirements = computed(() =>
    this.kycRequirements().filter((r) =>
      this.businessLicenseDocumentTypes.includes(r.documentType),
    ),
  );

  readonly identitySelection = signal<DocumentType | null>(null);

  readonly activeIdentityRequirement = computed(
    () =>
      this.identityRequirements().find(
        (r) => r.documentType === this.identitySelection(),
      ) ?? null,
  );

  selectIdentityDocumentType(documentType: DocumentType): void {
    this.identitySelection.set(documentType);
  }

  readonly kycDocuments = computed<KycDocumentRecord[]>(
    () => this.kycSubmission()?.documents ?? [],
  );
  readonly anyUploadInProgress = computed(() => this.uploadingKeys().size > 0);
  readonly acceptAttr = computed(() => {
    const policy = this.uploadPolicy();
    return policy
      ? policy.allowedContentTypes.join(',')
      : 'application/pdf,image/jpeg,image/png,image/webp';
  });
  readonly canSubmitKyc = computed(() => {
    if (this.anyUploadInProgress()) return false;

    const identityRequirement = this.activeIdentityRequirement();
    if (
      !identityRequirement ||
      !this.isDocumentReadyForResubmit(identityRequirement)
    )
      return false;

    return this.businessLicenseRequirements().every((r) =>
      this.isDocumentReadyForResubmit(r),
    );
  });

  private recordFor(documentType: DocumentType): KycDocumentRecord | undefined {
    return this.kycDocuments().find((d) => d.documentType === documentType);
  }
  private fileRecordFor(
    documentType: DocumentType,
    side: DocumentSide,
  ): KycDocumentFile | undefined {
    return this.recordFor(documentType)?.files.find((f) => f.side === side);
  }

  private markSideTouched(
    documentType: DocumentType,
    side: DocumentSide,
  ): void {
    this.touchedSidesThisSession.update((map) => {
      const next = new Map(map);
      const sides = new Set(next.get(documentType) ?? []);
      sides.add(side);
      next.set(documentType, sides);
      return next;
    });
  }

  isDocumentReadyForResubmit(
    requirement: KycDocumentRequirementResponse,
  ): boolean {
    const touched = this.touchedSidesThisSession().get(
      requirement.documentType,
    );
    if (!touched || touched.size === 0) {
      return this.isRequirementComplete(requirement); // untouched: trust server's existing state
    }
    return requirement.requiredSides.every((side) => touched.has(side)); // touched: demand a full fresh set
  }
  isSideUploaded(documentType: DocumentType, side: DocumentSide): boolean {
    return !!this.fileRecordFor(documentType, side);
  }
  uploadedSidesCount(requirement: KycDocumentRequirementResponse): number {
    return requirement.requiredSides.filter((side) =>
      this.isSideUploaded(requirement.documentType, side),
    ).length;
  }
  isRequirementComplete(requirement: KycDocumentRequirementResponse): boolean {
    return (
      this.uploadedSidesCount(requirement) === requirement.requiredSides.length
    );
  }
  requiresExpiryDate(requirement: KycDocumentRequirementResponse): boolean {
    return this.expiryRequiredTypes.has(requirement.documentType);
  }
  expiryDateFor(documentType: DocumentType): string | undefined {
    return this.recordFor(documentType)?.expiryDate;
  }
  formatExpiryDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
  }
  kycStatusTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'APPROVED' || normalized === 'SUBMITTED')
      return 'success';
    if (normalized === 'REJECTED' || normalized === 'REQUIRES_RESUBMISSION')
      return 'danger';
    if (normalized === 'IN_PROGRESS') return 'warning';
    return 'neutral';
  }
  allowedFormatsLabel(policy: UploadPolicy): string {
    return policy.allowedContentTypes
      .map((mime) => mime.split('/')[1]?.toUpperCase() ?? mime)
      .join(', ');
  }
  kycStatusLabel(status?: string): string {
    if ((status ?? '').toUpperCase() === 'SUBMITTED')
      return 'Submitted for review';
    return status || 'NOT_STARTED';
  }

  toggleDocument(documentType: DocumentType): void {
    this.expandedDocumentType.update((current) =>
      current === documentType ? null : documentType,
    );
  }

  isDocumentExpanded(documentType: DocumentType): boolean {
    return this.expandedDocumentType() === documentType;
  }

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

  openPreview(documentType: DocumentType, side: DocumentSide): void {
    const file = this.fileRecordFor(documentType, side);
    if (file) this.previewFile.set(file);
  }
  closePreview(): void {
    this.previewFile.set(null);
  }

  onFileChange(
    requirement: KycDocumentRequirementResponse,
    side: DocumentSide,
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const key = this.keyFor(requirement.documentType, side);
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

    const alreadyUploaded = this.isSideUploaded(requirement.documentType, side);
    this.clearSideStatus(key);
    this.uploadingKeys.update((keys) => new Set(keys).add(key));

    const upload$ = alreadyUploaded
      ? this.api.replaceKycDocument(requirement.documentType, side, file)
      : this.api.uploadKycDocument(requirement.documentType, side, file);

    upload$
      .pipe(
        switchMap(() => this.api.getKycStatus()),
        finalize(() => {
          this.uploadingKeys.update((keys) => {
            const next = new Set(keys);
            next.delete(key);
            return next;
          });
          input.value = '';
        }),
      )
      .subscribe({
        next: (submission) => {
          this.kycSubmission.set(submission);
          this.markSideTouched(requirement.documentType, side);

          this.setSideStatus(
            key,
            'success',
            `${requirement.displayName} ${side} uploaded successfully.`,
          );
        },
        error: (err: unknown) =>
          this.setSideStatus(key, 'error', this.extractErrorMessage(err)),
      });
  }

  submitKyc(): void {
    // const documentIds = [...new Set(this.kycDocuments().map((d) => d.id))];
    // if (documentIds.length === 0) {
    //   this.kycSubmitError.set('No documents found to submit.');
    //   return;
    // }
    const identityType = this.identitySelection();
    const relevantTypes = new Set<DocumentType>([
      ...(identityType ? [identityType] : []),
      ...this.businessLicenseDocumentTypes,
    ]);
    const documentIds = [
      ...new Set(
        this.kycDocuments()
          .filter((d) => relevantTypes.has(d.documentType))
          .map((d) => d.id),
      ),
    ];

    if (documentIds.length === 0) {
      this.kycSubmitError.set('No documents found to submit.');
      return;
    }
    this.kycSubmitError.set('');
    this.loading.set(true);
    this.api
      .submitKyc({ documentIds })
      .pipe(
        switchMap(() => this.api.getKycStatus()),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (submission) => {
          this.kycSubmission.set(submission);
          this.message.set('KYC documents resubmitted for review.');
        },
        error: (err: unknown) =>
          this.kycSubmitError.set(this.extractErrorMessage(err)),
      });
  }

  private setSideStatus(
    key: string,
    type: SideUploadStatus['type'],
    msg: string,
  ): void {
    this.clearStatusTimeout(key);
    this.sideStatus.update((s) => ({ ...s, [key]: { type, message: msg } }));
    if (type === 'success') {
      const handle = setTimeout(() => {
        this.sideStatus.update((s) => {
          const next = { ...s };
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
    this.sideStatus.update((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
  }
  private clearStatusTimeout(key: string): void {
    const handle = this.statusTimeouts.get(key);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.statusTimeouts.delete(key);
    }
  }

  // ── Settlement ────────────────────────────────────────────────────────────
  readonly settlementOptions = signal<SettlementOptionResponse[]>([]);
  readonly bankAccounts = signal<BankAccountResponse[]>([]);
  readonly selectedBankAccountId = signal<string | null>(null);
  settlement = { bankCode: 'CBE', accountNumber: '', makeDefault: true };

  linkSettlementAccount(): void {
    this.run(() =>
      this.api
        .linkBankAccount({
          bankCode: this.settlement.bankCode,
          accountNumber: this.settlement.accountNumber,
          makeDefault: this.settlement.makeDefault,
        })
        .pipe(switchMap(() => this.api.listBankAccounts()))
        .subscribe({
          next: (accounts) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(
              accounts.find((a) => a.defaultAccount)?.id ?? null,
            );
            this.message.set('Settlement account linked.');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
    );
  }

  selectDefault(account: BankAccountResponse): void {
    this.run(() =>
      this.api
        .selectDefaultBankAccount(account)
        .pipe(switchMap(() => this.api.listBankAccounts()))
        .subscribe({
          next: (accounts) => {
            this.bankAccounts.set(accounts);
            this.selectedBankAccountId.set(account.id);
            this.message.set('Default settlement account updated.');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
    );
  }

  // ── Password ──────────────────────────────────────────────────────────────
  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  private readonly passwordTick = signal(0);
  bumpPasswordTick(): void {
    this.passwordTick.update((n) => n + 1);
  }
  readonly passwordMismatch = computed(() => {
    this.passwordTick();
    return (
      this.passwordForm.confirmPassword.length > 0 &&
      this.passwordForm.newPassword !== this.passwordForm.confirmPassword
    );
  });
  readonly passwordValid = computed(() => {
    this.passwordTick();
    return (
      this.passwordForm.currentPassword.length > 0 &&
      this.passwordForm.newPassword.length >= 8 &&
      this.passwordForm.newPassword === this.passwordForm.confirmPassword
    );
  });

  changePassword(): void {
    this.run(() =>
      this.api.changePassword(this.passwordForm).subscribe({
        next: (token) => {
          this.auth.setToken(token.accessToken);
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          this.message.set('Password updated.');
        },
        error: (err: unknown) => this.showError(err),
        complete: () => this.loading.set(false),
      }),
    );
  }

  // ── Lifecycle / bootstrap ────────────────────────────────────────────────
  constructor() {
    this.loadAll();
    this.destroyRef.onDestroy(() => {
      for (const handle of this.statusTimeouts.values()) clearTimeout(handle);
      this.statusTimeouts.clear();
    });
  }

  private loadAll(): void {
    this.run(() =>
      forkJoin({
        merchant: this.api.getMerchantProfile(),
        kycRequirements: this.api.listKycRequirements(),
        kycSubmission: this.api.getKycStatus(),
        uploadPolicy: this.api.getUploadPolicy(),
        settlementOptions: this.api.listSettlementOptions(),
        bankAccounts: this.api.listBankAccounts(),
      }).subscribe({
        next: ({
          merchant,
          kycRequirements,
          kycSubmission,
          uploadPolicy,
          settlementOptions,
          bankAccounts,
        }) => {
          this.hydrateBusiness(merchant);
          this.kycRequirements.set(kycRequirements);
          this.kycSubmission.set(kycSubmission);
          this.uploadPolicy.set(uploadPolicy);
          this.settlementOptions.set(settlementOptions);
          this.bankAccounts.set(bankAccounts);
          this.selectedBankAccountId.set(
            bankAccounts.find((a) => a.defaultAccount)?.id ?? null,
          );
          const uploadedIdentityType = this.identityDocumentTypes.find((type) =>
            kycSubmission.documents?.some((d) => d.documentType === type),
          );
          this.identitySelection.set(
            uploadedIdentityType ??
              this.identityRequirements()[0]?.documentType ??
              null,
          );
        },
        error: (err: unknown) => this.showError(err),
        complete: () => this.loading.set(false),
      }),
    );
  }

  saveBusiness(): void {
    this.run(() =>
      this.api
        .updateMerchantProfile({
          businessName: this.business.businessName,
          businessNameAm: this.business.businessNameAm,
          businessType: this.business.businessType,
          email: this.business.email,
          address: {
            city: this.business.city || undefined,
            subcity: this.business.subcity || undefined,
            woreda: this.business.woreda || undefined,
          } as AddressDto,
          estimatedMonthlyRevenue:
            this.business.estimatedMonthlyRevenue ?? undefined,
        })
        .subscribe({
          next: (merchant) => {
            this.hydrateBusiness(merchant);
            this.message.set('Business details saved.');
          },
          error: (err: unknown) => this.showError(err),
          complete: () => this.loading.set(false),
        }),
    );
  }

  private hydrateBusiness(merchant: MerchantResponse): void {
    this.business.businessName = merchant.businessName ?? '';
    this.business.businessNameAm = merchant.businessNameAm ?? '';
    this.business.businessType =
      merchant.businessType ?? this.business.businessType;
    this.business.email = merchant.email ?? '';
    this.business.city = merchant.address?.city ?? '';
    this.business.subcity = merchant.address?.subcity ?? '';
    this.business.woreda = merchant.address?.woreda ?? '';
    const amount = merchant.estimatedMonthlyRevenue?.amount ?? null;
    this.business.estimatedMonthlyRevenue = amount;
    this.revenueDisplay.set(
      amount !== null ? amount.toLocaleString('en-US') : '',
    );
    this.merchantPlan.set(merchant.plan ?? null);
  }

  label(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  private run(start: () => void): void {
    this.error.set('');
    this.message.set('');
    this.loading.set(true);
    start();
  }

  private showError(err: unknown): void {
    this.error.set(this.extractErrorMessage(err));
    this.loading.set(false);
  }

  private extractErrorMessage(err: unknown): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e.error?.message ?? e.message ?? 'The request failed.';
  }
}
