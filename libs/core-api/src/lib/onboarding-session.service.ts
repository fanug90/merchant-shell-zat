import { Injectable, signal } from '@angular/core';
import { PhoneOtpVerificationResponse, normalizePhoneOtpVerificationResponse } from './onboarding.types';

@Injectable({ providedIn: 'root' })
export class OnboardingSessionService {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly phoneSignal = signal<string | null>(null);
  private readonly expiresAtSignal = signal<number | null>(null);

  readonly accessToken = this.tokenSignal.asReadonly();
  readonly phone = this.phoneSignal.asReadonly();
  readonly expiresAt = this.expiresAtSignal.asReadonly();

  setVerification(
    phone: string,
    response: PhoneOtpVerificationResponse | Record<string, unknown>
  ): void {
    const normalized = normalizePhoneOtpVerificationResponse(response);
    this.phoneSignal.set(phone);
    this.tokenSignal.set(normalized.accessToken);
    this.expiresAtSignal.set(Date.now() + normalized.expiresInSeconds * 1000);
  }

  clear(): void {
    this.tokenSignal.set(null);
    this.phoneSignal.set(null);
    this.expiresAtSignal.set(null);
  }

  authorizationHeader(): { Authorization: string } {
    const token = this.tokenSignal();

    if (!token) {
      throw new Error('Onboarding phone OTP must be verified before continuing.');
    }

    return { Authorization: `Bearer ${token}` };
  }
}
