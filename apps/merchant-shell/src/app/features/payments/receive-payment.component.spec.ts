import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  Payment,
  PaymentApiService,
  PaymentListResponse,
} from '@zat-main-web/core-api';
import { TenantContextService } from '@zat-main-web/tenant-context';
import { of, throwError } from 'rxjs';
import { ReceivePaymentComponent } from './receive-payment.component';

// ── Test data builders ─────────────────────────────────────────────────────

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    referenceCode: 'ES-20260703-0001',
    amount: { amount: 10000, currency: 'ETB', display: 'ETB 100.00' },
    status: 'PENDING',
    description: '',
    createdAt: '2026-07-03T08:00:00Z',
    updatedAt: '2026-07-03T08:00:00Z',
    channels: {
      ussd: { available: true, ussdString: '*127*10000*ES0001#' },
      telebirrH5: {
        available: true,
        checkoutUrl: 'https://pay.telebirr.example/checkout/pay-1',
      },
      bankResolve: {
        available: true,
        instructions: 'Pay at any bank using reference: ES-20260703-0001',
      },
    },
    ...overrides,
  } as Payment;
}

function makeListResponse(payments: Payment[]): PaymentListResponse {
  return {
    data: payments,
    meta: {
      page: 0,
      size: 20,
      totalElements: payments.length,
      totalPages: 1,
      hasNext: false,
    },
  } as PaymentListResponse;
}

// ── Suite ────────────────────────────────────────────────────────────────

