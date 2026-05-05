import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { WorkSite } from '../../core/models/api.models';

type MasterTab = 'sites' | 'employer_type';

@Component({
  selector: 'app-masters-hub-page',
  imports: [ReactiveFormsModule],
  templateUrl: './masters-hub.page.html',
  styleUrl: './masters-hub.page.scss',
})
export class MastersHubPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  activeTab: MasterTab = 'sites';
  sitesRows: WorkSite[] = [];
  catalogRows: Array<{ id: string; catalogType: string; code: string; label: string; isActive: boolean }> = [];

  siteForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    sortOrder: [0],
    isActive: [true],
  });

  catalogForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    label: ['', Validators.required],
    isActive: [true],
  });

  get isAdmin(): boolean {
    return this.session.user?.roleCode === 'admin';
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((pm) => {
      const t = pm.get('tab') as MasterTab | null;
      if (t === 'sites' || t === 'employer_type') this.activeTab = t;
      else this.activeTab = 'sites';
    });
    this.reloadSites();
  }

  setTab(tab: MasterTab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
    if (tab === 'employer_type') this.reloadCatalog('employer_type');
  }

  reloadSites(): void {
    this.api.listWorkSitesAdmin().subscribe(({ data }) => (this.sitesRows = data ?? []));
  }

  reloadCatalog(catalogType: string): void {
    this.api.listCatalogByType(catalogType).subscribe(({ data }) => (this.catalogRows = data ?? []));
  }

  saveSite(): void {
    if (!this.isAdmin || this.siteForm.invalid) return;
    const raw = this.siteForm.getRawValue();
    this.api
      .createWorkSite({
        code: raw.code.trim().toUpperCase(),
        name: raw.name.trim(),
        sortOrder: Number(raw.sortOrder) || 0,
        isActive: raw.isActive,
      })
      .subscribe(() => {
        this.siteForm.reset({ code: '', name: '', sortOrder: 0, isActive: true });
        this.reloadSites();
      });
  }

  saveCatalogItem(catalogType: string): void {
    if (!this.isAdmin || this.catalogForm.invalid) return;
    const raw = this.catalogForm.getRawValue();
    this.api
      .createSimple('catalog-items', {
        catalogType,
        code: raw.code.trim().toLowerCase(),
        label: raw.label.trim(),
        isActive: raw.isActive,
      })
      .subscribe(() => {
        this.catalogForm.reset({ code: '', label: '', isActive: true });
        this.reloadCatalog(catalogType);
      });
  }
}
