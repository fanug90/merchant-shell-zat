import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CORE_API_CONFIG } from './core-api.config';
import { PaymentApiService } from './payment-api.service';

const BASE = 'http://payment-service.test';

describe('PaymentApiService', () => {
  let api: PaymentApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PaymentApiService,
        {
          provide: CORE_API_CONFIG,
          useValue: {
            bffBaseUrl: '',
            merchantServiceBaseUrl: 'http://merchant-service.test',
            paymentServiceBaseUrl: BASE,
            coreApiVersion: 'v1',
            useMockWorkspace: false,
          },
        },
      ],
    });

    api = TestBed.inject(PaymentApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('listPayments', () => {
    it('sends no query params when called with an empty object', () => {
      api.listPayments().subscribe();

      const request = http.expectOne((r) => r.url === `${BASE}/v1/payments`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys().length).toBe(0);

      request.flush({
        data: [],
        meta: {
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
        },
      });
    });

    it('serializes every provided filter to a string query param', () => {
      api
        .listPayments({
          page: 1,
          size: 10,
          status: 'PENDING',
          channel: 'TELEBIRR',
          from: '2026-07-01',
          to: '2026-07-31',
          reference: 'INV-041',
          referenceCode: 'ES-20260703-8291',
          minAmount: 1000,
          maxAmount: 50000,
        } as never)
        .subscribe();

      const request = http.expectOne((r) => r.url === `${BASE}/v1/payments`);
      expect(request.request.params.get('page')).toBe('1');
      expect(request.request.params.get('size')).toBe('10');
      expect(request.request.params.get('status')).toBe('PENDING');
      expect(request.request.params.get('channel')).toBe('TELEBIRR');
      expect(request.request.params.get('from')).toBe('2026-07-01');
      expect(request.request.params.get('to')).toBe('2026-07-31');
      expect(request.request.params.get('reference')).toBe('INV-041');
      expect(request.request.params.get('referenceCode')).toBe(
        'ES-20260703-8291',
      );
      expect(request.request.params.get('minAmount')).toBe('1000');
      expect(request.request.params.get('maxAmount')).toBe('50000');

      request.flush({
        data: [],
        meta: {
          page: 1,
          size: 10,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
        },
      });
    });

    it('keeps an explicit 0 (e.g. page: 0) instead of dropping it as falsy', () => {
      // toHttpParams uses `value !== undefined && value !== null && value !== ''`,
      // not a truthiness check — this test pins that down, since a naive
      // `if (value)` guard here would silently drop page 0 from every request.
      api.listPayments({ page: 0, size: 20 } as never).subscribe();

      const request = http.expectOne((r) => r.url === `${BASE}/v1/payments`);
      expect(request.request.params.has('page')).toBe(true);
      expect(request.request.params.get('page')).toBe('0');

      request.flush({
        data: [],
        meta: {
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
        },
      });
    });

    it('omits undefined, null, and empty-string filter values', () => {
      api
        .listPayments({
          status: undefined,
          channel: '' as never,
          from: null as never,
          reference: 'kept',
        } as never)
        .subscribe();

      const request = http.expectOne((r) => r.url === `${BASE}/v1/payments`);
      expect(request.request.params.has('status')).toBe(false);
      expect(request.request.params.has('channel')).toBe(false);
      expect(request.request.params.has('from')).toBe(false);
      expect(request.request.params.get('reference')).toBe('kept');

      request.flush({
        data: [],
        meta: {
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
        },
      });
    });

    it('does not attach an Authorization header itself', () => {
      api.listPayments().subscribe();

      const request = http.expectOne((r) => r.url === `${BASE}/v1/payments`);
      expect(request.request.headers.has('Authorization')).toBe(false);

      request.flush({
        data: [],
        meta: {
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
        },
      });
    });
  });

  describe('createPayment', () => {
    it('posts the payment request body with a generated Idempotency-Key', () => {
      api
        .createPayment({ amount: 12550, description: 'Coffee order' } as never)
        .subscribe((payment) => {
          expect(payment.id).toBe('pay-1');
        });

      const request = http.expectOne(`${BASE}/v1/payments`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        amount: 12550,
        description: 'Coffee order',
      });
      expect(request.request.headers.has('Idempotency-Key')).toBe(true);
      expect(
        request.request.headers.get('Idempotency-Key')?.length,
      ).toBeGreaterThan(0);

      request.flush({ id: 'pay-1', referenceCode: 'ES-20260703-0001' });
    });

    it('generates a fresh Idempotency-Key on every call', () => {
      api.createPayment({ amount: 1000 } as never).subscribe();
      api.createPayment({ amount: 2000 } as never).subscribe();

      const [first, second] = http.match(`${BASE}/v1/payments`);
      expect(first.request.headers.get('Idempotency-Key')).not.toBe(
        second.request.headers.get('Idempotency-Key'),
      );

      first.flush({ id: 'pay-1' });
      second.flush({ id: 'pay-2' });
    });

    it('does not attach an Authorization header itself', () => {
      api.createPayment({ amount: 1000 } as never).subscribe();

      const request = http.expectOne(`${BASE}/v1/payments`);
      expect(request.request.headers.has('Authorization')).toBe(false);

      request.flush({ id: 'pay-1' });
    });
  });
});
