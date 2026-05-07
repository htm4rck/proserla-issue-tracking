import { DatePipe, JsonPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuditLogDetail, AuditLogItem } from '../../core/models/api.models';

@Component({
  selector: 'app-audit-log-page',
  imports: [DatePipe, JsonPipe, KeyValuePipe, ReactiveFormsModule],
  templateUrl: './audit-log.page.html',
  styleUrl: './audit-log.page.scss',
})
export class AuditLogPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly fb = inject(FormBuilder);

  readonly filterForm = this.fb.nonNullable.group({
    entityType: [''],
    entityId: [''],
  });

  items: AuditLogItem[] = [];
  total = 0;
  page = 1;
  pageSize = 30;
  totalPages = 1;
  loading = false;
  error = '';

  selectedEntry: AuditLogDetail | null = null;
  detailLoading = false;

  readonly entityTypeOptions = [
    { value: '', label: 'Todos' },
    { value: 'inspection', label: 'Inspección' },
    { value: 'user', label: 'Usuario' },
    { value: 'area', label: 'Área' },
    { value: 'leader', label: 'Líder' },
    { value: 'role', label: 'Rol' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(p = 1): void {
    this.loading = true;
    this.error = '';
    this.page = p;
    const { entityType, entityId } = this.filterForm.getRawValue();
    this.api
      .listAuditLogs({
        entityType: entityType || undefined,
        entityId: entityId.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: ({ data }) => {
          this.items = data.items;
          this.total = data.total;
          this.totalPages = data.totalPages;
          this.loading = false;
        },
        error: () => {
          this.error = 'No se pudo cargar el historial de auditoría.';
          this.loading = false;
        },
      });
  }

  openDetail(entry: AuditLogItem): void {
    if (this.selectedEntry?.id === entry.id) {
      this.selectedEntry = null;
      return;
    }
    this.detailLoading = true;
    this.api.getAuditLog(entry.id).subscribe({
      next: ({ data }) => {
        this.selectedEntry = data;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      },
    });
  }

  closeDetail(): void {
    this.selectedEntry = null;
  }

  actionLabel(action: string): string {
    if (action === 'create') return 'Creación';
    if (action === 'update') return 'Actualización';
    if (action === 'delete') return 'Eliminación';
    return action;
  }

  changeSummary(item: AuditLogItem): string {
    if (!item.changeLabel) return this.actionLabel(item.action);
    if (item.previousValue && item.nextValue) {
      return `${item.changeLabel}: ${item.previousValue} → ${item.nextValue}`;
    }
    return item.changeLabel;
  }

  diffKeys(diff?: Record<string, { from: unknown; to: unknown }>): string[] {
    return diff ? Object.keys(diff) : [];
  }
}
