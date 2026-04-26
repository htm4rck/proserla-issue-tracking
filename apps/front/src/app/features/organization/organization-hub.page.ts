import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { SeedRunPayload } from '../../core/models/seed.models';

type OrgTab = 'roles' | 'areas' | 'leaders' | 'users';

@Component({
  selector: 'app-organization-hub-page',
  imports: [ReactiveFormsModule],
  templateUrl: './organization-hub.page.html',
  styleUrl: './organization-hub.page.scss',
})
export class OrganizationHubPageComponent implements OnInit {
  readonly conceptBlocks = [
    {
      titulo: 'Rol',
      desc: 'Permisos en la aplicación: administrador, líder de área u operador. No confundir con el cargo en RR.HH.',
    },
    {
      titulo: 'Área',
      desc: 'Unidad física u organizativa (empaque, planta, campo). Las incidencias se etiquetan con un código de área.',
    },
    {
      titulo: 'Líder',
      desc: 'Referencia de responsable por área. Los operadores suelen enlazarse al líder de su misma área en la demo.',
    },
    {
      titulo: 'Usuarios',
      desc: 'Se crean con rol + área + (opcional) líder. Así se asignan operadores al líder correcto desde el inicio.',
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
    const leader = this.leadersRows.find((l) => String(l.code).trim().toUpperCase() === code);
    return leader?.fullName ?? leaderCode;
  }

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

  rolesRows: any[] = [];
  areasRows: any[] = [];
  leadersRows: any[] = [];
  usersRows: any[] = [];
  resetPasswordDraftByUserId: Record<string, string> = {};
  resetPasswordMsgByUserId: Record<string, string> = {};

  seedLoading = false;
  seedMessage = '';
  seedError = '';
  seedPayload: SeedRunPayload | null = null;

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

  get leadersBySelectedArea(): any[] {
    const areaCode = (this.userForm.getRawValue().areaCode ?? '').trim().toUpperCase();
    return (this.leadersRows ?? []).filter((l) => {
      if (!areaCode) return true;
      return String(l.areaCode ?? '').trim().toUpperCase() === areaCode;
    });
  }

  onUserAreaChange(): void {
    const currentLeader = this.userForm.getRawValue().leaderCode;
    const valid = this.leadersBySelectedArea.some((l) => l.code === currentLeader);
    if (!valid) {
      this.userForm.patchValue({ leaderCode: '' });
    }
  }

  saveUser(): void {
    if (!this.isAdmin) return;
    if (this.userForm.invalid) return;
    const raw = this.userForm.getRawValue();
    const payload = {
      ...raw,
      areaCode: raw.areaCode.trim().toUpperCase(),
      roleCode: raw.roleCode.trim().toLowerCase(),
      leaderCode: raw.leaderCode.trim().toUpperCase() || undefined,
    };
    this.api.createUser(payload).subscribe(() => {
      this.userForm.reset({
        email: '',
        fullName: '',
        roleCode: 'operator',
        areaCode: '',
        leaderCode: '',
        isActive: true,
      });
      this.api.listUsers().subscribe(({ data }) => (this.usersRows = data ?? []));
    });
  }

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

  runSeed(): void {
    this.seedLoading = true;
    this.seedMessage = '';
    this.seedError = '';
    this.seedPayload = null;
    this.api.runSeed().subscribe({
      next: ({ data, message }) => {
        this.seedPayload = data;
        this.seedMessage = message;
        this.seedLoading = false;
        this.reloadAll();
      },
      error: () => {
        this.seedError = 'No se pudo ejecutar la semilla (¿API disponible y ruta /api/dev/seed?).';
        this.seedLoading = false;
      },
    });
  }
}
