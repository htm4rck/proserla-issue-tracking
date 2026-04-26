import { Component, inject, OnInit } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { User } from '../../core/models/api.models';
import { etiquetaRol } from '../../shared/etiquetas';

@Component({
  selector: 'app-user-list-page',
  templateUrl: './user-list.page.html',
  styleUrl: './user-list.page.scss',
})
export class UserListPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  readonly rol = etiquetaRol;
  users: User[] = [];
  areaByCode = new Map<string, string>();

  ngOnInit(): void {
    this.api.listSimple('areas').subscribe(({ data }) => {
      this.areaByCode = new Map((data ?? []).map((a: any) => [a.code, a.name]));
      this.loadUsers();
    });
  }

  private loadUsers(): void {
    this.api.listUsers().subscribe(({ data }) => {
      this.users = (data ?? []).map((u) => ({
        ...u,
        areaName: this.areaByCode.get(u.areaCode) ?? u.areaCode,
      }));
    });
  }
}
