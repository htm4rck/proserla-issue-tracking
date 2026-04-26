import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Sends lightweight role/scope headers so backend can enforce access scope.
 * This is not authentication; only an execution scope hint for this demo.
 */
export const sessionScopeInterceptor: HttpInterceptorFn = (req, next) => {
  const raw = localStorage.getItem('issue_tracking_session');
  if (!raw) return next(req);

  try {
    const user = JSON.parse(raw) as {
      email?: string;
      roleCode?: string;
      areaCode?: string;
      leaderCode?: string;
    };
    let headers = req.headers;
    if (user.email) headers = headers.set('x-user-email', user.email);
    if (user.roleCode) headers = headers.set('x-role-code', user.roleCode);
    if (user.areaCode) headers = headers.set('x-area-code', user.areaCode);
    if (user.leaderCode) headers = headers.set('x-leader-code', user.leaderCode);
    return next(req.clone({ headers }));
  } catch {
    return next(req);
  }
};
