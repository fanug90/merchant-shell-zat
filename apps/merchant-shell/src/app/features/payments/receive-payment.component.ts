import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Payment,
  PaymentApiService,
  PaymentCreateRequest,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsPageHeaderComponent,
  EsSpinnerComponent,
} from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { PaymentResultComponent } from './payment-result.component';
import { finalize } from 'rxjs';

type ReceiveStep = 'details' | 'result';
type PaymentChannelSelection =
  | 'ETHSWITCH_QR'
  | 'TELEBIRR_H5'
  | 'BANK_RESOLVE'
  | 'USSD'
  | 'BANK_DEEP_LINK';

interface ChannelChoice {
  code: PaymentChannelSelection;
  icon: string;
  title: string;
  description: string;
  selected: boolean;
}

@Component({
  selector: 'es-receive-payment',
  imports: [
    FormsModule,
    RouterLink,
    EsButtonComponent,
    EsCardComponent,
    EsPageHeaderComponent,
    EsSpinnerComponent,
    PaymentResultComponent,
  ],
  template: `
    <es-page-header
      title="Receive payment"
      subtitle="Create a payment request and share it with your customer."
    >
      <es-button variant="ghost" routerLink="/payments"
        >Back to payments</es-button
      >
    </es-page-header>

    @if (step() === 'details') {
      <es-card>
        <label class="amount-field">
          <span class="amount-field__label">Amount</span>
          <div class="amount-field__input">
            <span class="amount-field__currency" aria-hidden="true">ETB</span>
            <input
              name="amount"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="0.00"
              aria-label="Amount in ETB"
              [(ngModel)]="amount"
            />
          </div>
        </label>

        <label class="description-field">
          Description
          <input
            name="description"
            maxlength="500"
            placeholder="Coffee order"
            [(ngModel)]="description"
          />
        </label>
      </es-card>

      <es-card
        title="How can the customer pay?"
        subtitle="Select one or more channels to include in this request."
      >
        <div class="channel-actions">
          <es-button variant="ghost" type="button" (click)="selectAllChannels()"
            >Select all</es-button
          >
          <es-button variant="ghost" type="button" (click)="clearAllChannels()"
            >Clear all</es-button
          >
        </div>

        <div class="channel-grid" role="group" aria-label="Payment channels">
          @for (choice of channelChoices; track choice.code) {
            <label
              class="channel-card"
              [class.channel-card--selected]="choice.selected"
            >
              <input
                type="checkbox"
                class="channel-card__checkbox"
                [checked]="choice.selected"
                (change)="toggleChannel(choice)"
                [attr.aria-label]="choice.title"
              />
              <span class="channel-card__icon" aria-hidden="true">{{
                choice.icon
              }}</span>
              <span class="channel-card__title">{{ choice.title }}</span>
              <span class="channel-card__description">{{
                choice.description
              }}</span>
            </label>
          }
        </div>

        @if (isUssdSelected()) {
          <!-- <label class="ussd-phone-field">
            Customer phone<span class="ussd-phone-field__hint"
              >(required for USSD)</span
            >
            <input
              name="customerPhone"
              required
              placeholder="+251912345678"
              [(ngModel)]="customerPhone"
            />
          </label> -->
          <label class="ussd-phone-field">
            <div class="ussd-phone-field__header">
              Customer phone
              <span class="ussd-phone-field__hint">(required for USSD)</span>
            </div>
            <input
              name="customerPhone"
              required
              placeholder="+251912345678"
              [(ngModel)]="customerPhone"
            />
          </label>
        }

        @if (formError()) {
          <p class="error" role="alert">{{ formError() }}</p>
        }

        @if (creating()) {
          <es-spinner label="Creating payment request..." />
        } @else {
          <es-button (click)="submit()">Create payment request</es-button>
        }

        <p class="fine-print">
          QR and payment processing depend on a licensed bank, PSP, or
          EthSwitch-compliant rails.
        </p>
      </es-card>
    }

    @if (step() === 'result' && payment(); as current) {
      <es-card
        title="Payment request created"
        [subtitle]="'Reference ' + current.referenceCode"
      >
        <es-payment-result [payment]="current" />

        @if (refreshError()) {
          <p class="error" role="alert">{{ refreshError() }}</p>
        }

        <div class="result-actions">
          <es-button
            variant="secondary"
            [disabled]="refreshing()"
            (click)="refreshStatus()"
          >
            {{ refreshing() ? 'Refreshing...' : 'Refresh status' }}
          </es-button>
          <es-button variant="ghost" (click)="shareOnWhatsApp()"
            >Share via WhatsApp</es-button
          >
        </div>

        <es-button variant="ghost" (click)="reset()"
          >Create another payment</es-button
        >
      </es-card>
    }
  `,
  styles: [
    `
      @use 'responsive' as *;

      .amount-field {
        display: grid;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .amount-field__label {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .amount-field__input:focus-within {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
      }

      .amount-field__currency {
        color: var(--es-color-neutral-600);
        font-size: 1.25rem;
        font-weight: 800;
      }

      .amount-field__input {
        align-items: center;
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        display: flex;
        gap: 0.5rem;
        padding: 0.55rem 1rem; // was 0.75rem — height only
      }

      .amount-field__input input {
        border: 0;
        flex: 1;
        font-size: clamp(1.25rem, 4vw, 1.75rem);
        font-weight: 800;
        min-height: auto;
        min-width: 0;
        padding: 0;
      }

      .description-field {
        color: var(--es-color-neutral-700);
        display: grid;
        // grid-template-columns: max-content max-content;
        font-weight: 650;
        gap: 0.375rem;
      }

      .description-field input {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        grid-column: 1 / span 2;
        padding: 0 0.75rem;
        width: 100%;
      }

      .amount-field__input input:focus {
        box-shadow: none;
        outline: 0;
      }

      .error {
        background: #fde8e8;
        border-radius: var(--es-radius-sm);
        color: #9b1c1c;
        margin: 0 0 1rem;
        padding: 0.875rem 1rem;
      }

      label {
        color: var(--es-color-neutral-700);
        display: grid;
        font-weight: 650;
        gap: 0.375rem;
      }

      input {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
        width: 100%;
      }

      input:focus {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
        outline: 0;
      }

      .channel-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-bottom: 0.75rem;
      }

      // Fluid: naturally goes 5 -> 4 -> 3 -> 2 -> 1 columns as width shrinks,
      // at every width, not just fixed snap points.
      .channel-grid {
        @include fluid-grid(9.5rem, 0.875rem);
        margin-bottom: 1rem;
      }

      .channel-card {
        background: white;
        border: 2px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        cursor: pointer;
        display: grid;
        gap: 0.4rem;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto auto;
        padding: 1.1rem 0.9rem;
      }

      .channel-card__checkbox {
        grid-column: 2;
        grid-row: 1;
        height: 1.125rem;
        justify-self: end;
        min-height: auto;
        width: 1.125rem;
      }

      .channel-card__icon {
        font-size: 1.5rem;
        grid-column: 1;
        grid-row: 1;
      }

      .channel-card__title {
        color: var(--es-color-neutral-900);
        font-weight: 750;
        grid-column: 1 / -1;
      }

      .channel-card__description {
        color: var(--es-color-neutral-600);
        font-size: 0.78125rem;
        grid-column: 1 / -1;
        line-height: 1.4;
      }

      .channel-card--selected {
        border-color: var(--es-color-accent);
        box-shadow: 0 12px 30px rgba(6, 26, 64, 0.08);
      }

      .channel-card:focus-within {
        border-color: var(--es-color-accent);
        box-shadow: 0 0 0 3px rgba(0, 168, 121, 0.14);
      }

      .fine-print {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 0.75rem 0 0;
      }

      .fine-print--badge {
        color: var(--es-color-accent-dark);
        font-weight: 700;
        margin-top: 1rem;
      }

      .result-summary {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        margin: 1.25rem 0 0.25rem;
      }

      .result-summary es-money-amount {
        font-size: clamp(1.25rem, 4vw, 1.5rem);
        font-weight: 800;
      }

      .expiry-note {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 0 0 1.25rem;
      }

      .channel-results {
        display: grid;
        gap: 1.25rem;
      }

      .channel-result {
        border-top: 1px solid var(--es-color-border);
        padding-top: 1.25rem;
      }

      .channel-result h3 {
        color: var(--es-color-neutral-900);
        font-size: 0.9375rem;
        margin: 0 0 0.75rem;
      }

      .qr-image {
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        display: block;
        height: auto;
        margin: 0 auto 0.75rem;
        max-width: 13rem;
        width: 100%;
      }

      .merchant-block {
        display: grid;
        gap: 0.25rem;
        justify-items: center;
        text-align: center;
      }

      .merchant-block span {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
      }

      .qr-payload-label {
        color: var(--es-color-neutral-600);
        font-size: 0.75rem;
        font-weight: 700;
        margin: 0.75rem 0 0.375rem;
        text-align: center;
      }

      .qr-payload {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        display: block;
        font-family: var(--es-font-mono);
        font-size: 0.75rem;
        overflow-wrap: anywhere;
        padding: 0.75rem;
        text-align: center;
      }

      .checkout-link {
        display: inline-block;
        max-width: 100%;
        text-decoration: none;
      }

      .ussd-string {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        font-family: var(--es-font-mono);
        font-size: clamp(1.125rem, 4vw, 1.375rem);
        font-weight: 800;
        letter-spacing: 0.02em;
        margin: 0 0 0.75rem;
        overflow-wrap: anywhere;
        padding: 0.875rem;
        text-align: center;
      }

      .ussd-phone-field {
        color: var(--es-color-neutral-700);
        display: grid;
        gap: 0.375rem;
        margin-bottom: 1rem;
        font-weight: 650;
      }

      /* This keeps the label and hint on the same line */
      .ussd-phone-field__header {
        display: flex;
        gap: 0.25rem; /* Space between text and hint */
      }

      .ussd-phone-field__hint {
        color: var(--es-color-neutral-600);
        font-weight: 500;
      }

      .instructions {
        color: var(--es-color-neutral-700);
        margin: 0 0 0.5rem;
      }

      .instructions--am {
        color: var(--es-color-neutral-600);
      }

      .bank-list {
        color: var(--es-color-neutral-700);
        margin: 0;
        padding-left: 1.25rem;
      }

      .deep-link-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.625rem;
      }

      .deep-link {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-accent-dark);
        font-weight: 700;
        padding: 0.625rem 0.875rem;
        text-decoration: none;
      }

      .result-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin: 1.25rem 0 1rem;
      }

      @include mobile {
        .channel-actions {
          justify-content: stretch;
        }

        .channel-actions es-button {
          flex: 1;
        }

        .result-actions {
          flex-direction: column;
        }

        .result-actions es-button,
        .checkout-link {
          width: 100%;
        }

        .deep-link-list {
          flex-direction: column;
        }

        .deep-link {
          text-align: center;
        }
      }
    `,
  ],
})
export class ReceivePaymentComponent {
  private readonly api = inject(PaymentApiService);
  readonly tenant = inject(TenantContextService);

