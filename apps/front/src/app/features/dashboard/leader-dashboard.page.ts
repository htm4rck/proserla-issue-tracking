import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';

@Component({
  selector: 'app-leader-dashboard-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './leader-dashboard.page.html',
  styleUrls: ['./dashboard-kpis.scss', './leader-dashboard.page.scss'],
})
export class LeaderDashboardPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly fb = inject(FormBuilder);

  readonly filterForm = this.fb.nonNullable.group({
    areaCode: [''],
    leaderCode: [''],
  });

  loading = true;
  error = false;
  updatedAt: Date | null = null;
  summary: {
    open: number;
    inProgress: number;
    closed: number;
    total: number;
    compliancePct: number;
  } | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    const f = this.filterForm.getRawValue();
    this.api
      .reportsSummary({
        areaCode: f.areaCode.trim() || undefined,
        leaderCode: f.leaderCode.trim() || undefined,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ data }) => {
          this.summary = data;
          this.updatedAt = new Date();
        },
        error: () => {
          this.error = true;
          this.summary = null;
        },
      });
  }
}
