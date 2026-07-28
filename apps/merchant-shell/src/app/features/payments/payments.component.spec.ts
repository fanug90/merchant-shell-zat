import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  Payment,
  PaymentApiService,
  PaymentListResponse,
} from '@zat-main-web/core-api';
import { of, throwError } from 'rxjs';
import { PaymentsComponent } from './payments.component';

// ── Test data builders ─────────────────────────────────────────────────────

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    referenceCode: 'ES-20260703-0001',
    amount: { amount: 10000, currency: 'ETB', display: 'ETB 100.00' },
    status: 'PENDING',
    channelType: 'ETHSWITCH_QR',
    channel: 'CBE_BIRR',
    description: '',
    createdAt: '2026-07-03T08:00:00Z',
    updatedAt: '2026-07-03T08:00:00Z',
    ...overrides,
  } as Payment;
}

function makeListResponse(
  overrides: Partial<{
    data: Payment[];
    meta: {
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
      hasNext: boolean;
    };
    summary: unknown;
  }> = {},
): PaymentListResponse {
  return {
    data: [],
    meta: {
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
    },
    summary: null,
    ...overrides,
  } as PaymentListResponse;
}

// ── Suite ────────────────────────────────────────────────────────────────

describe('PaymentsComponent', () => {
  const api = {
    listPayments: vi.fn(),
  };

  function createComponent() {
    const fixture = TestBed.createComponent(PaymentsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    api.listPayments.mockReturnValue(of(makeListResponse()));

    TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        provideRouter([]),
        { provide: PaymentApiService, useValue: api },
      ],
    });
  });

  it('shows the "load history" empty state before history has been requested', () => {
    const fixture = createComponent();

    expect(api.listPayments).not.toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Load Your recent payment activity.');
  });

  it('showHistory fetches the first page with no filters applied', () => {
    const fixture = createComponent();

    fixture.componentInstance.showHistory();

    expect(api.listPayments).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      status: undefined,
      channel: undefined,
      from: undefined,
      to: undefined,
    });
    expect(fixture.componentInstance.historyRequested()).toBe(true);
  });

  it('populates payments, summary, and pagination state from the response', () => {
    const payments = [makePayment(), makePayment({ id: 'pay-2' })];
    api.listPayments.mockReturnValue(
      of(
        makeListResponse({
          data: payments,
          meta: {
            page: 0,
            size: 20,
            totalElements: 2,
            totalPages: 3,
            hasNext: true,
          },
          summary: {
            totalRevenue: {
              amount: 4500,
              currency: 'ETB',
              display: 'ETB 45.00',
            },
          },
        }),
      ),
    );

    const fixture = createComponent();
    fixture.componentInstance.showHistory();
    const component = fixture.componentInstance;

    expect(component.payments()).toEqual(payments);
    expect(component.totalPages()).toBe(3);
    expect(component.hasNext()).toBe(true);
    expect(
      (component.summary() as never as { totalRevenue: { display: string } })
        ?.totalRevenue.display,
    ).toBe('ETB 45.00');
    expect(component.loading()).toBe(false);
  });

  it('surfaces a server error message and stops loading', () => {
    api.listPayments.mockReturnValue(
      throwError(() => ({
        error: { message: 'Payments service unavailable' },
      })),
    );

    const fixture = createComponent();
    fixture.componentInstance.showHistory();

    expect(fixture.componentInstance.listError()).toBe(
      'Payments service unavailable',
    );
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  describe('pagination', () => {
    it('prevPage is a no-op on the first page', () => {
      const fixture = createComponent();
      fixture.componentInstance.showHistory();
      api.listPayments.mockClear();

      fixture.componentInstance.prevPage();

      expect(api.listPayments).not.toHaveBeenCalled();
      expect(fixture.componentInstance.page()).toBe(0);
    });

    it('nextPage advances the page and refetches when hasNext is true', () => {
      api.listPayments.mockReturnValue(
        of(
          makeListResponse({
            meta: {
              page: 0,
              size: 20,
              totalElements: 40,
              totalPages: 2,
              hasNext: true,
            },
          }),
        ),
      );
      const fixture = createComponent();
      fixture.componentInstance.showHistory();
      api.listPayments.mockClear();
      api.listPayments.mockReturnValue(of(makeListResponse()));

      fixture.componentInstance.nextPage();

      expect(fixture.componentInstance.page()).toBe(1);
      expect(api.listPayments).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      );
    });

    it('nextPage is a no-op when hasNext is false', () => {
      api.listPayments.mockReturnValue(
        of(
          makeListResponse({
            meta: {
              page: 0,
              size: 20,
              totalElements: 5,
              totalPages: 1,
              hasNext: false,
            },
          }),
        ),
      );
      const fixture = createComponent();
      fixture.componentInstance.showHistory();
      api.listPayments.mockClear();

      fixture.componentInstance.nextPage();

      expect(api.listPayments).not.toHaveBeenCalled();
    });

    it('pageLabel formats the current page against the total, flooring at 1 page', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.pageLabel()).toBe('Page 1 of 1'); // totalPages starts at 0

      component.totalPages.set(4);
      component.page.set(2);
      expect(component.pageLabel()).toBe('Page 3 of 4');
    });
  });

  describe('filters', () => {
    it('toggleFilters flips the panel open state', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.filtersOpen()).toBe(false);
      component.toggleFilters();
      expect(component.filtersOpen()).toBe(true);
    });

    it('applyFilters resets to page 0, closes the panel, and refetches with the entered filters', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.showHistory();
      component.page.set(2);
      component.filtersOpen.set(true);
      component.statusFilter = 'PENDING';
      component.channelFilter = 'TELEBIRR';
      component.fromDate = '2026-07-01';
      component.toDate = '2026-07-31';
      api.listPayments.mockClear();

      component.applyFilters();

      expect(component.page()).toBe(0);
      expect(component.filtersOpen()).toBe(false);
      expect(api.listPayments).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        status: 'PENDING',
        channel: 'TELEBIRR',
        from: '2026-07-01',
        to: '2026-07-31',
      });
    });

    it('clearFilters resets every filter field and refetches with none applied', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.showHistory();
      component.statusFilter = 'PENDING';
      component.channelFilter = 'TELEBIRR';
      component.fromDate = '2026-07-01';
      component.toDate = '2026-07-31';
      api.listPayments.mockClear();

      component.clearFilters();

      expect(component.statusFilter).toBe('');
      expect(component.channelFilter).toBe('');
      expect(component.fromDate).toBe('');
      expect(component.toDate).toBe('');
      expect(api.listPayments).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        status: undefined,
        channel: undefined,
        from: undefined,
        to: undefined,
      });
    });

    it('hasActiveFilters is true only when at least one filter field is set', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.hasActiveFilters()).toBe(false);
      component.statusFilter = 'PENDING';
      expect(component.hasActiveFilters()).toBe(true);
    });
  });

  describe('pure helpers', () => {
    it('tone maps every status to its badge tone', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.tone('COMPLETED')).toBe('success');
      expect(component.tone('PENDING')).toBe('warning');
      expect(component.tone('PROCESSING')).toBe('warning');
      expect(component.tone('FAILED')).toBe('danger');
      expect(component.tone('EXPIRED')).toBe('danger');
      expect(component.tone('CANCELLED')).toBe('danger');
      expect(component.tone('REFUNDED')).toBe('neutral');
    });

    it('channelIcon maps known channel types and falls back to a generic card icon', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.channelIcon(makePayment({ channelType: 'USSD' }))).toBe(
        '☎️',
      );
      expect(
        component.channelIcon(makePayment({ channelType: undefined })),
      ).toBe('💳');
    });

    it('major converts amount cents to a decimal major unit', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.major(12550)).toBe(125.5);
    });
  });

  it('renders the payment table once history has loaded with data', () => {
    api.listPayments.mockReturnValue(
      of(
        makeListResponse({
          data: [makePayment({ referenceCode: 'ES-20260703-8291' })],
        }),
      ),
    );

    const fixture = createComponent();
    fixture.componentInstance.showHistory();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('ES-20260703-8291');
  });
});
