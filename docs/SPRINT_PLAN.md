# Tordo One — Plan de Ejecución por Sprints

> Documento complementario: [AUTH_FACTORIZATION.md](./AUTH_FACTORIZATION.md) — Estrategia de factorización de auth entre tordo, aquila, birdport y tordo.one.

---

## Análisis de Reutilización

### Proyecto `tordo` (apps/auth + libs/auth)

| Componente | Reutilizable | Acción |
|------------|:---:|--------|
| `libs/auth` — Entidades: User, Role, Permission, Element, Feature, License, UserBusiness, Session | ✅ | Copiar como base. Agregar `tenantId` y adaptar schema de `auth` a `public` |
| `libs/auth` — JWT Strategy (RS256, JWKS, session validation) | ✅ | Reutilizar directamente. Soporta clave pública local y JWKS remoto |
| `libs/auth` — Guards (JwtAuthGuard, JwtJwksAuthGuard) | ✅ | Reutilizar sin cambios |
| `libs/auth` — Decorators (CurrentUser, CurrentCompany) | ✅ | Extender con `@CurrentTenant()` |
| `libs/commons` — ApiResponse, filters, bootstrap, audit entities | ✅ | Copiar patrón ApiResponse y filters |
| `apps/auth` — AuthController (login, set-password, validate-username) | ✅ | Adaptar a monolito Tordo One (eliminar microservicio, integrar en módulo auth) |
| `apps/auth` — AuthService (login con validación de licencia/business) | ✅ | Simplificar: eliminar licencias SaaS-comercial, mantener lógica de sesión y JWT |
| `apps/auth` — CRUD Users, Roles, Permissions, Elements | ✅ | Reutilizar completo |
| Modelo multi-business (UserBusiness) | ✅ | Mapear a multi-tenant: `UserBusiness` → `UserTenant` |
| `libs/commons` — DatabaseConnectionManager dinámico | ❌ | No aplica — Tordo One usa una sola DB con row-level isolation |
| Licencias comerciales (License, LicenseEntitlement) | ❌ | No aplica para v1 — es un modelo de licenciamiento de otro producto |
| RabbitMQ / Microservicios | ❌ | No aplica — Tordo One es monolito NestJS |

### Proyecto `aquila` (Frontend Angular)

| Componente | Reutilizable | Acción |
|------------|:---:|--------|
| `features/auth-admin/users` — CRUD completo de usuarios | ✅ | Copiar y adaptar a Tordo One (cambiar servicio API, quitar licencias) |
| `features/auth-admin/roles` — Lista y CRUD de roles | ✅ | Copiar directo |
| `features/auth-admin/permissions` — Árbol de permisos con checkbox | ✅ | Copiar directo — es un manager de permisos genérico |
| `features/auth-admin/elements` — CRUD de elementos UI | ✅ | Copiar directo |
| `core/auth/login` — Componente de login | ✅ | Adaptar (remover validación de licencia en frontend) |
| `core/services/auth.service` — Servicio de autenticación | ✅ | Adaptar endpoint URLs |
| `core/services/auth-admin.service` — Servicio admin de usuarios | ✅ | Copiar y adaptar |
| Material Design + tema | ✅ | Reutilizar estilo y configuración |

---

## Plan de Sprints

### Sprint 0 — Fundaciones (2 semanas)

**Objetivo:** Establecer la base del proyecto con multi-tenancy, auth reutilizado y estructura modular.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Crear entidades base: `Tenant`, `Company`, `Plant`, `Area`, `ProductionLine`, `WorkCenter` | Nuevo |
| 2 | Crear `TenantBaseEntity` abstracta con `tenantId`, `createdAt`, `updatedAt` | Nuevo |
| 3 | Crear `TenantGuard` (middleware que extrae tenant del JWT y lo inyecta en request) | Nuevo |
| 4 | Migrar entidades de auth: `User`, `Role`, `Permission`, `Element`, `Feature`, `Session` desde `libs/auth` | Desde `tordo` |
| 5 | Agregar `tenantId` a User y vincular User ↔ Company ↔ Plant | Adaptación |
| 6 | Migrar `AuthController` (login, set-password) desde `apps/auth` | Desde `tordo` |
| 7 | Migrar `JwtStrategy` + `JwtAuthGuard` + `CurrentUser` decorator | Desde `tordo` |
| 8 | Simplificar AuthService: eliminar licencias, mantener sesión + JWT RS256 | Adaptación |
| 9 | Crear módulo `organization` (CRUD Plant, Area, ProductionLine) | Nuevo |
| 10 | Seed service con datos demo (1 tenant, 1 company, 1 plant, áreas, usuarios) | Nuevo |
| 11 | Swagger + Health endpoint | Existente en tordo.one |

