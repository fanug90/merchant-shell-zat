import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EsProgressStepsComponent } from './es-progress-steps.component';

describe('EsProgressStepsComponent', () => {
  let component: EsProgressStepsComponent;
  let fixture: ComponentFixture<EsProgressStepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EsProgressStepsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EsProgressStepsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
