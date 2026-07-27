import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Payment,
  PaymentApiService,
  PaymentChannelCode,
  PaymentListSummary,
  PaymentStatus,
} from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsEmptyStateComponent,
  EsKpiCardComponent,
  EsMoneyAmountComponent,
  EsPageHeaderComponent,
  EsSpinnerComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';
import { finalize } from 'rxjs';

const CHANNEL_TYPE_ICON: Record<string, string> = {
  ETHSWITCH_QR: '🔳',
  TELEBIRR_H5: '📲',
  USSD: '☎️',
  BANK_RESOLVE: '🏦',
  BANK_DEEP_LINK: '🔗',
};

@Component({
  selector: 'es-payments',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    EsButtonComponent,
    EsCardComponent,
    EsEmptyStateComponent,
    EsKpiCardComponent,
    EsMoneyAmountComponent,
    EsPageHeaderComponent,
    EsSpinnerComponent,
    EsStatusBadgeComponent,
  ],
  template: `
    <es-page-header
      title="Payments"
      subtitle="Create payment requests and review activity."
    >
      <es-button routerLink="/payments/receive">Create payment</es-button>
    </es-page-header>

    @if (!historyRequested()) {
      <es-card>
        <es-empty-state
          icon="history"
          title="Payment history"
          description="Load Your recent payment activity."
          actionLabel="Show history"
          (action)="showHistory()"
        />
      </es-card>
    } @else {
      @if (summary(); as summaryData) {
        <div class="summary-grid">
          <es-kpi-card
            label="Total revenue"
            [value]="summaryData.totalRevenue?.display || 'ETB 0.00'"
            size="compact"
            tone="neutral"
          />
          <es-kpi-card
            label="Completed"
            [value]="String(summaryData.completedCount ?? 0)"
            size="compact"
            tone="neutral"
          />
          <es-kpi-card
            label="Pending"
            [value]="String(summaryData.pendingCount ?? 0)"
            size="compact"
            tone="neutral"
          />
          <es-kpi-card
            label="Failed"
            [value]="String(summaryData.failedCount ?? 0)"
            size="compact"
            tone="neutral"
          />
        </div>
      }

      <es-card title="Payment history">
        <es-button card-actions variant="secondary" (click)="toggleFilters()">
          {{ filtersOpen() ? 'Hide filters' : 'Filter' }}
        </es-button>
        @if (filtersOpen()) {
          <div class="filters">
            <label>
              Status
              <select [(ngModel)]="statusFilter">
                <option value="">All</option>
                @for (status of statusOptions; track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </label>
            <label>
              Channel
              <select [(ngModel)]="channelFilter">
                <option value="">All</option>
                @for (channel of channelOptions; track channel) {
                  <option [value]="channel">{{ channel }}</option>
                }
              </select>
            </label>
            <label>
              From
              <input type="date" [(ngModel)]="fromDate" />
            </label>
            <label>
              To
              <input type="date" [(ngModel)]="toDate" />
            </label>
            <div class="filters-actions">
              <es-button variant="secondary" (click)="applyFilters()"
                >Apply</es-button
              >
              <es-button variant="ghost" (click)="clearFilters()"
                >Clear</es-button
              >
            </div>
          </div>
        }

        @if (listError()) {
          <p class="error" role="alert">{{ listError() }}</p>
        }

        @if (loading()) {
          <es-spinner label="Loading payments..." />
        } @else if (payments().length === 0) {
          <es-empty-state
            icon="payments"
            title="No payments found"
            description="Try adjusting your filters, or create a new payment request."
          />
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Created</th>
                  <th>Description</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (payment of payments(); track payment.id) {
                  <tr
                    class="payment-table-row"
                    [routerLink]="['/payments', payment.referenceCode]"
                    tabindex="0"
                    role="link"
                    [attr.aria-label]="'View payment ' + payment.referenceCode"
                  >
                    <td>
                      <span class="ref-cell">
                        <span class="ref-cell__icon" aria-hidden="true">{{
                          channelIcon(payment)
                        }}</span>
                        {{ payment.referenceCode }}
                      </span>
                    </td>
                    <td>{{ payment.createdAt | date: 'MMM d, y · h:mm a' }}</td>
                    <td class="description-col">
                      {{ payment.description || '—' }}
                    </td>
                    <td>{{ payment.channel || '—' }}</td>
                    <td>
                      <es-status-badge
                        [label]="payment.status"
                        [tone]="tone(payment.status)"
                      />
                    </td>
                    <td class="amount-col">
                      <es-money-amount
                        [amount]="major(payment.amount.amount)"
                        [currency]="payment.amount.currency"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <ul class="payment-list">
            @for (payment of payments(); track payment.id) {
              <li>
                <a
                  class="payment-row"
                  [routerLink]="['/payments', payment.referenceCode]"
                >
                  <span class="payment-row__icon" aria-hidden="true">{{
                    channelIcon(payment)
                  }}</span>
                  <span class="payment-row__main">
                    <span class="payment-row__top">
                      <span class="payment-row__ref">{{
                        payment.referenceCode
                      }}</span>
                      <es-status-badge
                        [label]="payment.status"
                        [tone]="tone(payment.status)"
                      />
                    </span>
                    <span class="payment-row__meta">
                      {{ payment.createdAt | date: 'MMM d, y · h:mm a' }}
                      @if (payment.description) {
                        · {{ payment.description }}
                      }
                    </span>
                  </span>
                  <span class="payment-row__amount">
                    <es-money-amount
                      [amount]="major(payment.amount.amount)"
                      [currency]="payment.amount.currency"
                    />
                  </span>
                  <span class="payment-row__chevron" aria-hidden="true">›</span>
                </a>
              </li>
            }
          </ul>

          <nav class="pagination" aria-label="Payment history pages">
            <es-button
              variant="secondary"
              [disabled]="page() === 0"
              (click)="prevPage()"
              >Previous</es-button
            >
            <span>{{ pageLabel() }}</span>
            <es-button
              variant="secondary"
              [disabled]="!hasNext()"
              (click)="nextPage()"
              >Next</es-button
            >
          </nav>
        }
      </es-card>
    }
  `,
  styles: [
    `
      @use 'responsive' as *;

      .summary-grid {
        @include fluid-grid(9.5rem, 0.75rem);
        margin-bottom: 1rem;
      }

      .filters {
        @include fluid-grid(11rem, 1rem);
        align-items: end;
        background: var(--es-color-neutral-100);
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-md);
        margin-bottom: 1.25rem;
        padding: 1rem;
      }

      .filters label {
        color: var(--es-color-neutral-700);
        display: grid;
        font-weight: 650;
        gap: 0.375rem;
      }

      .filters__hint {
        color: var(--es-color-neutral-600);
        font-size: 0.75rem;
        font-weight: 500;
      }

      .filters select,
      .filters input {
        background: white;
        border: 1px solid var(--es-color-border);
        border-radius: var(--es-radius-sm);
        min-height: 2.75rem;
        padding: 0 0.75rem;
        width: 100%;
      }

      .filters-actions {
        display: flex;
        gap: 0.5rem;
      }

      .error {
        background: #fde8e8;
        border-radius: var(--es-radius-sm);
        color: #9b1c1c;
        margin: 0 0 1rem;
        padding: 0.875rem 1rem;
      }

      /* Desktop: real table, default visible */
      .table-wrap {
        display: block;
        overflow-x: auto;
      }

      table {
        border-collapse: collapse;
        min-width: 42rem;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid var(--es-color-border);
        padding: 0.875rem 0.75rem;
        text-align: left;
      }

      th {
        color: var(--es-color-neutral-600);
        font-size: 0.75rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .payment-table-row {
        cursor: pointer;
        transition: background-color 120ms ease;
      }

      .payment-table-row:hover,
      .payment-table-row:focus-visible {
        background: rgba(0, 168, 121, 0.045);
        outline: none;
      }

      .payment-table-row:focus-visible {
        box-shadow: inset 0 0 0 2px var(--es-color-accent);
      }

      .ref-cell {
        align-items: center;
        color: var(--es-color-neutral-900);
        display: inline-flex;
        font-weight: 700;
        gap: 0.5rem;
      }

      .ref-cell__icon {
        font-size: 1rem;
      }

      .description-col {
        color: var(--es-color-neutral-600);
        max-width: 16rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .amount-col {
        font-weight: 800;
        text-align: right;
        white-space: nowrap;
      }

      .pagination {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        margin-top: 1.25rem;
      }

      .pagination span {
        color: var(--es-color-neutral-600);
        font-size: 0.875rem;
      }

      /* Mobile: card list, hidden by default */
      .payment-list {
        display: none;
      }

      @include mobile {
        .filters {
          grid-template-columns: 1fr;
        }

        .filters-actions {
          flex-direction: column;
        }

        .filters-actions es-button {
          width: 100%;
        }

        .table-wrap {
          display: none;
        }

        .payment-list {
          display: grid;
          gap: 0.625rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .payment-row {
          align-items: center;
          background: white;
          border: 1px solid var(--es-color-border);
          border-radius: var(--es-radius-md);
          color: inherit;
          display: grid;
          gap: 0.75rem;
          grid-template-columns: 2.5rem minmax(0, 1fr);
          grid-template-rows: auto auto;
          padding: 0.875rem 1rem;
          text-decoration: none;
        }

        .payment-row__icon {
          align-items: center;
          background: var(--es-color-neutral-100);
          border-radius: var(--es-radius-sm);
          display: inline-flex;
          font-size: 1.125rem;
          grid-row: 1 / 3;
          height: 2.5rem;
          justify-content: center;
          width: 2.5rem;
        }

        .payment-row__main {
          display: grid;
          gap: 0.25rem;
          min-width: 0;
        }

        .payment-row__top {
          align-items: center;
          display: flex;
          gap: 0.625rem;
        }

        .payment-row__ref {
          color: var(--es-color-neutral-900);
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .payment-row__meta {
          color: var(--es-color-neutral-600);
          font-size: 0.8125rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .payment-row__amount {
          font-weight: 800;
          grid-column: 2;
        }

        .payment-row__chevron {
          display: none;
        }

        .pagination {
          justify-content: space-between;
        }
      }
      // @use 'responsive' as *;

      // .summary-grid {
      //   @include fluid-grid(11rem, 1rem);
      //   margin-bottom: 1rem;
      // }
      // .summary-grid {
      //   @include fluid-grid(9.5rem, 0.75rem);
      //   margin-bottom: 1rem;
      // }

      // .history-toolbar {
      //   align-items: center;
      //   display: flex;
      //   gap: 0.75rem;
      //   margin-bottom: 1rem;
      // }

      // .active-filters-note {
      //   color: var(--es-color-accent-dark);
      //   font-size: 0.8125rem;
      //   font-weight: 700;
      // }

      // .filters {
      //   @include fluid-grid(11rem, 1rem);
      //   align-items: end;
      //   background: var(--es-color-neutral-100);
      //   border: 1px solid var(--es-color-border);
      //   border-radius: var(--es-radius-md);
      //   margin-bottom: 1.25rem;
      //   padding: 1rem;
      // }

      // .filters label {
      //   color: var(--es-color-neutral-700);
      //   display: grid;
      //   font-weight: 650;
      //   gap: 0.375rem;
      // }

      // .filters select,
      // .filters input {
      //   background: white;
      //   border: 1px solid var(--es-color-border);
      //   border-radius: var(--es-radius-sm);
      //   min-height: 2.75rem;
      //   padding: 0 0.75rem;
      //   width: 100%;
      // }

      // .filters-actions {
      //   display: flex;
      //   gap: 0.5rem;
      // }

      // @include mobile {
      //   .filters-actions {
      //     flex-direction: column;
      //   }

      //   .filters-actions es-button {
      //     width: 100%;
      //   }
      // }

      // .error {
      //   background: #fde8e8;
      //   border-radius: var(--es-radius-sm);
      //   color: #9b1c1c;
      //   margin: 0 0 1rem;
      //   padding: 0.875rem 1rem;
      // }

      // // .payment-list {
      // //   display: grid;
      // //   gap: 0.625rem;
      // //   list-style: none;
      // //   margin: 0;
      // //   padding: 0;
      // // }

      // // .payment-row {
      // //   align-items: center;
      // //   background: white;
      // //   border: 1px solid var(--es-color-border);
      // //   border-radius: var(--es-radius-md);
      // //   color: inherit;
      // //   display: grid;
      // //   gap: 0.875rem;
      // //   grid-template-columns: 2.75rem minmax(0, 1fr) auto auto;
      // //   padding: 0.875rem 1rem;
      // //   text-decoration: none;
      // //   transition:
      // //     border-color 120ms ease,
      // //     box-shadow 120ms ease,
      // //     transform 120ms ease;
      // // }

      // // .payment-row:hover,
      // // .payment-row:focus-visible {
      // //   border-color: var(--es-color-accent);
      // //   box-shadow: 0 10px 28px rgba(6, 26, 64, 0.08);
      // //   transform: translateY(-1px);
      // // }

      // // .payment-row__icon {
      // //   align-items: center;
      // //   background: var(--es-color-neutral-100);
      // //   border-radius: var(--es-radius-sm);
      // //   display: inline-flex;
      // //   font-size: 1.25rem;
      // //   height: 2.75rem;
      // //   justify-content: center;
      // //   width: 2.75rem;
      // // }

      // // .payment-row__main {
      // //   display: grid;
      // //   gap: 0.25rem;
      // //   min-width: 0;
      // // }

      // // .payment-row__top {
      // //   align-items: center;
      // //   display: flex;
      // //   gap: 0.625rem;
      // // }

      // // .payment-row__ref {
      // //   color: var(--es-color-neutral-900);
      // //   font-weight: 750;
      // //   overflow: hidden;
      // //   text-overflow: ellipsis;
      // //   white-space: nowrap;
      // // }

      // // .payment-row__meta {
      // //   color: var(--es-color-neutral-600);
      // //   font-size: 0.8125rem;
      // //   overflow: hidden;
      // //   text-overflow: ellipsis;
      // //   white-space: nowrap;
      // // }

      // // .payment-row__amount {
      // //   font-weight: 800;
      // //   white-space: nowrap;
      // // }

      // // .payment-row__chevron {
      // //   color: var(--es-color-neutral-500, var(--es-color-neutral-600));
      // //   font-size: 1.5rem;
      // // }

      // .pagination {
      //   align-items: center;
      //   display: flex;
      //   flex-wrap: wrap;
      //   gap: 1rem;
      //   justify-content: center;
      //   margin-top: 1.25rem;
      // }

      // .pagination span {
      //   color: var(--es-color-neutral-600);
      //   font-size: 0.875rem;
      // }

      // @include mobile {
      //   .payment-row {
      //     grid-template-columns: 2.5rem minmax(0, 1fr);
      //     grid-template-rows: auto auto;
      //   }

      //   .payment-row__amount {
      //     grid-column: 2;
      //     justify-self: start;
      //   }

      //   .payment-row__chevron {
      //     display: none;
      //   }
      // }
    `,
  ],
})
export class PaymentsComponent {
  private readonly api = inject(PaymentApiService);
  private readonly pageSize = 20;

