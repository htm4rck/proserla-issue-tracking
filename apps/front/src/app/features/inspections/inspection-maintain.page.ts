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
  areas: Area[] = [];
  leaders: Leader[] = [];
  workSites: WorkSite[] = [];
  employerTypes: Array<{ code: string; label: string }> = [];
  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions = yearOptions(2020);
  /** Inspección con codigo de lider que ya no esta en el maestro (solo edicion). */
  orphanAreaLeaderOption: { key: string; label: string } | null = null;

  existingImages: Array<{ id: string; imageType: string; url: string; uploadedBy?: string; comment?: string; uploadOk?: boolean; uploadError?: string; status?: string }> = [];

  pendingEvidence: Array<{
    imageType: 'report' | 'closure';
    uploadedBy: string;
    comment: string;
    file?: File;
  }> = [];
  previewImage: { url: string; imageType: string; uploadedBy?: string } | null = null;

  readonly form = this.fb.nonNullable.group({
    /** En alta lo asigna el servidor (correlativo INS-AAAA-NNNNN). */
    inspectionCode: [''],
    /** Siempre desde usuario logueado (servidor valida x-user-email). */
    reportedBy: [''],
    reportYear: [new Date().getFullYear()],
    reportMonth: [''],
    reportDay: [new Date().getDate()],
    reportTime: [''],
    site: [''],
    reportedPerson: [''],
    reportedPersonAge: [''],
    employerType: [''],
    /** Sincronizado desde `areaLeaderKey` (combo Lider de area). */
    areaCode: [''],
    location: ['', Validators.required],
    workArea: [''],
    inspectionType: this.fb.nonNullable.control<'act' | 'condition' | 'mixed'>('condition', Validators.required),
    riskLevel: this.fb.nonNullable.control<'low' | 'medium' | 'high'>('medium', Validators.required),
    description: ['', Validators.required],
    comment: [''],
    reportSource: [''],
    correctiveMeasures: [''],
    leaderCode: [''],
    /** Valor compuesto `areaCode|leaderCode` para el combo visual (obligatorio solo en alta). */
    areaLeaderKey: [''],
    assignedTo: [''],
    status: this.fb.nonNullable.control<Inspection['status']>('open', Validators.required),
  });

  ngOnInit(): void {
    this.form.controls.areaLeaderKey.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((key) => {
      const k = (key ?? '').trim();
      if (!k && !this.isCreate) return;
      const parsed = this.parseAreaLeaderKey(k);
      this.form.patchValue({ areaCode: parsed.areaCode, leaderCode: parsed.leaderCode }, { emitEvent: false });
    });

    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const code = pm.get('inspectionCode');
          if (!code) return EMPTY;
          return forkJoin({
            areas: this.api.listAreas(),
            workSites: this.api.listWorkSites(),
            leaders: this.api.listLeaders(),
            employerTypes: this.api.listCatalogByType('employer_type'),
          }).pipe(
            map(({ areas, workSites, leaders, employerTypes }) => ({
              code,
              areas: areas.data ?? [],
              workSites: workSites.data ?? [],
              leaders: leaders.data ?? [],
              employerTypes: employerTypes.data ?? [],
            })),
          );
        }),
      )
      .subscribe({
        next: ({ code, areas, workSites, leaders, employerTypes }) => {
          this.areas = areas;
          this.workSites = workSites;
          this.leaders = leaders;
          this.employerTypes = employerTypes.map((e: any) => ({ code: e.code, label: e.label }));
          if (code === 'nuevo') {
            this.setupCreate();
          } else {
            this.setupEdit(code);
          }
        },
        error: () => (this.errorMsg = 'No se pudieron cargar areas, fundos o lideres.'),
      });
  }

  areaName(areaCode: string): string {
    return this.areas.find((a) => a.code === areaCode)?.name ?? areaCode;
  }

  areaLeaderOptionValue(l: Leader): string { return `${l.areaCode}|${l.code}`; }

  get leadersForSelect(): Leader[] {
    return [...this.leaders]
      .filter((l) => l.isActive)
      .sort((a, b) => {
        const byArea = this.areaName(a.areaCode).localeCompare(this.areaName(b.areaCode), 'es');
        if (byArea !== 0) return byArea;
        return a.fullName.localeCompare(b.fullName, 'es');
      });
  }

  private parseAreaLeaderKey(key: string): { areaCode: string; leaderCode: string } {
    const k = (key ?? '').trim();
    if (!k) return { areaCode: '', leaderCode: '' };
    const i = k.indexOf('|');
    if (i <= 0) return { areaCode: '', leaderCode: '' };
    return { areaCode: k.slice(0, i).trim(), leaderCode: k.slice(i + 1).trim() };
  }

  private setupCreate(): void {
    this.isCreate = true;
    this.orphanAreaLeaderOption = null;
    this.errorMsg = '';
    this.feedback = '';
    this.pendingEvidence = [];
    this.existingImages = [];
    this.form.reset({
      inspectionCode: '',
      reportedBy: this.reporterLabelFromSession(),
      reportYear: new Date().getFullYear(),
      reportMonth: '',
      reportDay: new Date().getDate(),
      reportTime: '',
      site: '',
      reportedPerson: '',
      reportedPersonAge: '',
      employerType: '',
      areaCode: '',
      areaLeaderKey: '',
      location: '',
      workArea: '',
      inspectionType: 'condition',
      riskLevel: 'medium',
      description: '',
      comment: '',
      reportSource: '',
      correctiveMeasures: '',
      leaderCode: '',
      assignedTo: '',
      status: 'open',
    });
    this.form.controls.inspectionCode.disable();
    this.form.controls.reportedBy.disable();
    this.form.controls.areaLeaderKey.setValidators(Validators.required);
    this.form.controls.areaLeaderKey.updateValueAndValidity({ emitEvent: false });
    this.preselectAreaLeaderFromSession();
  }

  private setupEdit(code: string): void {
    this.isCreate = false;
    this.orphanAreaLeaderOption = null;
    this.form.controls.areaLeaderKey.clearValidators();
    this.form.controls.areaLeaderKey.updateValueAndValidity({ emitEvent: false });
    this.errorMsg = '';
    this.feedback = '';
    this.pendingEvidence = [];
    this.loadExisting(code);
  }

  private preselectAreaLeaderFromSession(): void {
    const u = this.session.user;
    if (!u?.areaCode || !u.leaderCode?.trim()) return;
    const key = `${u.areaCode}|${u.leaderCode.trim()}`;
    const ok = this.leaders.some((l) => l.areaCode === u.areaCode && l.code === u.leaderCode?.trim() && l.isActive);
    if (ok) this.form.controls.areaLeaderKey.setValue(key);
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
    this.orphanAreaLeaderOption = null;
    let areaLeaderKey = '';
    if (lc) {
      const known = this.leaders.some((l) => l.areaCode === ac && l.code === lc && l.isActive);
      if (known) {
        areaLeaderKey = `${ac}|${lc}`;
      } else {
        this.orphanAreaLeaderOption = {
          key: `${ac}|${lc}`,
          label: `Area: ${this.areaName(ac)} - Lider: ${lc} (referencia historica)`,
        };
        areaLeaderKey = this.orphanAreaLeaderOption.key;
      }
    }

    this.form.patchValue({
      inspectionCode: data.inspectionCode,
      reportedBy: data.reportedBy,
      reportYear: data.reportYear ?? new Date().getFullYear(),
      reportMonth: data.reportMonth ?? '',
      reportDay: data.reportDay ?? new Date(data.createdAt).getDate(),
      reportTime: data.reportTime ?? '',
      site: data.site ?? '',
      reportedPerson: data.reportedPerson ?? '',
      reportedPersonAge: data.reportedPersonAge ?? '',
      employerType: data.employerType ?? '',
      areaCode: ac,
      leaderCode: lc,
      areaLeaderKey,
      assignedTo: data.assignedTo ?? '',
      location: data.location,
      workArea: data.workArea ?? '',
      inspectionType: data.inspectionType,
      riskLevel: data.riskLevel,
      description: data.description,
      comment: data.comment ?? '',
      reportSource: data.reportSource ?? '',
      correctiveMeasures: data.correctiveMeasures ?? '',
      status: data.status,
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
    this.api.listByInspection('inspection-images', code).subscribe(({ data }) => (this.existingImages = data ?? []));
  }

  addEvidenceRow(): void { this.pendingEvidence.push({ imageType: 'report', uploadedBy: '', comment: '' }); }
  removePendingEvidence(index: number): void { this.pendingEvidence.splice(index, 1); }
  setStatus(status: Inspection['status']): void { this.form.patchValue({ status }); }

  onFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.pendingEvidence[index]) return;
    this.pendingEvidence[index].file = file;
  }

  pendingFileName(row: { file?: File }): string { return row.file?.name ?? 'Sin archivo seleccionado'; }

  openImagePreview(img: { url: string; imageType: string; uploadedBy?: string }): void {
    this.previewImage = { url: img.url, imageType: img.imageType, uploadedBy: img.uploadedBy };
  }

  closeImagePreview(): void { this.previewImage = null; }

  uploadPendingFiles(inspectionCode: string, status: string): Promise<void> {
    const uploads = this.pendingEvidence.map((row, idx) => ({ row, idx })).filter(({ row }) => row.file);
    if (uploads.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let pending = uploads.length;
      for (const { row } of uploads) {
        this.api
          .uploadInspectionFile(row.file!, inspectionCode, row.imageType, {
            uploadedBy: row.uploadedBy || undefined,
            comment: row.comment || undefined,
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
    const pendingClosure = this.pendingEvidence.some((row) => row.imageType === 'closure' && !!row.file);
    const existingClosure = this.existingImages.some((row) => row.imageType === 'closure');
    return pendingClosure || existingClosure;
  }

  submit(): void {
    this.feedback = '';
    this.errorMsg = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const raw = this.form.getRawValue();
    const normalizedReportYear = Number(raw.reportYear);
    const reportYear = Number.isFinite(normalizedReportYear) && normalizedReportYear > 0 ? normalizedReportYear : undefined;

    if (this.pendingEvidence.some((row) => !row.file)) {
      this.errorMsg = 'Hay evidencias pendientes sin archivo seleccionado. Adjunta el archivo o quita la fila.';
      return;
    }

    if (raw.status === 'closed' && !this.hasClosureEvidence) {
      this.errorMsg = 'Para cerrar la inspección debes adjuntar evidencia de cierre (imagen tipo "Cierre").';
      return;
    }

    if (this.isCreate) {
      if (!raw.areaCode?.trim() || !raw.leaderCode?.trim()) {
        this.errorMsg = 'Seleccione lider de area (area y lider).';
        return;
      }
      if (!raw.site?.trim()) {
        this.errorMsg = 'Seleccione fundo / planta.';
        return;
      }
      const { inspectionCode: _c, reportedBy: _r, ...rest } = raw;
      this.api
        .createInspection({
          ...rest,
          reportYear,
          reportMonth: raw.reportMonth?.trim().toUpperCase() || undefined,
          site: raw.site || undefined,
          reportedPerson: raw.reportedPerson || undefined,
          reportedPersonAge: raw.reportedPersonAge || undefined,
          employerType: raw.employerType || undefined,
          leaderCode: raw.leaderCode || undefined,
          assignedTo: raw.assignedTo || undefined,
          workArea: raw.workArea || undefined,
          comment: raw.comment?.trim() || undefined,
          reportSource: raw.reportSource || undefined,
          correctiveMeasures: raw.correctiveMeasures || undefined,
        })
        .subscribe({
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

    const closurePending = this.pendingEvidence.some((row) => row.imageType === 'closure' && !!row.file);
    const updatePayload = {
      reportedBy: raw.reportedBy,
      reportYear,
      reportMonth: raw.reportMonth?.trim().toUpperCase() || undefined,
      reportDay: raw.reportDay,
      reportTime: raw.reportTime || undefined,
      site: raw.site || undefined,
      reportedPerson: raw.reportedPerson || undefined,
      reportedPersonAge: raw.reportedPersonAge || undefined,
      employerType: raw.employerType || undefined,
      areaCode: raw.areaCode,
      leaderCode: raw.leaderCode || undefined,
      assignedTo: raw.assignedTo || undefined,
      location: raw.location,
      workArea: raw.workArea || undefined,
      inspectionType: raw.inspectionType,
      riskLevel: raw.riskLevel,
      description: raw.description,
      comment: raw.comment?.trim() || undefined,
      reportSource: raw.reportSource || undefined,
      correctiveMeasures: raw.correctiveMeasures || undefined,
      status: raw.status,
    };

    const runUpdate = (skipUploadAfterSave: boolean): void => {
      this.api.updateInspection(raw.inspectionCode, updatePayload).subscribe({
        next: () => {
          this.feedback = 'Cambios guardados correctamente.';
          if (skipUploadAfterSave) {
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