  readonly channelChoices: ChannelChoice[] = [
    {
      code: 'ETHSWITCH_QR',
      icon: '🔳',
      title: 'QR code',
      description: 'Customer scans to pay instantly via EthSwitch.',
      selected: true,
    },
    {
      code: 'TELEBIRR_H5',
      icon: '📲',
      title: 'Telebirr',
      description: 'Redirect the customer to Telebirr checkout.',
      selected: true,
    },
    {
      code: 'BANK_RESOLVE',
      icon: '🏦',
      title: 'Bank transfer',
      description: 'Customer pays at any bank using a reference code.',
      selected: true,
    },
    {
      code: 'USSD',
      icon: '☎️',
      title: 'USSD',
      description: 'For feature phones. Requires the customer phone number.',
      selected: false,
    },
    {
      code: 'BANK_DEEP_LINK',
      icon: '🔗',
      title: 'Bank deep links',
      description: 'Launch a specific bank app directly to pay.',
      selected: true,
    },
  ];

  readonly step = signal<ReceiveStep>('details');
  readonly creating = signal(false);
  readonly refreshing = signal(false);
  readonly formError = signal('');
  readonly refreshError = signal('');
  readonly payment = signal<Payment | null>(null);
  readonly qrImageFailed = signal(false);

  amount: number | null = null;
  description = '';
  reference = '';
  customerPhone = '';

