import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentApiService, Payment } from '@zat-main-web/core-api';
import {
  EsButtonComponent,
  EsCardComponent,
  EsEmptyStateComponent,
  EsPageHeaderComponent,
  EsSpinnerComponent,
} from '@zat-main-web/shared-ui';
import { PaymentResultComponent } from './payment-result.component';

@Component({
  selector: 'es-payment-detail',
  imports: [
    RouterLink,
    EsButtonComponent,
    EsCardComponent,
    EsEmptyStateComponent,
    EsPageHeaderComponent,
    EsSpinnerComponent,
    PaymentResultComponent,
  ],
  template: `
    <es-page-header
      title="Payment request"
      subtitle="Reference {{ referenceCode }}"
    >
      <es-button variant="ghost" routerLink="/payments"
        >Back to payments</es-button
      >
    </es-page-header>

    @if (loading()) {
      <es-card><es-spinner label="Loading payment..." /></es-card>
    } @else if (error()) {
      <es-card>
        <es-empty-state
          icon="error"
          title="Payment not found"
          [description]="error()!"
          actionLabel="Retry"
          (action)="load()"
        />
      </es-card>
    } @else if (payment(); as current) {
      <es-card title="Status" [subtitle]="'Created ' + createdAtLabel()">
        <es-payment-result [payment]="current" />
        <es-button
          class="refresh-btn"
          variant="secondary"
          [disabled]="refreshing()"
          (click)="load()"
        >
          {{ refreshing() ? 'Refreshing...' : 'Refresh status' }}
        </es-button>
      </es-card>
    }
  `,
  styles: [
    `
      .refresh-btn {
        display: block;
        margin-top: 1.25rem;
      }
    `,
  ],
})
export class PaymentDetailComponent {
  private readonly api = inject(PaymentApiService);
  private readonly route = inject(ActivatedRoute);

  readonly referenceCode =
    this.route.snapshot.paramMap.get('referenceCode') ?? '';
  readonly payment = signal<Payment | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  createdAtLabel(): string {
    const createdAt = this.payment()?.createdAt;
    return createdAt ? new Date(createdAt).toLocaleString() : '—';
  }

  load(): void {
    const wasLoaded = Boolean(this.payment());
    this.loading.set(!wasLoaded);
    this.refreshing.set(wasLoaded);
    this.error.set(null);

    this.api.listPayments({ referenceCode: this.referenceCode }).subscribe({
      next: (response) => {
        const found = response.data[0];
        if (found) {
          this.payment.set(found);
        } else {
          this.error.set(
            `No payment found for reference ${this.referenceCode}.`,
          );
        }
      },
      error: () =>
        this.error.set('The payment could not be loaded. Try again.'),
      complete: () => {
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }
}