**Entregable:** Login funcional, JWT multi-tenant, CRUD organizacional, seed de datos.

---

### Sprint 1 — Admin de Usuarios (2 semanas)

**Objetivo:** Panel completo de administración de usuarios, roles y permisos.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Backend: CRUD Users con filtro por tenant/company | Desde `tordo` apps/auth |
| 2 | Backend: CRUD Roles + Permissions + Elements | Desde `tordo` apps/auth |
| 3 | Backend: Bulk permissions (add/remove masivo) | Desde `tordo` apps/auth |
| 4 | Frontend: Migrar `user-list` + `user-dialog` + `password-dialog` desde aquila | Desde `aquila` |
| 5 | Frontend: Migrar `role-list` + `role-dialog` desde aquila | Desde `aquila` |
| 6 | Frontend: Migrar `permission-manager` (árbol de permisos) desde aquila | Desde `aquila` |
| 7 | Frontend: Migrar `element-dialog` desde aquila | Desde `aquila` |
| 8 | Frontend: Login page adaptada (sin licencia) | Desde `aquila` |
| 9 | Frontend: App shell con sidebar por permisos del usuario | Existente tordo.one + aquila |
| 10 | Integrar guard de permisos en rutas Angular | Nuevo |

**Entregable:** Administración completa de usuarios/roles/permisos funcional.

---

### Sprint 2 — Gestión Operacional (2 semanas)

**Objetivo:** Bitácoras, turnos, checklists base.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `Shift`, `ShiftHandover`, `OperationLog` | Nuevo |
| 2 | Entidades: `ChecklistTemplate`, `Checklist`, `ChecklistItem` | Adaptación del existente |
| 3 | Backend: CRUD Shifts + handover | Nuevo |
| 4 | Backend: CRUD Checklist templates + ejecución | Adaptación |
| 5 | Frontend: Página de turnos activos | Nuevo |
| 6 | Frontend: Ejecución de checklist (formulario dinámico) | Adaptación del existente |
| 7 | Frontend: Dashboard operacional básico (turnos del día, checklists pendientes) | Nuevo |

**Entregable:** Módulo operacional base con turnos y checklists.

---

### Sprint 3 — Hallazgos Operacionales (2 semanas)

**Objetivo:** Sistema de hallazgos con clasificación, evidencias y seguimiento.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `OperationalFinding`, `FindingType`, `FindingCategory`, `FindingStatus`, `FindingPriority` | Nuevo (reemplaza inspection actual) |
| 2 | Entidades: `FindingEvidence`, `FindingComment`, `FindingHistory`, `FindingAssignment` | Nuevo |
| 3 | Backend: CRUD Hallazgos con filtros (planta, área, tipo, estado, prioridad) | Nuevo |
| 4 | Backend: Upload de evidencias (fotos) con servicio de storage | Adaptación del existente |
| 5 | Backend: Historial automático (cada cambio de estado genera registro) | Nuevo |
| 6 | Frontend: Lista de hallazgos con filtros y chips de estado | Nuevo |
| 7 | Frontend: Formulario de creación/edición con upload de fotos | Adaptación |
| 8 | Frontend: Timeline de comentarios e historial | Nuevo |
| 9 | Migrar datos de `inspection` actual a nuevo modelo `OperationalFinding` | Migration SQL |

**Entregable:** Módulo de hallazgos completo con evidencias y trazabilidad.

---

### Sprint 4 — CAPA + Workflow básico (2 semanas)

**Objetivo:** Acciones correctivas/preventivas con flujo de aprobación simple.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `CapaCase`, `RootCauseAnalysis`, `CorrectiveAction`, `PreventiveAction`, `ActionTask` | Nuevo |
| 2 | Entidades: `Workflow`, `WorkflowStep`, `WorkflowInstance`, `Approval` | Nuevo |
| 3 | Backend: CRUD CAPA vinculado a hallazgo | Nuevo |
| 4 | Backend: Workflow engine básico (crear instancia, avanzar paso, aprobar/rechazar) | Nuevo |
| 5 | Backend: Vincular hallazgo → CAPA → workflow | Nuevo |
| 6 | Frontend: Formulario CAPA (5 Why, acciones, responsables, fechas) | Nuevo |
| 7 | Frontend: Panel de aprobaciones pendientes | Nuevo |
| 8 | Frontend: Vista de seguimiento de acciones | Nuevo |