  readonly amountLabel = computed(() => {
    const current = this.payment();
    if (current) {
      return (
        current.amount.display ??
        `ETB ${(current.amount.amount / 100).toFixed(2)}`
      );
    }
    return this.amount ? `ETB ${this.amount.toFixed(2)}` : 'ETB 0.00';
  });

  isUssdSelected(): boolean {
    return this.channelChoices.some(
      (choice) => choice.code === 'USSD' && choice.selected,
    );
  }
  selectAllChannels(): void {
    this.channelChoices.forEach((choice) => (choice.selected = true));
  }

  clearAllChannels(): void {
    this.channelChoices.forEach((choice) => (choice.selected = false));
  }

  toggleChannel(choice: ChannelChoice): void {
    choice.selected = !choice.selected;
  }

  submit(): void {
    this.formError.set('');

    if (!this.amount || this.amount <= 0) {
      this.formError.set('Enter an amount greater than zero.');
      return;
    }

    const selected = this.channelChoices
      .filter((choice) => choice.selected)
      .map((choice) => choice.code);

    // if (selected.length === 0) {
    //   this.formError.set('Select at least one payment channel.');
    //   return;
    // }

    if (selected.includes('USSD') && !this.customerPhone) {
      this.formError.set('Enter the customer phone number to include USSD.');
      return;
    }

    this.submitPayment(selected);
  }

