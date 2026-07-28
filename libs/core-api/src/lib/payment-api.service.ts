import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CORE_API_CONFIG, DEFAULT_CORE_API_CONFIG } from './core-api.config';
import {
  Payment,
  PaymentCreateRequest,
  PaymentListResponse,
  PaymentQueryParams,
} from './payment.types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly config =
    inject(CORE_API_CONFIG, { optional: true }) ?? DEFAULT_CORE_API_CONFIG;

  listPayments(
    params: PaymentQueryParams = {},
  ): Observable<PaymentListResponse> {
    return this.http.get<PaymentListResponse>(this.url('/v1/payments'), {
      params: toHttpParams(params),
    });
  }

  createPayment(request: PaymentCreateRequest): Observable<Payment> {
    return this.http.post<Payment>(this.url('/v1/payments'), request, {
      headers: new HttpHeaders().set('Idempotency-Key', crypto.randomUUID()),
    });
  }

  private url(path: string): string {
    return `${this.config.paymentServiceBaseUrl.replace(/\/$/, '')}${path}`;
  }
}

function toHttpParams(params: PaymentQueryParams): HttpParams {
  let httpParams = new HttpParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }

  return httpParams;
}
