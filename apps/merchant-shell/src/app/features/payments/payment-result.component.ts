import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import * as QRCode from 'qrcode';
import { Payment, PaymentStatus } from '@zat-main-web/core-api';
import {
  EsEmptyStateComponent,
  EsProgressStep,
  EsProgressStepsComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { TenantContextService } from '@zat-main-web/tenant-context';

@Component({
  selector: 'es-payment-result',
  imports: [
    DatePipe,
    EsEmptyStateComponent,
    EsProgressStepsComponent,
    EsStatusBadgeComponent,
  ],
  template: `
    <es-progress-steps [steps]="progressSteps()" />

    <header class="payment-header">
      <es-status-badge [label]="payment().status" [tone]="tone()" />
      <p class="payment-header__amount">{{ amountLabel() }}</p>
      @if (payment().description) {
        <p class="payment-header__description">{{ payment().description }}</p>
      }
      @if (payment().expiresAt) {
        <p class="payment-header__expiry">
          Expires {{ payment().expiresAt | date: 'medium' }}
        </p>
      }
    </header>

    <div class="channel-results">
      @if (payment().channels?.ethswitchQr?.available) {
        <section class="channel-result channel-result--qr">
          <h3><span aria-hidden="true">🔳</span> Scan to pay</h3>

          @if (qrDataUrl(); as generatedSrc) {
            <img
              class="qr-image"
              [src]="generatedSrc"
              alt="Payment QR code for {{ amountLabel() }}"
              width="220"
              height="220"
            />
            <div class="merchant-block">
              <strong>{{ tenant.currentMerchant().businessName }}</strong>
              <span>Merchant ID: {{ tenant.currentMerchant().id }}</span>
            </div>
          } @else {
            <es-empty-state
              icon="qr_code_2"
              title="QR code unavailable"
              description="The QR code could not be generated for this request."
            />
          }

          @if (payment().channels?.ethswitchQr?.qrPayload; as payload) {
            <details class="qr-payload-details">
              <summary>Show raw payload</summary>
              <code class="qr-payload">{{ payload }}</code>
            </details>
          }
        </section>
      }

      @if (
        payment().channels?.telebirrH5?.available &&
          payment().channels?.telebirrH5?.checkoutUrl;
        as checkoutUrl
      ) {
        <section class="channel-result channel-result--centered">
          <h3><span aria-hidden="true">📲</span> Telebirr</h3>
          <p class="channel-hint">
            Send the customer to Telebirr checkout, or open it yourself to
            complete the payment.
          </p>
          <a
            class="checkout-link"
            [href]="checkoutUrl"
            target="_blank"
            rel="noreferrer"
            >Open Telebirr checkout</a
          >
        </section>
      }

      @if (payment().channels?.ussd?.available) {
        <section class="channel-result channel-result--centered">
          <h3><span aria-hidden="true">☎️</span> USSD</h3>
          @if (payment().channels?.ussd?.ussdString; as ussdString) {
            <p class="ussd-string">{{ ussdString }}</p>
          }
          @if (payment().channels?.ussd?.instructions) {
            <p class="instructions">
              {{ payment().channels?.ussd?.instructions }}
            </p>
          }
          @if (payment().channels?.ussd?.instructionsAm) {
            <p class="instructions instructions--am">
              {{ payment().channels?.ussd?.instructionsAm }}
            </p>
          }
        </section>
      }

      @if (payment().channels?.bankResolve?.available) {
        <section class="channel-result">
          <h3><span aria-hidden="true">🏦</span> Bank transfer</h3>
          <div class="bank-panel">
            <div class="bank-panel__reference">
              <span>Reference code</span>
              <strong>{{
                payment().channels?.bankResolve?.referenceCode ||
                  payment().referenceCode
              }}</strong>
            </div>
            @if (payment().channels?.bankResolve?.instructions) {
              <p class="instructions">
                {{ payment().channels?.bankResolve?.instructions }}
              </p>
            }
            @if (payment().channels?.bankResolve?.instructionsAm) {
              <p class="instructions instructions--am">
                {{ payment().channels?.bankResolve?.instructionsAm }}
              </p>
            }
          </div>
          @if (payment().channels?.bankResolve?.supportedBanks?.length) {
            <ul class="bank-list">
              @for (
                bank of payment().channels?.bankResolve?.supportedBanks;
                track bank.bankCode || bank.bankName
              ) {
                <li>{{ bank.bankName || bank.bankCode }}</li>
              }
            </ul>
          }
        </section>
      }

      @if (hasAvailableDeepLinks()) {
        <section class="channel-result">
          <h3><span aria-hidden="true">🔗</span> Bank apps</h3>
          <p class="channel-hint">
            Open the customer's bank app directly to pay.
          </p>
          <div class="deep-link-list">
            @for (link of payment().channels?.deepLinks; track link.bankCode) {
              @if (link.available && link.url) {
                <a class="deep-link" [href]="link.url">{{
                  link.bankName || link.bankCode
                }}</a>
              }
            }
          </div>
        </section>
      }
    </div>

    <p class="fine-print">✔ Processed via licensed payment partner</p>
  `,
  styles: [
    `
      .payment-header {
        border-bottom: 1px solid var(--es-color-border);
        display: grid;
        gap: 0.375rem;
        justify-items: center;
        padding: 0.25rem 0 1.5rem;
        text-align: center;
      }

      .payment-header__amount {
        color: var(--es-color-neutral-900);
        font-size: clamp(1.75rem, 6vw, 2.5rem);
        font-weight: 800;
        line-height: 1.1;
        margin: 0.5rem 0 0;
      }

      .payment-header__description {
        color: var(--es-color-neutral-700);
        margin: 0;
      }

      .payment-header__expiry {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
        margin: 0;
      }

      .channel-results {
        display: grid;
        gap: 1.5rem;
        margin-top: 1.5rem;
      }

      .channel-result {
        border-top: 1px solid var(--es-color-border);
        padding-top: 1.5rem;
      }

      .channel-result h3 {
        align-items: center;
        color: var(--es-color-neutral-900);
        display: flex;
        font-size: 0.9375rem;
        gap: 0.5rem;
        margin: 0 0 0.875rem;
      }

      .channel-result--centered {
        text-align: center;
      }

      .channel-result--centered h3 {
        justify-content: center;
      }

      .channel-hint {
        color: var(--es-color-neutral-600);
        font-size: 0.875rem;
        margin: 0 0 1rem;
      }

      /* QR block */
      .channel-result--qr {
        display: grid;
        justify-items: center;
        text-align: center;
      }

      .channel-result--qr h3 {
        justify-content: center;
      }

      .qr-image {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        display: block;
        height: auto;
        max-width: 14rem;
        padding: 0.75rem;
        width: 100%;
      }

      .merchant-block {
        display: grid;
        gap: 0.2rem;
        justify-items: center;
        margin-top: 0.875rem;
        text-align: center;
      }

      .merchant-block strong {
        color: var(--es-color-neutral-900);
      }

      .merchant-block span {
        color: var(--es-color-neutral-600);
        font-size: 0.8125rem;
      }

      .qr-payload-details {
        margin-top: 0.875rem;
        max-width: 100%;
      }

      .qr-payload-details summary {
        color: var(--es-color-accent-dark);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 700;
        list-style: none;
      }

      .qr-payload-details summary::-webkit-details-marker {
        display: none;
      }

      .qr-payload {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        display: block;
        font-family: var(--es-font-mono);
        font-size: 0.75rem;
        margin-top: 0.5rem;
        overflow-wrap: anywhere;
        padding: 0.75rem;
        text-align: left;
      }

      /* Telebirr */
      .checkout-link {
        background: var(--es-gradient-brand);
        border-radius: var(--es-radius-sm);
        color: white;
        display: inline-block;
        font-weight: 700;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
      }

      /* USSD */
      .ussd-string {
        background: var(--es-color-neutral-100);
        border: 1px dashed var(--es-color-border);
        border-radius: var(--es-radius-sm);
        font-family: var(--es-font-mono);
        font-size: clamp(1.25rem, 5vw, 1.625rem);
        font-weight: 800;
        letter-spacing: 0.02em;
        margin: 0 auto 0.75rem;
        max-width: 20rem;
        overflow-wrap: anywhere;
        padding: 1rem;
      }

      .instructions {
        color: var(--es-color-neutral-700);
        margin: 0 0 0.5rem;
      }

      .instructions--am {
        color: var(--es-color-neutral-600);
      }

      /* Bank transfer */
      .bank-panel {
        background: var(--es-color-neutral-100);
        border-radius: var(--es-radius-sm);
        padding: 1rem;
      }

      .bank-panel__reference {
        border-bottom: 1px solid var(--es-color-border);
        display: grid;
        gap: 0.2rem;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
      }

      .bank-panel__reference span {
        color: var(--es-color-neutral-600);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .bank-panel__reference strong {
        color: var(--es-color-neutral-900);
        font-family: var(--es-font-mono);
        font-size: 1.0625rem;
      }

      .bank-panel .instructions:last-child {
        margin-bottom: 0;
      }

      .bank-list {
        color: var(--es-color-neutral-700);
        margin: 0.875rem 0 0;
        padding-left: 1.25rem;
      }

      /* Deep links */
      .deep-link-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.625rem;
      }

      .deep-link {
        background: var(--es-color-neutral-100);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        color: var(--es-color-accent-dark);
        font-weight: 700;
        padding: 0.625rem 0.875rem;
        text-decoration: none;
      }

      .deep-link:hover {
        border-color: var(--es-color-accent);
      }

      .fine-print {
        color: var(--es-color-accent-dark);
        font-size: 0.8125rem;
        font-weight: 700;
        margin: 1.5rem 0 0;
        text-align: center;
      }

      @media (max-width: 640px) {
        .checkout-link {
          display: block;
          text-align: center;
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
export class PaymentResultComponent {
  readonly tenant = inject(TenantContextService);
  readonly payment = input.required<Payment>();

  readonly qrDataUrl = signal<string | null>(null);

  readonly amountLabel = computed(
    () =>
      this.payment().amount.display ??
      `ETB ${(this.payment().amount.amount / 100).toFixed(2)}`,
  );

  readonly tone = computed<'success' | 'warning' | 'danger' | 'neutral'>(() => {
    const status = this.payment().status;
    if (status === 'COMPLETED') return 'success';
    if (status === 'PENDING' || status === 'PROCESSING') return 'warning';
    if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED')
      return 'danger';
    return 'neutral';
  });

  readonly progressSteps = computed<EsProgressStep[]>(() => {
    const status: PaymentStatus = this.payment().status;

    let awaitingState: EsProgressStep['state'] = 'pending';
    let finalState: EsProgressStep['state'] = 'pending';
    let finalLabel = 'Payment confirmed';

    if (status === 'PENDING' || status === 'PROCESSING') {
      awaitingState = 'active';
    } else if (status === 'COMPLETED') {
      awaitingState = 'done';
      finalState = 'done';
    } else if (
      status === 'FAILED' ||
      status === 'EXPIRED' ||
      status === 'CANCELLED'
    ) {
      awaitingState = 'error';
      finalState = 'error';
      finalLabel =
        status === 'FAILED'
          ? 'Payment failed'
          : status === 'EXPIRED'
            ? 'Payment expired'
            : 'Payment cancelled';
    }

    return [
      { label: 'Payment details', state: 'done' },
      { label: 'Request created', state: 'done' },
      { label: 'Awaiting customer', state: awaitingState },
      { label: finalLabel, state: finalState },
    ];
  });

  constructor() {
    effect(() => {
      void this.generateQrCode(this.payment());
    });
  }

  hasAvailableDeepLinks(): boolean {
    return Boolean(
      this.payment().channels?.deepLinks?.some(
        (link) => link.available && link.url,
      ),
    );
  }

  private async generateQrCode(payment: Payment): Promise<void> {
    const payload = payment.channels?.ethswitchQr?.qrPayload;

    if (!payload) {
      this.qrDataUrl.set(null);
      return;
    }

    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
      });
      this.qrDataUrl.set(dataUrl);
    } catch {
      this.qrDataUrl.set(null);
    }
  }
}
