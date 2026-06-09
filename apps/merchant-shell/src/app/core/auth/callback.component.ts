import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { EsSpinnerComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-callback',
  standalone: true,
  imports: [EsSpinnerComponent],
  template: `<main class="callback"><es-spinner label="Completing sign-in..." /></main>`,
  styles: [
    `
      .callback {
        display: grid;
        min-height: 100vh;
        place-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallbackComponent {
  constructor() {
    void inject(AuthService).login();
    void inject(Router).navigate(['/home']);
  }
}
