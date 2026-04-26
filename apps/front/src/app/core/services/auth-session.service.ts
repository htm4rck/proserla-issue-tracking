import { Injectable } from '@angular/core';
import { SessionUser } from '../models/api.models';

const SESSION_KEY = 'issue_tracking_session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  get user(): SessionUser | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  get isLeader(): boolean {
    return this.normalizedRole === 'leader';
  }

  get isOperator(): boolean {
    return this.normalizedRole === 'aux_sst';
  }

  get isAuthenticated(): boolean {
    return !!this.user?.token;
  }

  get normalizedRole(): 'admin' | 'aux_sst' | 'leader' | '' {
    const raw = (this.user?.roleCode ?? '').trim().toLowerCase();
    if (raw === 'admin') return 'admin';
    if (raw === 'leader') return 'leader';
    if (raw === 'aux_sst' || raw === 'operator') return 'aux_sst';
    return '';
  }

  defaultRouteByRole(): string {
    const role = this.normalizedRole;
    if (role === 'admin' || role === 'aux_sst' || role === 'leader') {
      return '/dashboard';
    }
    return '/login';
  }

  canAccessRoute(path: string): boolean {
    if (!this.isAuthenticated) return false;
    const role = this.normalizedRole;
    if (path.startsWith('/organizacion')) return role === 'admin';
    if (path.startsWith('/maestros')) return role === 'admin';
    if (path.startsWith('/auditoria')) return role === 'admin';
    if (path.startsWith('/incidents')) return role === 'admin' || role === 'aux_sst';
    if (path.startsWith('/reports')) return role === 'admin' || role === 'aux_sst' || role === 'leader';
    if (path.startsWith('/dashboard')) return role === 'admin' || role === 'aux_sst' || role === 'leader';
    if (path.startsWith('/account/password')) return true;
    return role === 'admin';
  }

  setUser(user: SessionUser): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem('demo_token', user.token);
  }

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('demo_token');
  }

  scopedFilters(): { areaCode?: string; leaderCode?: string } {
    const user = this.user;
    if (!user || user.roleCode === 'admin') return {};

    if (user.roleCode === 'leader') {
      return {
        areaCode: user.areaCode || undefined,
        leaderCode: user.leaderCode || undefined,
      };
    }

    return {
      areaCode: user.areaCode || undefined,
      leaderCode: user.leaderCode || undefined,
    };
  }
}