  refreshStatus(): void {
    const current = this.payment();

    if (!current) {
      return;
    }

    this.refreshing.set(true);
    this.refreshError.set('');

    this.api
      .listPayments({ referenceCode: current.referenceCode })
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (response) => {
          const updated = response.data[0];
          if (updated) {
            this.payment.set(updated);
            this.qrImageFailed.set(false);
          }
        },
        error: () =>
          this.refreshError.set('Could not refresh payment status. Try again.'),
      });
  }

  shareOnWhatsApp(): void {
    const message = this.whatsAppMessage();
    const phone = this.customerPhone.replace(/[^0-9]/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    if (navigator.share) {
      navigator
        .share({ text: message })
        .catch(() => window.open(url, '_blank', 'noopener'));
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  reset(): void {
    this.step.set('details');
    this.payment.set(null);
    this.qrImageFailed.set(false);
    this.formError.set('');
    this.refreshError.set('');
    this.amount = null;
    this.description = '';
    this.customerPhone = '';
  }

  private submitPayment(channels: PaymentChannelSelection[]): void {
    if (!this.amount) {
      return;
    }

    const request: PaymentCreateRequest = {
      amount: Math.round(this.amount * 100),
      description: this.description || undefined,
      customerPhone: channels.includes('USSD') ? this.customerPhone : undefined,
      enabledChannels: channels,
    };

    this.creating.set(true);
    this.formError.set('');

    this.api
      .createPayment(request)
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: (payment) => {
          this.payment.set(payment);
          this.qrImageFailed.set(false);
          this.step.set('result');
        },
        error: (error) => {
          const maybeHttpError = error as {
            error?: { message?: string };
            message?: string;
          };
          this.formError.set(
            maybeHttpError.error?.message ??
              maybeHttpError.message ??
              'The payment request could not be created.',
          );
        },
      });
  }

  private whatsAppMessage(): string {
    const current = this.payment();

    if (!current) {
      return '';
    }

    const lines = [
      `${this.tenant.currentMerchant().businessName} sent you a payment request`,
      '',
      `Amount: ${this.amountLabel()}`,
    ];

    if (current.description) {
      lines.push(`For: ${current.description}`);
    }

    const ussd = current.channels?.ussd;
    const telebirr = current.channels?.telebirrH5;
    const bankResolve = current.channels?.bankResolve;

    if (ussd?.available && ussd.ussdString) {
      lines.push('', `Dial: ${ussd.ussdString}`);
    }
    if (telebirr?.available && telebirr.checkoutUrl) {
      lines.push('', `Pay online: ${telebirr.checkoutUrl}`);
    }
    if (bankResolve?.available && bankResolve.instructions) {
      lines.push('', bankResolve.instructions);
    }

    lines.push('', `Reference: ${current.referenceCode}`);

    return lines.join('\n');
  }
}
