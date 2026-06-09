import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PluginRuntime } from './plugin-runtime';

describe('PluginRuntime', () => {
  let component: PluginRuntime;
  let fixture: ComponentFixture<PluginRuntime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PluginRuntime],
    }).compileComponents();

    fixture = TestBed.createComponent(PluginRuntime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
