# Tordo One — Arquitectura Técnica

---

## 1. Visión General

```
┌─────────────────────────────────────────────────────┐
│                   Angular 19 SPA                     │
│              (Multi-tenant aware UI)                 │
└──────────────────────┬──────────────────────────────┘
                       │ JWT + tenant headers
┌──────────────────────▼──────────────────────────────┐
│                  NestJS 11 API                        │
│          /api  (REST + Swagger + Guards)              │
├──────────────────────────────────────────────────────┤
│  Modules:                                            │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────────┐  │
│  │ Auth    │ │ Findings │ │ CAPA │ │ Operations │  │
│  └─────────┘ └──────────┘ └──────┘ └────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────────┐  │
│  │ HSE     │ │ Quality  │ │ Maint│ │ Audits     │  │
│  └─────────┘ └──────────┘ └──────┘ └────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────────┐  │
│  │Workflow │ │Analytics │ │  AI  │ │ Integr.    │  │
│  └─────────┘ └──────────┘ └──────┘ └────────────┘  │
├──────────────────────────────────────────────────────┤
│              TypeORM + PostgreSQL 16                  │
│           (Row-level tenant isolation)               │
└──────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenancy

### Estrategia: Row-Level Isolation

Todas las entidades principales incluyen `tenantId` como columna obligatoria. Un middleware/guard inyecta el tenant desde el JWT o header en cada request.

```typescript
// Base entity para multi-tenant
@Entity()
export abstract class TenantBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Jerarquía Organizacional

```
Tenant (1)
 └── Company (N)
      └── Plant (N)
           └── Area (N)
                └── ProductionLine (N)
                     └── WorkCenter (N)
```

---

## 3. Estructura de Módulos Backend

Cada módulo funcional se organiza como un módulo NestJS independiente:

```
apps/back/src/app/
├── common/                    # Shared: base entities, guards, filters, decorators
│   ├── entities/
│   │   └── tenant-base.entity.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── tenant.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── current-tenant.decorator.ts
│   └── filters/
├── modules/
│   ├── auth/                  # Autenticación y autorización
│   ├── tenant/                # Gestión de tenants y empresas
│   ├── organization/          # Plants, Areas, ProductionLines, WorkCenters
│   ├── users/                 # Usuarios, roles, permisos
│   ├── operations/            # Bitácoras, turnos, checklists, inspecciones
│   ├── findings/              # Hallazgos operacionales
│   ├── capa/                  # Acciones correctivas y preventivas
│   ├── hse/                   # Seguridad industrial
│   ├── quality/               # Calidad
│   ├── maintenance/           # Mantenimiento
│   ├── audits/                # Auditorías
│   ├── workflow/              # Motor de flujos
│   ├── analytics/             # KPIs y dashboards
│   ├── ai/                    # Inteligencia artificial
│   ├── integrations/          # SAP, Odoo, Microsoft, Google
│   ├── notifications/         # Notificaciones
│   ├── attachments/           # Archivos y evidencias
│   └── audit-log/             # Trazabilidad
└── app.module.ts
```

Cada módulo sigue la estructura:

```
modules/findings/
├── controller/
│   └── findings.controller.ts
├── service/
│   └── findings.service.ts
├── entity/
│   ├── operational-finding.entity.ts
│   ├── finding-evidence.entity.ts
│   ├── finding-comment.entity.ts
│   └── finding-history.entity.ts
├── dto/
│   ├── create-finding.dto.ts
│   └── update-finding.dto.ts
├── mapper/
│   └── finding.mapper.ts
└── findings.module.ts
```

---

## 4. Estructura Frontend

```
apps/front/src/app/
├── core/
│   ├── guards/
│   ├── interceptors/
│   │   ├── auth.interceptor.ts
│   │   └── tenant.interceptor.ts
│   ├── models/
│   └── services/
│       ├── auth.service.ts
│       ├── tenant.service.ts
│       └── api-client.service.ts
├── features/
│   ├── auth/                  # Login, SSO
│   ├── dashboard/             # KPIs por rol
│   ├── operations/            # Bitácoras, turnos, checklists
│   ├── findings/              # Hallazgos
│   ├── capa/                  # CAPA
│   ├── hse/                   # Seguridad
│   ├── quality/               # Calidad
│   ├── maintenance/           # Mantenimiento
│   ├── audits/                # Auditorías
│   ├── workflows/             # Configuración de flujos
│   ├── analytics/             # Reportes y gráficos
│   ├── admin/                 # Configuración tenant/empresa
│   └── account/               # Perfil, cambio de contraseña
├── layout/
│   ├── app-shell.component.ts
│   └── sidebar-menu.ts
└── shared/
    ├── components/
    ├── pipes/
    └── utils/
```

