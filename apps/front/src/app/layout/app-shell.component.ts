import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../core/services/auth-session.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  private readonly fullMenu = [
    { label: 'Tablero', route: '/dashboard', icon: 'TB' },
    { label: 'Incidencias', route: '/incidents', icon: 'IN' },
    { label: 'Organización y seguridad', route: '/organizacion', icon: 'SG' },
    { label: 'Maestros', route: '/maestros', icon: 'MS' },
    { label: 'Reportes', route: '/reports', icon: 'RP' },
    { label: 'Auditoría', route: '/auditoria', icon: 'AU' },
  ];

  get menu(): Array<{ label: string; route: string; icon: string }> {
    const role = this.session.normalizedRole;
    if (role === 'leader') {
      return this.fullMenu.filter((item) => item.route === '/dashboard' || item.route === '/reports');
    }
    if (role === 'aux_sst') {
      return this.fullMenu.filter(
        (item) => item.route !== '/organizacion' && item.route !== '/maestros' && item.route !== '/auditoria',
      );
    }
    return this.fullMenu;
  }

  logout(): void {
    this.session.clear();
    this.router.navigateByUrl('/login');
  }
}
