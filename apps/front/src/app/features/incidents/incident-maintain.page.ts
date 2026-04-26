import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { Area, Incident } from '../../core/models/api.models';

@Component({
  selector: 'app-incident-maintain-page',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './incident-maintain.page.html',
  styleUrl: './incident-maintain.page.scss',
})
export class IncidentMaintainPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isCreate = false;
  feedback = '';
  errorMsg = '';
  areas: Area[] = [];

  existingImages: Array<{ id: string; imageType: string; url: string; uploadedBy?: string; comment?: string; uploadOk?: boolean; uploadError?: string; status?: string }> = [];

  pendingEvidence: Array<{
    imageType: 'report' | 'closure';
    uploadedBy: string;
    comment: string;
    file?: File;
  }> = [];

  readonly form = this.fb.nonNullable.group({
    incidentCode: ['', Validators.required],
    reportedBy: ['', Validators.required],
    reportYear: [new Date().getFullYear()],
    reportMonth: [''],
    reportDay: [new Date().getDate()],
    reportTime: [''],
    site: [''],
    reportedPerson: [''],
    reportedPersonAge: [''],
    employerType: [''],
    areaCode: ['', Validators.required],
    location: ['', Validators.required],
    workArea: [''],
    incidentType: this.fb.nonNullable.control<'act' | 'condition'>('condition', Validators.required),
    riskLevel: this.fb.nonNullable.control<'low' | 'medium' | 'high'>('medium', Validators.required),
    description: ['', Validators.required],
    comment: [''],
    reportSource: [''],
    correctiveMeasures: [''],
    leaderCode: [''],
    assignedTo: [''],
    status: this.fb.nonNullable.control<Incident['status']>('open', Validators.required),
  });

  ngOnInit(): void {
    this.api.listAreas().subscribe(({ data }) => (this.areas = data ?? []));
    this.route.paramMap.subscribe((pm) => {
      const code = pm.get('incidentCode');
      if (!code) return;
      if (code === 'nuevo') {
        this.setupCreate();
      } else {
        this.setupEdit(code);
      }
    });
  }

  private setupCreate(): void {
    this.isCreate = true;
    this.errorMsg = '';
    this.feedback = '';
    this.pendingEvidence = [];
    this.existingImages = [];
    this.form.reset({
      incidentCode: '',
      reportedBy: '',
      reportYear: new Date().getFullYear(),
      reportMonth: '',
      reportDay: new Date().getDate(),
      reportTime: '',
      site: '',
      reportedPerson: '',
      reportedPersonAge: '',
      employerType: '',
      areaCode: '',
      location: '',
      workArea: '',
      incidentType: 'condition',
      riskLevel: 'medium',
      description: '',
      comment: '',
      reportSource: '',
      correctiveMeasures: '',
      leaderCode: '',
      assignedTo: '',
      status: 'open',
    });
    this.form.controls.incidentCode.enable();
  }

  private setupEdit(code: string): void {
    this.isCreate = false;
    this.errorMsg = '';
    this.feedback = '';
    this.pendingEvidence = [];
    this.loadExisting(code);
  }

  private loadExisting(code: string): void {
    this.api.getIncident(code).subscribe({
      next: ({ data }) => {
        if (!data) {
          this.errorMsg = 'Incidencia no encontrada';
          return;
        }
        this.applyIncident(data);
        this.reloadImages(data.incidentCode);
      },
      error: () => (this.errorMsg = 'No se pudo cargar la incidencia.'),
    });
  }

  private applyIncident(data: Incident): void {
    this.form.patchValue({
      incidentCode: data.incidentCode,
      reportedBy: data.reportedBy,
      reportYear: data.reportYear ?? new Date().getFullYear(),
      reportMonth: data.reportMonth ?? '',
      reportDay: data.reportDay ?? new Date(data.createdAt).getDate(),
      reportTime: data.reportTime ?? '',
      site: data.site ?? '',
      reportedPerson: data.reportedPerson ?? '',
      reportedPersonAge: data.reportedPersonAge ?? '',
      employerType: data.employerType ?? '',
      areaCode: data.areaCode,
      leaderCode: data.leaderCode ?? '',
      assignedTo: data.assignedTo ?? '',
      location: data.location,
      workArea: data.workArea ?? '',
      incidentType: data.incidentType,
      riskLevel: data.riskLevel,
      description: data.description,
      comment: data.comment ?? '',
      reportSource: data.reportSource ?? '',
      correctiveMeasures: data.correctiveMeasures ?? '',
      status: data.status,
    });
    this.form.controls.incidentCode.disable();
  }

  private reloadImages(code: string): void {
    this.api.listByIncident('incident-images', code).subscribe(({ data }) => (this.existingImages = data ?? []));
  }

  addEvidenceRow(): void {
    this.pendingEvidence.push({ imageType: 'report', uploadedBy: '', comment: '' });
  }

  removePendingEvidence(index: number): void {
    this.pendingEvidence.splice(index, 1);
  }

  setStatus(status: Incident['status']): void {
    this.form.patchValue({ status });
  }

  onFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.pendingEvidence[index]) return;
    this.pendingEvidence[index].file = file;
  }

  pendingFileName(row: { file?: File }): string {
    return row.file?.name ?? 'Sin archivo seleccionado';
  }

  uploadPendingFiles(incidentCode: string, status: string): Promise<void> {
    const uploads = this.pendingEvidence
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row.file);

    if (uploads.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      let pending = uploads.length;
      for (const { row } of uploads) {
        this.api
          .uploadIncidentFile(row.file!, incidentCode, row.imageType, {
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const hasRowsWithoutFile = this.pendingEvidence.some((row) => !row.file);
    if (hasRowsWithoutFile) {
      this.errorMsg = 'Hay evidencias pendientes sin archivo seleccionado. Adjunta el archivo o quita la fila.';
      return;
    }

    if (raw.status === 'closed' && !this.hasClosureEvidence) {
      this.errorMsg = 'Para cerrar la incidencia debes adjuntar evidencia de cierre (imagen tipo "Cierre").';
      return;
    }

    if (this.isCreate) {
      this.api
        .createIncident({
          ...raw,
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
            this.feedback = `Incidencia ${data.incidentCode} guardada correctamente.`;
            void this.uploadPendingFiles(data.incidentCode, raw.status).then(() => {
              void this.router.navigate(['/incidents', data.incidentCode], { replaceUrl: true });
            });
          },
          error: () => (this.errorMsg = 'No se pudo registrar la incidencia.'),
        });
      return;
    }

    this.api
      .updateIncident(raw.incidentCode, {
        reportedBy: raw.reportedBy,
        reportYear: raw.reportYear,
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
        incidentType: raw.incidentType,
        riskLevel: raw.riskLevel,
        description: raw.description,
        comment: raw.comment?.trim() || undefined,
        reportSource: raw.reportSource || undefined,
        correctiveMeasures: raw.correctiveMeasures || undefined,
        status: raw.status,
      })
      .subscribe({
        next: () => {
          this.feedback = 'Cambios guardados correctamente.';
          void this.uploadPendingFiles(raw.incidentCode, raw.status).then(() => {
            this.pendingEvidence = [];
            this.reloadImages(raw.incidentCode);
          });
        },
        error: () => (this.errorMsg = 'No se pudo guardar la incidencia.'),
      });
  }
}