  readonly statusOptions: PaymentStatus[] = [
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED',
  ];
  readonly channelOptions: PaymentChannelCode[] = [
    'CBE_BIRR',
    'TELEBIRR',
    'AWASH_BANK',
    'DASHEN_BANK',
    'ABYSSINIA_BANK',
    'NIB_BANK',
    'COOPERATIVE_BANK',
    'WEGAGEN_BANK',
    'BUNNA_BANK',
    'USSD',
    'OTHER',
  ];

  readonly historyRequested = signal(false);
  readonly payments = signal<Payment[]>([]);
  readonly summary = signal<PaymentListSummary | null>(null);
  readonly loading = signal(false);
  readonly listError = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly hasNext = signal(false);
  readonly filtersOpen = signal(false);

  statusFilter: PaymentStatus | '' = '';
  channelFilter: PaymentChannelCode | '' = '';
  fromDate = '';
  toDate = '';

  readonly String = String;

  pageLabel(): string {
    return `Page ${this.page() + 1} of ${Math.max(this.totalPages(), 1)}`;
  }

  showHistory(): void {
    this.historyRequested.set(true);
    this.fetchPayments();
  }
  applyFilters(): void {
    this.page.set(0);
    this.filtersOpen.set(false);
    this.fetchPayments();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.channelFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.page.set(0);
    this.filtersOpen.set(false);
    this.fetchPayments();
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update((v) => v - 1);
      this.fetchPayments();
    }
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.page.update((v) => v + 1);
      this.fetchPayments();
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update((value) => !value);
  }

  hasActiveFilters(): boolean {
    return Boolean(
      this.statusFilter || this.channelFilter || this.fromDate || this.toDate,
    );
  }

  tone(status: PaymentStatus): 'success' | 'warning' | 'danger' | 'neutral' {
    if (status === 'COMPLETED') return 'success';
    if (status === 'PENDING' || status === 'PROCESSING') return 'warning';
    if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED')
      return 'danger';
    return 'neutral';
  }

  channelIcon(payment: Payment): string {
    return CHANNEL_TYPE_ICON[payment.channelType ?? ''] ?? '💳';
  }

  major(amountCents: number): number {
    return amountCents / 100;
  }

  private fetchPayments(): void {
    this.loading.set(true);
    this.listError.set('');

    this.api
      .listPayments({
        page: this.page(),
        size: this.pageSize,
        status: this.statusFilter || undefined,
        channel: this.channelFilter || undefined,
        from: this.fromDate || undefined,
        to: this.toDate || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.payments.set(response.data);
          this.summary.set(response.summary ?? null);
          this.totalPages.set(response.meta.totalPages);
          this.hasNext.set(response.meta.hasNext);
        },
        error: (error) => {
          const maybeHttpError = error as {
            error?: { message?: string };
            message?: string;
          };
          this.listError.set(
            maybeHttpError.error?.message ??
              maybeHttpError.message ??
              'Payments could not be loaded.',
          );
        },
      });
  }
}
