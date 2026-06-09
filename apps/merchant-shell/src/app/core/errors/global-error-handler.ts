import { ErrorHandler, Injectable } from '@angular/core';
import { PluginLoadError } from '@zat-main-web/plugin-runtime';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (error instanceof PluginLoadError) {
      console.warn('[Plugin Error]', error);
      return;
    }

    console.error('[Shell Error]', error);
  }
}
