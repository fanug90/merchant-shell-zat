import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'es-money-amount',
  standalone: true,
  imports: [DecimalPipe],
  template: `<span>{{ amount() | number: '1.2-2' }} {{ currency() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EsMoneyAmountComponent {
  readonly amount = input.required<number>();
  readonly currency = input<'ETB'>('ETB');
}
