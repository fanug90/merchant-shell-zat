import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EsEmptyStateComponent, EsPageHeaderComponent } from '@zat-main-web/shared-ui';

@Component({
  selector: 'es-reports',
  standalone: true,
  imports: [EsEmptyStateComponent, EsPageHeaderComponent],
  template: `
    <es-page-header title="Reports" subtitle="Phase 2 reporting surface." />
    <es-empty-state icon="bar_chart" title="Reports are planned for Phase 2" description="The route and admin guard are present for MVP compatibility." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {}