---

## 5. Seguridad y Autorización

### Modelo RBAC

```
Tenant → Users → Roles → Permissions
```

| Nivel | Ejemplo |
|-------|---------|
| Tenant Admin | Configura empresa, plantas, usuarios |
| Plant Manager | Ve toda la planta |
| Area Leader | Solo su área |
| Operator | Registra hallazgos, checklists |
| Auditor | Solo lectura |
| External Auditor | Solo auditorías asignadas |

### JWT Payload

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "companyId": "company-uuid",
  "plantId": "plant-uuid",
  "roles": ["area_leader"],
  "permissions": ["findings.create", "findings.read"],
  "areaId": "area-uuid"
}
```

---

## 6. Auditoría y Trazabilidad

Cada operación CUD genera un registro en `audit_logs`:

| Campo | Descripción |
|-------|-------------|
| `tenantId` | Tenant del registro |
| `entityType` | Tipo de entidad afectada |
| `entityId` | ID del registro |
| `action` | `create` / `update` / `delete` |
| `previousSnapshot` | JSON del estado anterior |
| `diff` | `{ campo: { from, to } }` |
| `performedBy` | UUID del usuario |
| `performedAt` | Timestamp |

---

## 7. Workflow Engine

Flujos configurables por tenant/empresa:

```
WorkflowDefinition
 └── WorkflowStep (estado)
      └── WorkflowTransition (from → to, condiciones)

WorkflowInstance (instancia viva)
 └── Approval (aprobación/rechazo por paso)
      └── EscalationRule (si SLA vence, escalar)
```

Un hallazgo, CAPA, orden de trabajo, etc. puede vincularse a un `WorkflowInstance` para seguir el flujo configurado.

---

## 8. Integraciones

### Patrón

```
┌──────────────┐       ┌────────────────────┐       ┌──────────┐
│  Tordo One   │──────▶│ Integration Layer  │──────▶│  SAP/    │
│  (interno)   │◀──────│ (adapters + queue) │◀──────│  Odoo    │
└──────────────┘       └────────────────────┘       └──────────┘
```

Cada integración usa un adapter pattern:

```typescript
interface ErpAdapter {
  syncEmployees(): Promise<void>;
  createWorkOrder(data: WorkOrderDto): Promise<ExternalReference>;
  syncAssets(): Promise<void>;
}
```

Las referencias externas se almacenan en `ExternalReference`:

```
| tenantId | entityType | entityId | externalSystem | externalId |
```

---

## 9. Storage de Archivos

### Fase actual

PHP bridge en hosting compartido (GoDaddy/cPanel).

### Fase futura

Migrar a AWS S3 con presigned URLs:

```
Angular → API (presigned URL) → S3
                                  ↓
                          CloudFront (CDN)
```

---

## 10. Migración desde Sistema Actual

El sistema actual (inspecciones/incidencias) se refactoriza como caso particular del módulo **Hallazgos Operacionales** + **Gestión Operacional**:

| Actual | Nuevo |
|--------|-------|
| `inspection` entity | `OperationalFinding` |
| `inspection-response` | `FindingEvidence` + `FindingComment` |
| `inspection-image` | `Attachment` |
| `area` | `Area` (dentro de Plant) |
| `leader` | `User` con rol `area_leader` |
| `audit_log` | `AuditLog` (extendido con tenantId) |
| `catalog_item` | Configuración por módulo |
| `work_site` | `Plant` |

### Estrategia de migración

1. Agregar entidades `Tenant`, `Company`, `Plant` como capa superior
2. Agregar `tenantId` a todas las entidades existentes
3. Renombrar entidades al nuevo modelo (migration SQL)
4. Implementar nuevos módulos incrementalmente
5. Mantener retrocompatibilidad de API durante transición

---

## 11. Deploy

### Desarrollo

```
Docker Compose: Postgres + API + Angular (nginx)
```

### Producción

```
Railway / AWS ECS:
  - API: NestJS containerizado
  - DB: PostgreSQL managed (Railway / RDS)
  - Frontend: Static hosting (S3 + CloudFront / Vercel)
  - Storage: S3
  - AI: AWS Bedrock / SageMaker
```
