import { Routes } from '@angular/router';
import { LoginPageComponent } from './features/auth/login.page';
import { ChangePasswordPageComponent } from './features/account/change-password.page';
import { AuditLogPageComponent } from './features/audit/audit-log.page';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { InspectionListPageComponent } from './features/inspections/inspection-list.page';
import { InspectionMaintainPageComponent } from './features/inspections/inspection-maintain.page';
import { OrganizationHubPageComponent } from './features/organization/organization-hub.page';
import { MastersHubPageComponent } from './features/masters/masters-hub.page';
import { ReportsPageComponent } from './features/reports/reports.page';
import { authRequiredGuard, guestOnlyGuard, roleScopeGuard } from './core/guards/auth.guards';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent, canActivate: [guestOnlyGuard] },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authRequiredGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'account/password', component: ChangePasswordPageComponent, canActivate: [roleScopeGuard] },
      { path: 'dashboard', component: DashboardPageComponent, canActivate: [roleScopeGuard] },
      { path: 'inspections', component: InspectionListPageComponent, canActivate: [roleScopeGuard] },
      { path: 'inspections/:inspectionCode', component: InspectionMaintainPageComponent, canActivate: [roleScopeGuard] },
      // Redirecciones de compatibilidad para URLs antiguas
      { path: 'incidents', redirectTo: 'inspections', pathMatch: 'full' },
      { path: 'incidents/:inspectionCode', redirectTo: 'inspections/:inspectionCode', pathMatch: 'full' },
      { path: 'users', redirectTo: '/organizacion', pathMatch: 'full' },
      { path: 'organizacion', component: OrganizationHubPageComponent, canActivate: [roleScopeGuard] },
      { path: 'maestros', component: MastersHubPageComponent, canActivate: [roleScopeGuard] },
      { path: 'security/roles', redirectTo: '/organizacion', pathMatch: 'full' },
      { path: 'organization/areas', redirectTo: '/organizacion', pathMatch: 'full' },
      { path: 'organization/leaders', redirectTo: '/organizacion', pathMatch: 'full' },
      { path: 'catalogs/items', redirectTo: '/organizacion', pathMatch: 'full' },
      { path: 'catalogos', redirectTo: '/organizacion', pathMatch: 'full' },
      { path: 'reports', component: ReportsPageComponent, canActivate: [roleScopeGuard] },
      { path: 'auditoria', component: AuditLogPageComponent, canActivate: [roleScopeGuard] },
      { path: 'control-panel', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
