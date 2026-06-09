import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EsEmptyStateComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-maintenance',
  standalone: true,
  imports: [EsEmptyStateComponent],
  template: `<es-empty-state icon="construction" title="Service maintenance" description="The BFF is temporarily unavailable. Please try again shortly." />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceComponent {}
