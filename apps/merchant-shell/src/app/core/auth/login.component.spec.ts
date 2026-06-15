import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthService } from '@zat-main-web/auth';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const auth = {
    login: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    auth.login.mockClear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  it('renders the branded access choices', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    const createLink = fixture.debugElement.query(By.css('a.create-link'));

    expect(text).toContain('One login for every merchant payment flow.');
    expect(text).toContain('Sign in');
    expect(createLink.attributes['href']).toBe('/onboarding');
    expect(createLink.nativeElement.textContent).toContain('Create an account');
  });

  it('forces the Keycloak sign-in flow when Sign in is clicked', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(auth.login).toHaveBeenCalledWith(true);
  });
});