**Entregable:** Ciclo completo hallazgo → CAPA → aprobación.

---

### Sprint 5 — Auditorías + Calidad (2 semanas)

**Objetivo:** Módulos de auditoría y calidad básicos.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `Audit`, `AuditQuestion`, `AuditAnswer`, `AuditFinding`, `AuditEvidence`, `AuditActionPlan` | Nuevo |
| 2 | Entidades: `Product`, `Batch`, `QualityInspection`, `NonConformity`, `Defect` | Nuevo |
| 3 | Backend: CRUD Auditorías con preguntas configurables | Nuevo |
| 4 | Backend: Vincular AuditFinding → CAPA | Nuevo |
| 5 | Backend: CRUD Inspecciones de calidad por lote | Nuevo |
| 6 | Frontend: Ejecución de auditoría (formulario paso a paso) | Nuevo |
| 7 | Frontend: Lista de no conformidades | Nuevo |
| 8 | Frontend: Dashboard de calidad | Nuevo |

**Entregable:** Módulos de auditoría y calidad funcionales.

---

### Sprint 6 — HSE + Mantenimiento (2 semanas)

**Objetivo:** Seguridad industrial y gestión de activos.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `Hazard`, `RiskAssessment`, `Accident`, `Incident`, `NearMiss`, `PPEControl` | Nuevo |
| 2 | Entidades: `Asset`, `Equipment`, `WorkOrder`, `MaintenancePlan`, `MaintenanceTask` | Nuevo |
| 3 | Backend: CRUD Eventos HSE + Matriz de riesgo | Nuevo |
| 4 | Backend: CRUD Activos + Órdenes de trabajo | Nuevo |
| 5 | Backend: Plan de mantenimiento preventivo (scheduling) | Nuevo |
| 6 | Frontend: Registro de accidentes/incidentes | Nuevo |
| 7 | Frontend: Gestión de activos y OTs | Nuevo |
| 8 | Frontend: Calendario de mantenimiento | Nuevo |

**Entregable:** Módulos HSE y mantenimiento operativos.

---

### Sprint 7 — Analytics + KPIs (2 semanas)

**Objetivo:** Dashboards con indicadores en tiempo real.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `Dashboard`, `KpiDefinition`, `KpiResult`, `Metric` | Nuevo |
| 2 | Backend: Endpoints de agregación (hallazgos por planta/área/mes, CAPA vencidos, etc.) | Nuevo |
| 3 | Backend: KPIs de mantenimiento (MTTR, MTBF, disponibilidad) | Nuevo |
| 4 | Backend: KPIs de seguridad (índice frecuencia, severidad) | Nuevo |
| 5 | Frontend: Dashboard principal con gráficos (Chart.js o ng2-charts) | Nuevo |
| 6 | Frontend: Dashboard por módulo (operaciones, calidad, HSE, mantenimiento) | Nuevo |
| 7 | Backend: Exportación Excel/PDF de reportes | Adaptación del existente |

**Entregable:** Plataforma con visibilidad analítica completa.

---

### Sprint 8 — Integraciones + IA (2 semanas)

**Objetivo:** Conectores ERP y funcionalidades de IA.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Entidades: `Integration`, `ExternalReference`, `AiAnalysis`, `AiClassification` | Nuevo |
| 2 | Backend: Adapter pattern para SAP (crear OT, sincronizar activos) | Nuevo |
| 3 | Backend: Adapter pattern para Odoo (sincronizar empleados, equipos) | Nuevo |
| 4 | Backend: Integración con IA — clasificación automática de hallazgos | Nuevo |
| 5 | Backend: Análisis de imagen (AWS Rekognition o Bedrock) | Nuevo |
| 6 | Frontend: Panel de integraciones (status, última sincronización) | Nuevo |
| 7 | Frontend: Sugerencias IA en formulario de hallazgos | Nuevo |

**Entregable:** Plataforma integrada con ERP y capacidades de IA.

---

### Sprint 9 — Notificaciones + Pulido + Deploy (2 semanas)

**Objetivo:** Notificaciones, UX final y despliegue productivo.

| # | Tarea | Origen |
|---|-------|--------|
| 1 | Backend: Sistema de notificaciones (in-app + email) | Nuevo |
| 2 | Backend: Escalamientos automáticos (SLA vencidos) | Nuevo |
| 3 | Backend: AuditLog completo (quién, qué, cuándo, diff) | Adaptación |
| 4 | Frontend: Centro de notificaciones | Nuevo |
| 5 | Frontend: Mejoras UX (responsive, accesibilidad, loading states) | Nuevo |
| 6 | Migrar storage a S3 + CloudFront | Nuevo |
| 7 | CI/CD pipeline (GitHub Actions → Railway/AWS) | Adaptación del existente |
| 8 | Documentación de API (Swagger completo) | Nuevo |
| 9 | Testing E2E de flujos críticos | Nuevo |

