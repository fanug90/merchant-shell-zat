import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CoreApiService, TransactionSummary } from '@zat-main-web/core-api';
import {
  EsCardComponent,
  EsMoneyAmountComponent,
  EsPageHeaderComponent,
  EsStatusBadgeComponent,
} from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-transactions',
  standalone: true,
  imports: [DatePipe, EsCardComponent, EsMoneyAmountComponent, EsPageHeaderComponent, EsStatusBadgeComponent],
  template: `
    <es-page-header title="Transactions" subtitle="Core payment activity from the BFF." />

    <es-card>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Status</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            @for (transaction of transactions(); track transaction.id) {
              <tr>
                <td>{{ transaction.createdAt | date: 'medium' }}</td>
                <td>{{ transaction.customerName }}</td>
                <td>{{ transaction.channel }}</td>
                <td><es-status-badge [label]="transaction.status" [tone]="tone(transaction.status)" /></td>
                <td class="amount"><es-money-amount [amount]="transaction.amount" [currency]="transaction.currency" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </es-card>
  `,
  styles: [
    `
      .table-wrap {
        overflow-x: auto;
      }

      table {
        border-collapse: collapse;
        min-width: 44rem;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid var(--es-color-border);
        padding: 0.875rem 0.5rem;
        text-align: left;
      }

      th {
        color: var(--es-color-neutral-600);
        font-size: 0.75rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      tbody tr:hover {
        background: rgba(0, 168, 121, 0.045);
      }

      .amount {
        text-align: right;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsComponent {
  private readonly api = inject(CoreApiService);
  readonly transactions = signal<TransactionSummary[]>([]);

  constructor() {
    this.api.getTransactions().subscribe((page) => this.transactions.set(page.content));
  }

  tone(status: TransactionSummary['status']): 'success' | 'warning' | 'danger' {
    if (status === 'SUCCESS') {
      return 'success';
    }

    return status === 'PENDING' ? 'warning' : 'danger';
  }
}
