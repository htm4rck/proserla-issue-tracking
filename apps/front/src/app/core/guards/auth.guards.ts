import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const authRequiredGuard: CanActivateFn = (route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  if (!session.isAuthenticated) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};

export const guestOnlyGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  if (session.isAuthenticated) {
    return router.createUrlTree([session.defaultRouteByRole()]);
  }
  return true;
};

export const roleScopeGuard: CanActivateFn = (route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  if (!session.isAuthenticated) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!session.canAccessRoute(state.url)) {
    return router.createUrlTree([session.defaultRouteByRole()]);
  }
  return true;
};