**Entregable:** Plataforma lista para producción.

---

## Resumen de Timeline

| Sprint | Módulo | Semanas | Acumulado |
|--------|--------|:-------:|:---------:|
| 0 | Fundaciones + Auth | 2 | 2 |
| 1 | Admin Usuarios | 2 | 4 |
| 2 | Gestión Operacional | 2 | 6 |
| 3 | Hallazgos | 2 | 8 |
| 4 | CAPA + Workflow | 2 | 10 |
| 5 | Auditorías + Calidad | 2 | 12 |
| 6 | HSE + Mantenimiento | 2 | 14 |
| 7 | Analytics + KPIs | 2 | 16 |
| 8 | Integraciones + IA | 2 | 18 |
| 9 | Notificaciones + Deploy | 2 | 20 |

**Total estimado: 20 semanas (~5 meses)**

---

## MVP Recomendado (Sprints 0–4)

Para un lanzamiento temprano, los primeros 5 sprints (10 semanas) entregan:

- ✅ Auth multi-tenant completo
- ✅ Administración de usuarios/roles/permisos
- ✅ Gestión operacional (turnos, checklists)
- ✅ Hallazgos operacionales con evidencias
- ✅ CAPA con workflow de aprobación

Esto cubre el **80% del valor** para un primer cliente piloto.

---

## Notas de Migración

### Archivos a copiar desde `tordo`

```
libs/auth/src/entity/         → apps/back/src/app/modules/auth/entity/
libs/auth/src/jwt/            → apps/back/src/app/modules/auth/jwt/
libs/auth/src/decorators/     → apps/back/src/app/modules/auth/decorators/
libs/auth/src/mapper/         → apps/back/src/app/modules/auth/mapper/
apps/auth/src/app/controller/ → apps/back/src/app/modules/auth/controller/
apps/auth/src/app/service/    → apps/back/src/app/modules/auth/service/
```

### Archivos a copiar desde `aquila`

```
features/auth-admin/users/       → apps/front/src/app/features/admin/users/
features/auth-admin/roles/       → apps/front/src/app/features/admin/roles/
features/auth-admin/permissions/ → apps/front/src/app/features/admin/permissions/
features/auth-admin/elements/    → apps/front/src/app/features/admin/elements/
core/auth/login/                 → apps/front/src/app/features/auth/login/
core/services/auth.service.ts    → apps/front/src/app/core/services/auth.service.ts
core/services/auth-admin.service → apps/front/src/app/core/services/auth-admin.service.ts
```

### Archivos que NO se copian (específicos de otros productos)

```
❌ tordo/libs/auth/entity/license.entity.ts           — solo ERP
❌ tordo/libs/auth/entity/license-entitlement.entity   — solo ERP
❌ tordo/libs/auth/entity/customer-user.entity.ts      — solo birdport
❌ tordo/libs/auth/service/customer-auth/              — solo birdport
❌ birdport/libs/auth/guards/dual-auth.guard.ts        — solo ecommerce
❌ aquila/features/auth-admin/licenses/                — solo ERP
```

### Adaptaciones requeridas

1. **Eliminar `schema: 'auth'`** de todas las entidades (usar schema `public` o por tenant)
2. **Agregar `tenantId`** a User, Role, Permission, Element
3. **Eliminar dependencia de License** del flujo de login
4. **Reemplazar `businessCode`** por `tenantId` + `companyId`
5. **Eliminar `DatabaseConnectionManager` dinámico** — usar una sola conexión TypeORM
6. **Adaptar servicios Angular** para apuntar a `/api/auth/*` en vez de microservicio separado
7. **Usar misma clave RSA** que tordo/apps/auth (para futura interoperabilidad)

---

## Estrategia de Factorización (Futuro Post-MVP)

Después del MVP, se extraerán dos librerías compartidas:

| Librería | Contenido | Consumidores |
|----------|-----------|-------------|
| `@arc/auth-core` | Entidades, JWT, Guards, Decorators (backend) | tordo, birdport, tordo.one |
| `@arc/ui-auth` | Login, User CRUD, Roles, Permissions (frontend) | aquila, birdport/admin, tordo.one |

Detalle completo en [AUTH_FACTORIZATION.md](./AUTH_FACTORIZATION.md)