describe('ReceivePaymentComponent', () => {
  const api = {
    createPayment: vi.fn(),
    listPayments: vi.fn(),
  };

  const tenant = {
    currentMerchant: vi.fn(),
  };

  function createComponent() {
    const fixture = TestBed.createComponent(ReceivePaymentComponent);
    fixture.detectChanges();
    return fixture;
  }

  function ussdChoice(component: ReceivePaymentComponent) {
    return component.channelChoices.find((c) => c.code === 'USSD')!;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    tenant.currentMerchant.mockReturnValue({ businessName: "Dawit's Cafe" });

    TestBed.configureTestingModule({
      imports: [ReceivePaymentComponent],
      providers: [
        provideRouter([]),
        { provide: PaymentApiService, useValue: api },
        { provide: TenantContextService, useValue: tenant },
      ],
    });
  });

  it('starts on the details step with USSD unselected and every other channel selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.step()).toBe('details');
    expect(component.isUssdSelected()).toBe(false);
    expect(
      component.channelChoices
        .filter((c) => c.code !== 'USSD')
        .every((c) => c.selected),
    ).toBe(true);
  });

  it('selectAllChannels / clearAllChannels toggle every choice, including USSD', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.clearAllChannels();
    expect(component.channelChoices.every((c) => !c.selected)).toBe(true);

    component.selectAllChannels();
    expect(component.channelChoices.every((c) => c.selected)).toBe(true);
  });

  it('toggleChannel flips a single choice without affecting the others', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const ussd = ussdChoice(component);

    component.toggleChannel(ussd);
    expect(ussd.selected).toBe(true);
    expect(component.isUssdSelected()).toBe(true);

    component.toggleChannel(ussd);
    expect(ussd.selected).toBe(false);
  });

  describe('submit', () => {
    it('blocks submission when no amount is entered', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = null;

      component.submit();

      expect(component.formError()).toBe('Enter an amount greater than zero.');
      expect(api.createPayment).not.toHaveBeenCalled();
    });

    it('blocks submission when amount is zero or negative', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 0;

      component.submit();

      expect(component.formError()).toBe('Enter an amount greater than zero.');
      expect(api.createPayment).not.toHaveBeenCalled();
    });

    it('blocks submission when USSD is selected without a customer phone', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.toggleChannel(ussdChoice(component));
      component.customerPhone = '';

      component.submit();

      expect(component.formError()).toBe(
        'Enter the customer phone number to include USSD.',
      );
      expect(api.createPayment).not.toHaveBeenCalled();
    });

    it('allows submission with zero channels selected — the "at least one channel" guard is currently disabled', () => {
      // The commented-out block in submit() would normally block this.
      // This test documents the current (permissive) behavior rather than
      // assuming the guard is active.
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.clearAllChannels();

      component.submit();

      expect(api.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ enabledChannels: [] }),
      );
    });

    it('converts the amount to minor units and sends only the selected channels', () => {
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 125.5;
      component.description = 'Coffee order';

      component.submit();

      expect(api.createPayment).toHaveBeenCalledWith({
        amount: 12550,
        description: 'Coffee order',
        customerPhone: undefined,
        enabledChannels: [
          'ETHSWITCH_QR',
          'TELEBIRR_H5',
          'BANK_RESOLVE',
          'BANK_DEEP_LINK',
        ],
      });
    });

    it('omits the description when left blank', () => {
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.description = '';

      component.submit();

      expect(api.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
      );
    });

    it('includes the customer phone only when USSD is among the selected channels', () => {
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.customerPhone = '+251912345678';
      component.toggleChannel(ussdChoice(component));

      component.submit();

      expect(api.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ customerPhone: '+251912345678' }),
      );
    });

    it('on success, stores the payment, resets the QR failure flag, and moves to the result step', () => {
      const payment = makePayment();
      api.createPayment.mockReturnValue(of(payment));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.qrImageFailed.set(true);

      component.submit();

      expect(component.payment()).toEqual(payment);
      expect(component.qrImageFailed()).toBe(false);
      expect(component.step()).toBe('result');
      expect(component.creating()).toBe(false);
    });

    it('on failure, surfaces the server error message and stays on the details step', () => {
      api.createPayment.mockReturnValue(
        throwError(() => ({
          error: { message: 'Merchant not eligible to receive payments' },
        })),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;

      component.submit();

      expect(component.formError()).toBe(
        'Merchant not eligible to receive payments',
      );
      expect(component.step()).toBe('details');
      expect(component.creating()).toBe(false);
    });
  });

  describe('refreshStatus', () => {
    it('does nothing when there is no current payment', () => {
      const fixture = createComponent();
      fixture.componentInstance.refreshStatus();
      expect(api.listPayments).not.toHaveBeenCalled();
    });

    it('updates the payment when the server returns a match by reference code', () => {
      const original = makePayment({ status: 'PENDING' });
      const updated = makePayment({ status: 'COMPLETED' });
      api.createPayment.mockReturnValue(of(original));
      api.listPayments.mockReturnValue(of(makeListResponse([updated])));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();
      component.qrImageFailed.set(true);

      component.refreshStatus();

      expect(api.listPayments).toHaveBeenCalledWith({
        referenceCode: original.referenceCode,
      });
      expect(component.payment()).toEqual(updated);
      expect(component.qrImageFailed()).toBe(false);
      expect(component.refreshing()).toBe(false);
    });

    it('leaves the payment untouched when the server returns no match', () => {
      const original = makePayment();
      api.createPayment.mockReturnValue(of(original));
      api.listPayments.mockReturnValue(of(makeListResponse([])));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();

      component.refreshStatus();

      expect(component.payment()).toEqual(original);
    });

    it('surfaces an error message on failure and resets the refreshing flag', () => {
      api.createPayment.mockReturnValue(of(makePayment()));
      api.listPayments.mockReturnValue(
        throwError(() => new Error('network down')),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();

      component.refreshStatus();

      expect(component.refreshError()).toBe(
        'Could not refresh payment status. Try again.',
      );
      expect(component.refreshing()).toBe(false);
    });
  });

  it('reset clears the form, the payment, and returns to the details step', () => {
    api.createPayment.mockReturnValue(of(makePayment()));

    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.amount = 100;
    component.description = 'Coffee';
    component.customerPhone = '+251912345678';
    component.submit();

    component.reset();

    expect(component.step()).toBe('details');
    expect(component.payment()).toBeNull();
    expect(component.amount).toBeNull();
    expect(component.description).toBe('');
    expect(component.customerPhone).toBe('');
    expect(component.formError()).toBe('');
    expect(component.refreshError()).toBe('');
  });

  describe('shareOnWhatsApp', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      Reflect.deleteProperty(navigator, 'share');
    });

    it('opens a wa.me link with the stripped customer phone when Web Share is unavailable', () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      api.createPayment.mockReturnValue(
        of(
          makePayment({
            referenceCode: 'ES-20260703-8291',
            description: 'Coffee order',
          }),
        ),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.customerPhone = '+251 91-234-5678';
      component.submit();

      component.shareOnWhatsApp();

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [url] = openSpy.mock.calls[0] as [string];
      expect(url).toContain('https://wa.me/251912345678?text=');
      expect(decodeURIComponent(url)).toContain('Reference: ES-20260703-8291');
    });

    it('falls back to a generic wa.me link when no customer phone was entered', () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();

      component.shareOnWhatsApp();

      const [url] = openSpy.mock.calls[0] as [string];
      expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    });

    it('uses the Web Share API when available and does not fall back on success', () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();

      component.shareOnWhatsApp();

      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Reference:'),
        }),
      );
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('falls back to window.open if navigator.share rejects', async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error('user cancelled'));
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      api.createPayment.mockReturnValue(of(makePayment()));

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();

      component.shareOnWhatsApp();
      await fixture.whenStable(); // flush the rejected share() promise's .catch()

      expect(openSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('amountLabel', () => {
    it('reflects `amount` on first read, but only the `payment` signal re-triggers the computed afterward', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.amount = 500;
      expect(component.amountLabel()).toBe('ETB 500.00');

      component.amount = 999;
      expect(component.amountLabel()).toBe('ETB 500.00'); // stale by computed() design
    });

    it('prefers the server-reported display string once a payment exists', () => {
      api.createPayment.mockReturnValue(
        of(
          makePayment({
            amount: { amount: 45000, currency: 'ETB', display: 'ETB 450.00' },
          }),
        ),
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.amount = 100;
      component.submit();

      expect(component.amountLabel()).toBe('ETB 450.00');
    });
  });
});
