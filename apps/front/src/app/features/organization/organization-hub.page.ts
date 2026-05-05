import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { SeedRunPayload } from '../../core/models/seed.models';

type OrgTab = 'roles' | 'areas' | 'leaders' | 'users';

@Component({
  selector: 'app-organization-hub-page',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './organization-hub.page.html',
  styleUrl: './organization-hub.page.scss',
})
export class OrganizationHubPageComponent implements OnInit {
  readonly conceptBlocks = [
    {
      titulo: 'Rol',
      desc: 'Permisos en la aplicación: administrador, líder de área u operador.',
    },
    {
      titulo: 'Área',
      desc: 'Unidad física u organizativa (empaque, planta, campo). Las incidencias se etiquetan con un código de área.',
    },
    {
      titulo: 'Líder',
      desc: 'Responsable de una o varias áreas. Puede cubrir múltiples áreas simultáneamente.',
    },
    {
      titulo: 'Usuarios',
      desc: 'Pueden pertenecer a múltiples áreas, cada una con su propio líder. El área primaria (★) se usa en filtros y dashboards.',
    },
  ];

  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  activeTab: OrgTab = 'roles';

  get isAdmin(): boolean {
    return this.session.user?.roleCode === 'admin';
  }

  // ── Labels ──────────────────────────────────────────────────────────────────

  areaLabel(areaCode: string): string {
    const code = (areaCode ?? '').trim().toUpperCase();
    return this.areasRows.find((a) => String(a.code).trim().toUpperCase() === code)?.name ?? areaCode;
  }

  roleLabel(roleCode?: string): string {
    const code = (roleCode ?? '').trim().toLowerCase();
    return this.rolesRows.find((r) => String(r.code).trim().toLowerCase() === code)?.name ?? roleCode ?? '—';
  }

  leaderLabel(leaderCode?: string): string {
    if (!leaderCode) return '—';
    const code = leaderCode.trim().toUpperCase();
    return this.leadersRows.find((l) => String(l.code).trim().toUpperCase() === code)?.fullName ?? leaderCode;
  }

  // ── Formularios ─────────────────────────────────────────────────────────────

  roleForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    isActive: [true],
  });

  areaForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    isActive: [true],
  });

  leaderForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    fullName: ['', Validators.required],
    email: [''],
    areaCode: ['', Validators.required],
    isActive: [true],
  });

  userForm = this.fb.nonNullable.group({
    email: ['', Validators.required],
    fullName: ['', Validators.required],
    roleCode: ['operator', Validators.required],
    areaCode: ['', Validators.required],
    leaderCode: [''],
    isActive: [true],
  });

  // ── Datos ────────────────────────────────────────────────────────────────────

  rolesRows: any[] = [];
  areasRows: any[] = [];
  leadersRows: any[] = [];
  usersRows: any[] = [];
  resetPasswordDraftByUserId: Record<string, string> = {};
  resetPasswordMsgByUserId: Record<string, string> = {};

  // ── Estado de paneles expandibles ────────────────────────────────────────
  expandedLeader: string | null = null;
  expandedUser: string | null = null;
  /** Draft de área seleccionada para agregar a un líder: leaderCode → areaCode */
  leaderAreaDraft: Record<string, string> = {};
  /** Mensajes de resultado por líder */
  leaderAreaMsg: Record<string, string> = {};
  /** Draft para usuario: userId_area / userId_leader */
  userAreaDraft: Record<string, string> = {};
  /** Mensajes de resultado por usuario */
  userAreaMsg: Record<string, string> = {};

  seedLoading = false;
  seedMessage = '';
  seedError = '';
  seedPayload: SeedRunPayload | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((pm) => {
      const t = pm.get('tab') as OrgTab | null;
      if (t === 'areas' || t === 'leaders' || t === 'roles' || t === 'users') {
        this.activeTab = t;
      } else {
        this.activeTab = 'roles';
      }
    });
    this.reloadAll();
  }

  setTab(tab: OrgTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  reloadAll(): void {
    this.api.listSimple('roles').subscribe(({ data }) => (this.rolesRows = data ?? []));
    this.api.listSimple('areas').subscribe(({ data }) => (this.areasRows = data ?? []));
    this.api.listSimple('leaders').subscribe(({ data }) => (this.leadersRows = data ?? []));
    this.api.listUsers().subscribe(({ data }) => (this.usersRows = data ?? []));
  }

  // ── CRUD básico ──────────────────────────────────────────────────────────────

  saveRole(): void {
    if (this.roleForm.invalid) return;
    this.api.createSimple('roles', this.roleForm.getRawValue()).subscribe(() => {
      this.roleForm.reset({ code: '', name: '', isActive: true });
      this.api.listSimple('roles').subscribe(({ data }) => (this.rolesRows = data ?? []));
    });
  }

  saveArea(): void {
    if (this.areaForm.invalid) return;
    this.api.createSimple('areas', this.areaForm.getRawValue()).subscribe(() => {
      this.areaForm.reset({ code: '', name: '', isActive: true });
      this.api.listSimple('areas').subscribe(({ data }) => (this.areasRows = data ?? []));
    });
  }

  saveLeader(): void {
    if (this.leaderForm.invalid) return;
    this.api.createSimple('leaders', this.leaderForm.getRawValue()).subscribe(() => {
      this.leaderForm.reset({ code: '', fullName: '', email: '', areaCode: '', isActive: true });
      this.api.listSimple('leaders').subscribe(({ data }) => (this.leadersRows = data ?? []));
    });
  }

  saveUser(): void {
    if (!this.isAdmin || this.userForm.invalid) return;
    const raw = this.userForm.getRawValue();
    const payload = {
      ...raw,
      areaCode: raw.areaCode.trim().toUpperCase(),
      roleCode: raw.roleCode.trim().toLowerCase(),
      leaderCode: raw.leaderCode.trim().toUpperCase() || undefined,
    };
    this.api.createUser(payload).subscribe(() => {
      this.userForm.reset({ email: '', fullName: '', roleCode: 'operator', areaCode: '', leaderCode: '', isActive: true });
      this.api.listUsers().subscribe(({ data }) => (this.usersRows = data ?? []));
    });
  }

  // ── Gestión multi-área: usuarios ─────────────────────────────────────────────

  addUserArea(user: any, areaCode: string, leaderCode: string): void {
    if (!areaCode || !this.isAdmin) return;
    this.api.addUserArea(user.id, { areaCode: areaCode.trim().toUpperCase(), leaderCode: leaderCode || undefined }).subscribe({
      next: () => this.api.listUsers().subscribe(({ data }) => (this.usersRows = data ?? [])),
      error: (err) => alert(err?.error?.message ?? 'No se pudo agregar el área'),
    });
  }

  removeUserArea(user: any, areaCode: string): void {
    if (!areaCode || !this.isAdmin) return;
    this.api.removeUserArea(user.id, { areaCode: areaCode.trim().toUpperCase() }).subscribe({
      next: () => this.api.listUsers().subscribe(({ data }) => (this.usersRows = data ?? [])),
      error: (err) => alert(err?.error?.message ?? 'No se pudo quitar el área'),
    });
  }

  /** Áreas que el usuario aún NO tiene asignadas */
  areasNotInUser(user: any): any[] {
    const assigned = new Set<string>((user.areas ?? []).map((ua: any) => ua.areaCode));
    return this.areasRows.filter((a) => !assigned.has(a.code));
  }

  /** Áreas no primarias del usuario (se pueden quitar) */
  nonPrimaryUserAreas(user: any): any[] {
    return (user.areas ?? []).filter((ua: any) => !ua.isPrimary);
  }

  // ── Toggle paneles expandibles ───────────────────────────────────────────

  toggleLeaderExpand(leaderCode: string): void {
    this.expandedLeader = this.expandedLeader === leaderCode ? null : leaderCode;
    if (this.expandedLeader) {
      this.leaderAreaDraft[leaderCode] = '';
      this.leaderAreaMsg[leaderCode] = '';
    }
  }

  toggleUserExpand(userId: string): void {
    this.expandedUser = this.expandedUser === userId ? null : userId;
    if (this.expandedUser) {
      this.userAreaDraft[userId + '_area'] = '';
      this.userAreaDraft[userId + '_leader'] = '';
      this.userAreaMsg[userId] = '';
    }
  }

  // ── Gestión multi-área: líderes (con draft) ──────────────────────────────

  addLeaderAreaFromDraft(leader: any): void {
    const areaCode = (this.leaderAreaDraft[leader.code] ?? '').trim();
    if (!areaCode) return;
    this.leaderAreaMsg[leader.code] = '';
    this.api.addLeaderArea(leader.code, { areaCode }).subscribe({
      next: () => {
        this.leaderAreaMsg[leader.code] = `✓ Área ${this.areaLabel(areaCode)} agregada correctamente.`;
        this.leaderAreaDraft[leader.code] = '';
        this.api.listSimple('leaders').subscribe(({ data }) => (this.leadersRows = data ?? []));
      },
      error: (err) => {
        this.leaderAreaMsg[leader.code] = `Error: ${err?.error?.message ?? 'No se pudo agregar el área'}`;
      },
    });
  }

  // ── Gestión multi-área: usuarios (con draft) ─────────────────────────────

  addUserAreaFromDraft(user: any): void {
    const areaCode = (this.userAreaDraft[user.id + '_area'] ?? '').trim();
    const leaderCode = (this.userAreaDraft[user.id + '_leader'] ?? '').trim() || undefined;
    if (!areaCode) return;
    this.userAreaMsg[user.id] = '';
    this.api.addUserArea(user.id, { areaCode, leaderCode }).subscribe({
      next: () => {
        this.userAreaMsg[user.id] = `✓ Área ${this.areaLabel(areaCode)} agregada correctamente.`;
        this.userAreaDraft[user.id + '_area'] = '';
        this.userAreaDraft[user.id + '_leader'] = '';
        this.api.listUsers().subscribe(({ data }) => (this.usersRows = data ?? []));
      },
      error: (err) => {
        this.userAreaMsg[user.id] = `Error: ${err?.error?.message ?? 'No se pudo agregar el área'}`;
      },
    });
  }

  // ── Gestión multi-área: líderes ──────────────────────────────────────────────

  addLeaderArea(leader: any, areaCode: string): void {
    if (!areaCode || !this.isAdmin) return;
    this.api.addLeaderArea(leader.code, { areaCode: areaCode.trim().toUpperCase() }).subscribe({
      next: () => this.api.listSimple('leaders').subscribe(({ data }) => (this.leadersRows = data ?? [])),
      error: (err) => alert(err?.error?.message ?? 'No se pudo agregar el área'),
    });
  }

  removeLeaderArea(leader: any, areaCode: string): void {
    if (!areaCode || !this.isAdmin) return;
    this.api.removeLeaderArea(leader.code, { areaCode: areaCode.trim().toUpperCase() }).subscribe({
      next: () => this.api.listSimple('leaders').subscribe(({ data }) => (this.leadersRows = data ?? [])),
      error: (err) => alert(err?.error?.message ?? 'No se pudo quitar el área'),
    });
  }

  /** Áreas que el líder aún NO tiene asignadas */
  areasNotInLeader(leader: any): any[] {
    const assigned = new Set<string>((leader.areas ?? []).map((la: any) => la.areaCode));
    return this.areasRows.filter((a) => !assigned.has(a.code));
  }

  /** Áreas no primarias del líder (se pueden quitar) */
  nonPrimaryLeaderAreas(leader: any): any[] {
    return (leader.areas ?? []).filter((la: any) => !la.isPrimary);
  }

  // ── Helpers de formulario ────────────────────────────────────────────────────

  get leadersBySelectedArea(): any[] {
    const areaCode = (this.userForm.getRawValue().areaCode ?? '').trim().toUpperCase();
    return (this.leadersRows ?? []).filter((l) => {
      if (!areaCode) return true;
      // Buscar en todas las áreas del líder
      const leaderAreas: string[] = (l.areas ?? []).map((la: any) => String(la.areaCode).trim().toUpperCase());
      if (leaderAreas.length > 0) return leaderAreas.includes(areaCode);
      return String(l.areaCode ?? '').trim().toUpperCase() === areaCode;
    });
  }

  leadersForArea(areaCode: string): any[] {
    if (!areaCode) return [];
    const code = areaCode.trim().toUpperCase();
    return (this.leadersRows ?? []).filter((l) => {
      const leaderAreas: string[] = (l.areas ?? []).map((la: any) => String(la.areaCode).trim().toUpperCase());
      if (leaderAreas.length > 0) return leaderAreas.includes(code);
      return String(l.areaCode ?? '').trim().toUpperCase() === code;
    });
  }

  onUserAreaChange(): void {
    const currentLeader = this.userForm.getRawValue().leaderCode;
    const valid = this.leadersBySelectedArea.some((l) => l.code === currentLeader);
    if (!valid) this.userForm.patchValue({ leaderCode: '' });
  }

  // ── Contraseña ───────────────────────────────────────────────────────────────

  setResetPasswordDraft(userId: string, value: string): void {
    this.resetPasswordDraftByUserId[userId] = value;
  }

  resetUserPassword(user: { id: string; email: string }): void {
    if (!this.isAdmin) return;
    const draft = (this.resetPasswordDraftByUserId[user.id] ?? '').trim();
    if (draft.length < 8) {
      this.resetPasswordMsgByUserId[user.id] = 'Mínimo 8 caracteres.';
      return;
    }
    this.api.resetUserPassword(user.id, draft).subscribe({
      next: () => {
        this.resetPasswordMsgByUserId[user.id] = 'Contraseña actualizada.';
        this.resetPasswordDraftByUserId[user.id] = '';
      },
      error: () => {
        this.resetPasswordMsgByUserId[user.id] = 'No se pudo resetear.';
      },
    });
  }
}
