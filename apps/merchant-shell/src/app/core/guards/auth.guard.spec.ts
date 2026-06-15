import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, authGuard } from '@zat-main-web/auth';

describe('authGuard', () => {
  const router = {
    createUrlTree: vi.fn((commands: string[]) => ({ commands })),
  };
  const auth = {
    isAuthenticated: vi.fn(),
  };

  beforeEach(() => {
    router.createUrlTree.mockClear();
    auth.isAuthenticated.mockReset();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('allows authenticated users into the dashboard shell', () => {
    auth.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects unauthenticated users to the public entry page', () => {
    auth.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toEqual({ commands: ['/login'] });
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
