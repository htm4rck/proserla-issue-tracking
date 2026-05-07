import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, forkJoin, map, switchMap } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { Area, Inspection, Leader, WorkSite } from '../../core/models/api.models';
import { MONTH_OPTIONS, yearOptions } from '../../shared/temporal-options';

@Component({
  selector: 'app-inspection-maintain-page',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './inspection-maintain.page.html',
  styleUrl: './inspection-maintain.page.scss',
})
export class InspectionMaintainPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  isCreate = false;
  feedback = '';
  errorMsg = '';
  pdfBusy = false;

  areas: Area[] = [];
  leaders: Leader[] = [];
  workSites: WorkSite[] = [];
  employerTypes: Array<{ code: string; label: string }> = [];

  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions = yearOptions(2020);

  /** Nombre del líder resuelto automáticamente al seleccionar área */
  resolvedLeaderName = '';
  /** Líder huérfano (solo edición — líder ya no está en el maestro) */
  orphanLeaderLabel = '';

  existingImages: Array<{
    id: string; imageType: string; url: string;
    uploadedBy?: string; comment?: string; uploadOk?: boolean;
    uploadError?: string; status?: string;
  }> = [];

  pendingEvidence: Array<{
    imageType: 'report' | 'closure';
    uploadedBy: string;
    comment: string;
    file?: File;
  }> = [];

  previewImage: { url: string; imageType: string; uploadedBy?: string } | null = null;

  readonly form = this.fb.nonNullable.group({
    inspectionCode:    [''],
    reportedBy:        [''],
    reportYear:        [new Date().getFullYear()],
    reportMonth:       [''],
    reportDay:         [new Date().getDate()],
    reportTime:        [''],
    site:              [''],
    reportedPerson:    [''],
    reportedPersonAge: [''],
    employerType:      [''],
    areaCode:          ['', Validators.required],
    location:          ['', Validators.required],
    workArea:          [''],
    inspectionType:    this.fb.nonNullable.control<'act' | 'condition' | 'mixed'>('condition', Validators.required),
    riskLevel:         this.fb.nonNullable.control<'low' | 'medium' | 'high'>('medium', Validators.required),
    description:       ['', Validators.required],
    comment:           [''],
    reportSource:      [''],
    correctiveMeasures: [''],
    leaderCode:        [''],
    assignedTo:        [''],
    status:            this.fb.nonNullable.control<Inspection['status']>('open', Validators.required),
  });

  ngOnInit(): void {
    this.form.controls.areaCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((areaCode) => this.resolveLeaderForArea(areaCode));

    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const code = pm.get('inspectionCode');
          if (!code) return EMPTY;
          return forkJoin({
            areas:         this.api.listAreas(),
            workSites:     this.api.listWorkSites(),
            leaders:       this.api.listLeaders(),
            employerTypes: this.api.listCatalogByType('employer_type'),
          }).pipe(
            map(({ areas, workSites, leaders, employerTypes }) => ({
              code,
              areas:         areas.data ?? [],
              workSites:     workSites.data ?? [],
              leaders:       leaders.data ?? [],
              employerTypes: employerTypes.data ?? [],
            })),
          );
        }),
      )
      .subscribe({
        next: ({ code, areas, workSites, leaders, employerTypes }) => {
          this.areas         = areas;
          this.workSites     = workSites;
          this.leaders       = leaders;
          this.employerTypes = employerTypes.map((e: any) => ({ code: e.code, label: e.label }));
          if (code === 'nuevo') this.setupCreate();
          else                  this.setupEdit(code);
        },
        error: () => (this.errorMsg = 'No se pudieron cargar areas, fundos o lideres.'),
      });
  }

  // ── Resolución de líder por área ──────────────────────────────────────────

  private resolveLeaderForArea(areaCode: string): void {
    if (!areaCode?.trim()) {
      this.form.patchValue({ leaderCode: '' }, { emitEvent: false });
      this.resolvedLeaderName = '';
      return;
    }

    const matches = this.leaders.filter(
      l => l.isActive && l.areas.some(a => a.areaCode === areaCode),
    );

    if (matches.length === 0) {
      this.form.patchValue({ leaderCode: '' }, { emitEvent: false });
      this.resolvedLeaderName = '';
      return;
    }

    const primary = matches.find(l =>
      l.areas.some(a => a.areaCode === areaCode && a.isPrimary),
    ) ?? matches[0];

    this.form.patchValue({ leaderCode: primary.code }, { emitEvent: false });
    this.resolvedLeaderName = primary.fullName;
  }

  areaName(areaCode: string): string {
    return this.areas.find(a => a.code === areaCode)?.name ?? areaCode;
  }

  /** Áreas que tienen al menos un líder activo asignado */
  get areasWithLeader(): Area[] {
    const coveredCodes = new Set(
      this.leaders
        .filter(l => l.isActive)
        .flatMap(l => l.areas.map(a => a.areaCode)),
    );
    return this.areas.filter(a => coveredCodes.has(a.code));
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private setupCreate(): void {
    this.isCreate = true;
    this.orphanLeaderLabel = '';
    this.resolvedLeaderName = '';
    this.errorMsg = '';
    this.feedback = '';
    this.pendingEvidence = [];
    this.existingImages = [];

    this.form.reset({
      inspectionCode:    '',
      reportedBy:        this.reporterLabelFromSession(),
      reportYear:        new Date().getFullYear(),
      reportMonth:       '',
      reportDay:         new Date().getDate(),
      reportTime:        '',
      site:              '',
      reportedPerson:    '',
      reportedPersonAge: '',
      employerType:      '',
      areaCode:          '',
      location:          '',
      workArea:          '',
      inspectionType:    'condition',
      riskLevel:         'medium',
      description:       '',
      comment:           '',
      reportSource:      '',
      correctiveMeasures: '',
      leaderCode:        '',
      assignedTo:        '',
      status:            'open',
    });

    this.form.controls.inspectionCode.disable();
    this.form.controls.reportedBy.disable();

    this.preselectAreaFromSession();
  }

  private setupEdit(code: string): void {
    this.isCreate = false;
    this.orphanLeaderLabel = '';
    this.errorMsg = '';
    this.feedback = '';
    this.pendingEvidence = [];
    this.loadExisting(code);
  }

  private preselectAreaFromSession(): void {
    const u = this.session.user;
    if (!u?.areaCode) return;
    const hasLeader = this.leaders.some(
      l => l.isActive && l.areas.some(a => a.areaCode === u.areaCode),
    );
    if (hasLeader) this.form.controls.areaCode.setValue(u.areaCode);
  }

  private loadExisting(code: string): void {
    this.api.getInspection(code).subscribe({
      next: ({ data }) => {
        if (!data) { this.errorMsg = 'Inspección no encontrada'; return; }
        this.applyInspection(data);
        this.reloadImages(data.inspectionCode);
      },
      error: () => (this.errorMsg = 'No se pudo cargar la inspección.'),
    });
  }

  private applyInspection(data: Inspection): void {
    const ac = data.areaCode;
    const lc = (data.leaderCode ?? '').trim();

    const knownLeader = this.leaders.find(
      l => l.isActive && l.code === lc && l.areas.some(a => a.areaCode === ac),
    );

    if (knownLeader) {
      this.resolvedLeaderName = knownLeader.fullName;
      this.orphanLeaderLabel  = '';
    } else if (lc) {
      this.resolvedLeaderName = lc;
      this.orphanLeaderLabel  = `${lc} (referencia histórica)`;
    } else {
      this.resolvedLeaderName = '';
      this.orphanLeaderLabel  = '';
    }

    this.form.patchValue({
      inspectionCode:    data.inspectionCode,
      reportedBy:        data.reportedBy,
      reportYear:        data.reportYear  ?? new Date().getFullYear(),
      reportMonth:       data.reportMonth ?? '',
      reportDay:         data.reportDay   ?? new Date(data.createdAt).getDate(),
      reportTime:        data.reportTime  ?? '',
      site:              data.site        ?? '',
      reportedPerson:    data.reportedPerson    ?? '',
      reportedPersonAge: data.reportedPersonAge ?? '',
      employerType:      data.employerType      ?? '',
      areaCode:          ac,
      leaderCode:        lc,
      assignedTo:        data.assignedTo        ?? '',
      location:          data.location,
      workArea:          data.workArea           ?? '',
      inspectionType:    data.inspectionType,
      riskLevel:         data.riskLevel,
      description:       data.description,
      comment:           data.comment            ?? '',
      reportSource:      data.reportSource       ?? '',
      correctiveMeasures: data.correctiveMeasures ?? '',
      status:            data.status,
    });

    this.form.controls.inspectionCode.disable();
    this.form.controls.reportedBy.disable();
  }

  private reporterLabelFromSession(): string {
    const u = this.session.user;
    if (!u) return '';
    return `${u.fullName} (${u.email})`;
  }

  private reloadImages(code: string): void {
    this.api.listByInspection('inspection-images', code)
      .subscribe(({ data }) => (this.existingImages = data ?? []));
  }

  // ── Evidencias ────────────────────────────────────────────────────────────

  addEvidenceRow(): void {
    this.pendingEvidence.push({ imageType: 'report', uploadedBy: '', comment: '' });
  }

  removePendingEvidence(index: number): void { this.pendingEvidence.splice(index, 1); }
  setStatus(status: Inspection['status']): void { this.form.patchValue({ status }); }

  onFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.pendingEvidence[index]) return;
    this.pendingEvidence[index].file = file;
  }

  pendingFileName(row: { file?: File }): string {
    return row.file?.name ?? 'Sin archivo seleccionado';
  }

  openImagePreview(img: { url: string; imageType: string; uploadedBy?: string }): void {
    this.previewImage = { url: img.url, imageType: img.imageType, uploadedBy: img.uploadedBy };
  }

  closeImagePreview(): void { this.previewImage = null; }

  // ── PDF ───────────────────────────────────────────────────────────────────

  downloadPdf(): void {
    const code = this.form.getRawValue().inspectionCode;
    if (!code) return;
    this.pdfBusy = true;
    this.api.downloadInspectionPdf(code).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspeccion-${code}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.pdfBusy = false;
      },
      error: () => {
        this.errorMsg = 'No se pudo generar el PDF.';
        this.pdfBusy = false;
      },
    });
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  uploadPendingFiles(inspectionCode: string, status: string): Promise<void> {
    const uploads = this.pendingEvidence
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row.file);
    if (uploads.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      let pending = uploads.length;
      for (const { row } of uploads) {
        this.api
          .uploadInspectionFile(row.file!, inspectionCode, row.imageType, {
            uploadedBy: row.uploadedBy || undefined,
            comment:    row.comment    || undefined,
            status,
          })
          .subscribe({
            next: ({ message, success }) => {
              if (!success) this.feedback += ` | ${message}`;
              if (--pending === 0) resolve();
            },
            error: () => {
              this.feedback += ' | Un archivo no pudo subirse al servidor.';
              if (--pending === 0) resolve();
            },
          });
      }
    });
  }

  get hasClosureEvidence(): boolean {
    return this.pendingEvidence.some(r => r.imageType === 'closure' && !!r.file)
        || this.existingImages.some(r => r.imageType === 'closure');
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit(): void {
    this.feedback = '';
    this.errorMsg = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const raw = this.form.getRawValue();
    const normalizedYear = Number(raw.reportYear);
    const reportYear = Number.isFinite(normalizedYear) && normalizedYear > 0 ? normalizedYear : undefined;

    if (this.pendingEvidence.some(r => !r.file)) {
      this.errorMsg = 'Hay evidencias pendientes sin archivo. Adjunta el archivo o quita la fila.';
      return;
    }

    if (raw.status === 'closed' && !this.hasClosureEvidence) {
      this.errorMsg = 'Para cerrar la inspección debes adjuntar evidencia de cierre (imagen tipo "Cierre").';
      return;
    }

    if (this.isCreate) {
      if (!raw.areaCode?.trim()) {
        this.errorMsg = 'Seleccione el área de la inspección.';
        return;
      }
      if (!raw.leaderCode?.trim()) {
        this.errorMsg = 'El área seleccionada no tiene un líder asignado.';
        return;
      }
      if (!raw.site?.trim()) {
        this.errorMsg = 'Seleccione fundo / planta.';
        return;
      }

      const { inspectionCode: _c, reportedBy: _r, ...rest } = raw;
      this.api.createInspection({
        ...rest,
        reportYear,
        reportMonth:        raw.reportMonth?.trim().toUpperCase() || undefined,
        site:               raw.site               || undefined,
        reportedPerson:     raw.reportedPerson      || undefined,
        reportedPersonAge:  raw.reportedPersonAge   || undefined,
        employerType:       raw.employerType        || undefined,
        leaderCode:         raw.leaderCode          || undefined,
        assignedTo:         raw.assignedTo          || undefined,
        workArea:           raw.workArea            || undefined,
        comment:            raw.comment?.trim()     || undefined,
        reportSource:       raw.reportSource        || undefined,
        correctiveMeasures: raw.correctiveMeasures  || undefined,
      }).subscribe({
        next: ({ data }) => {
          this.feedback = `Inspección ${data.inspectionCode} guardada correctamente.`;
          void this.uploadPendingFiles(data.inspectionCode, raw.status).then(() => {
            void this.router.navigate(['/inspections', data.inspectionCode], { replaceUrl: true });
          });
        },
        error: (err) => (this.errorMsg = err?.error?.message || 'No se pudo registrar la inspección.'),
      });
      return;
    }

    const closurePending = this.pendingEvidence.some(r => r.imageType === 'closure' && !!r.file);
    const updatePayload = {
      reportedBy:         raw.reportedBy,
      reportYear,
      reportMonth:        raw.reportMonth?.trim().toUpperCase() || undefined,
      reportDay:          raw.reportDay,
      reportTime:         raw.reportTime         || undefined,
      site:               raw.site               || undefined,
      reportedPerson:     raw.reportedPerson      || undefined,
      reportedPersonAge:  raw.reportedPersonAge   || undefined,
      employerType:       raw.employerType        || undefined,
      areaCode:           raw.areaCode,
      leaderCode:         raw.leaderCode          || undefined,
      assignedTo:         raw.assignedTo          || undefined,
      location:           raw.location,
      workArea:           raw.workArea            || undefined,
      inspectionType:     raw.inspectionType,
      riskLevel:          raw.riskLevel,
      description:        raw.description,
      comment:            raw.comment?.trim()     || undefined,
      reportSource:       raw.reportSource        || undefined,
      correctiveMeasures: raw.correctiveMeasures  || undefined,
      status:             raw.status,
    };

    const runUpdate = (skipUpload: boolean): void => {
      this.api.updateInspection(raw.inspectionCode, updatePayload).subscribe({
        next: () => {
          this.feedback = 'Cambios guardados correctamente.';
          if (skipUpload) {
            this.pendingEvidence = [];
            this.reloadImages(raw.inspectionCode);
            return;
          }
          void this.uploadPendingFiles(raw.inspectionCode, raw.status).then(() => {
            this.pendingEvidence = [];
            this.reloadImages(raw.inspectionCode);
          });
        },
        error: (err) => (this.errorMsg = err?.error?.message || 'No se pudo guardar la inspección.'),
      });
    };

    if (raw.status === 'closed' && closurePending) {
      void this.uploadPendingFiles(raw.inspectionCode, raw.status).then(() => runUpdate(true));
      return;
    }

    runUpdate(false);
  }
}
