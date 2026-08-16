# Tordo One

## Plataforma de Excelencia Operacional para Agroindustria y Manufactura

Tordo One es una plataforma SaaS que digitaliza, controla y optimiza las operaciones de plantas agroindustriales y manufactureras. Centraliza en una única plataforma: Operaciones, Seguridad Industrial (HSE), Calidad, Mantenimiento, Auditorías, CAPA, Analítica e Inteligencia Artificial.

---

## Tabla de contenidos

1. [Problema de negocio](#problema-de-negocio)
2. [Objetivos](#objetivos)
3. [Arquitectura organizacional](#arquitectura-organizacional)
4. [Módulos funcionales](#módulos-funcionales)
5. [Integraciones](#integraciones)
6. [Arquitectura técnica](#arquitectura-técnica)
7. [Estructura del repositorio](#estructura-del-repositorio)
8. [Levantar con Docker](#levantar-con-docker)
9. [Desarrollo local](#desarrollo-local)
10. [Variables de entorno](#variables-de-entorno)

---

## Problema de negocio

Las organizaciones gestionan procesos críticos con Excel, correo, WhatsApp y formularios físicos. Esto genera:

- Falta de trazabilidad
- Información dispersa
- Retrasos en la toma de decisiones
- Duplicidad de datos y pérdida de evidencias
- Hallazgos sin seguimiento
- Riesgos de auditoría e incremento de incidentes

---

## Objetivos

- Centralizar la gestión integral de operaciones industriales
- Mejorar la trazabilidad operacional
- Reducir riesgos y tiempos de respuesta
- Automatizar flujos de aprobación
- Facilitar auditorías internas y externas
- Integrar con ERP corporativos (SAP, Odoo)
- Generar indicadores en tiempo real
- Aplicar IA para clasificación y análisis automático

---

## Arquitectura organizacional

```
Tenant (SaaS)
 └── Empresa
      └── Región
           └── Planta
                └── Área
                     └── Línea de Producción
                          └── Centro de Trabajo
```

---

## Módulos funcionales

| # | Módulo | Descripción |
|---|--------|-------------|
| 1 | Gestión Operacional | Bitácoras, rondas, turnos, checklists, inspecciones |
| 2 | Hallazgos Operacionales | Incidentes, condiciones inseguras, no conformidades, near miss |
| 3 | Gestión CAPA | Acciones correctivas/preventivas, análisis causa raíz, 5 Why, Ishikawa |
| 4 | Seguridad Industrial (HSE) | Accidentes, riesgos, EPP, matriz IPERC |
| 5 | Calidad | Inspecciones de calidad, defectos, lotes, liberación de producto |
| 6 | Mantenimiento | Activos, equipos, órdenes de trabajo, preventivo/correctivo/predictivo |
| 7 | Auditorías | Auditorías ISO/BRC/HACCP, hallazgos, planes de acción |
| 8 | Workflow Engine | Flujos configurables, aprobaciones multinivel, SLA |
| 9 | Analytics & KPIs | Dashboards, indicadores operacionales en tiempo real |
| 10 | Inteligencia Artificial | Clasificación automática, análisis de imágenes, predicción de riesgos |

> Detalle completo en [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md)

---

## Integraciones

| Sistema | Módulos | Casos de uso |
|---------|---------|--------------|
| **SAP** | PM, QM, EHS, HR | Órdenes de mantenimiento, notificaciones de calidad, sincronizar personal y activos |
| **Odoo** | Maintenance, Quality, Employees, Inventory | Sincronizar empleados, equipos, crear OTs, sincronizar productos |
| **Microsoft** | Azure AD, Teams, Power BI | SSO, notificaciones, reportes |
| **Google** | Workspace, Maps, Drive | SSO, geolocalización, almacenamiento |

---

## Arquitectura técnica

### Stack

| Capa | Tecnología | Versión |
|------|------------|---------|
| Frontend | Angular standalone | 19 |
| Backend | NestJS + TypeORM | 11 |
| Base de datos | PostgreSQL | 16 |
| Contenedores | Docker Compose + nginx | — |
| Exportación | ExcelJS + PDFKit | — |
| Storage | PHP bridge (GoDaddy) → futuro S3 | — |

### Multi-Tenant

```
Tenant
 └── Company
      └── Plant
           └── Area
                └── ProductionLine
```

Cada cliente opera de manera aislada. El aislamiento se implementa a nivel de esquema/row con `tenantId` en todas las entidades.

### Modelo de datos principal

```
Tenant, Company, Plant, Area, ProductionLine
User, Role, Permission
OperationalFinding, FindingEvidence, FindingComment
Checklist, Inspection
Audit, AuditFinding
CapaCase, CorrectiveAction, PreventiveAction
Asset, Equipment, WorkOrder
QualityInspection, NonConformity, Batch
RiskAssessment, Hazard
Workflow, Approval
Notification, Dashboard, Kpi
Attachment, AuditLog
Integration, ExternalReference
AiAnalysis
```

> Detalle de arquitectura en [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Estructura del repositorio

```
tordo.one/
├── apps/
│   ├── front/              # Angular 19 — SPA
│   │   └── src/app/
│   │       ├── core/       # guards, interceptors, servicios base
│   │       ├── features/   # páginas por dominio
│   │       ├── layout/     # app-shell (nav + sidebar)
│   │       └── shared/     # utilidades compartidas
│   └── back/               # NestJS 11 — API REST /api
│       └── src/app/
│           ├── controller/ # controladores REST
│           ├── service/    # lógica de negocio
│           ├── entity/     # entidades TypeORM
│           ├── mapper/     # transformación DTO ↔ entidad
│           └── module/     # módulos NestJS por dominio
├── godaddy-php/            # PHP bridge para imágenes (temporal)
├── scripts/                # scripts de deploy
├── .github/workflows/      # CI/CD
├── infra/                  # docker-compose.yml
├── docs/                   # documentación del producto y arquitectura
└── README.md
```

---

## Levantar con Docker

```powershell
Copy-Item infra\.env.example infra\.env
# Ajustar variables en infra/.env
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build
```

| Servicio | URL |
|----------|-----|
| Angular UI | http://localhost:8080 |
| API | http://localhost:3001/api/health |
| Swagger | http://localhost:3001/api-docs |

Para semilla de datos demo: `SEED_ON_BOOT=true` en `infra/.env`.

---

## Desarrollo local

```powershell
# Postgres en Docker
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d postgres

# Backend
cd apps/back
npm install
npm run start:dev

# Frontend
cd apps/front
npm install
npm start
```

---

## Variables de entorno

### `infra/.env`

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DATABASE_USER` | `tordo` | Usuario Postgres |
| `DATABASE_PASSWORD` | `tordo` | Contraseña Postgres |
| `DATABASE_NAME` | `tordo_one` | Nombre de la base de datos |
| `API_PORT` | `3001` | Puerto del API |
| `WEB_PORT` | `8080` | Puerto del frontend |
| `TYPEORM_SYNC` | `false` | Sincronizar esquema (solo dev) |
| `SEED_ON_BOOT` | `false` | Cargar datos demo |
| `CORS_ORIGIN` | `http://localhost:4200` | Orígenes permitidos |

### Backend (`apps/back/.env`)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión Postgres |
| `JWT_SECRET` | Secreto para tokens |
| `GODADDY_PHP_UPLOAD_URL` | URL del bridge PHP |
| `GODADDY_UPLOAD_SECRET` | Token del bridge |

---

## Propuesta de valor

Tordo One permite a las organizaciones:

- Centralizar operaciones en una sola plataforma
- Mejorar trazabilidad y reducir riesgos
- Incrementar cumplimiento normativo (ISO, BRC, HACCP)
- Automatizar acciones correctivas y flujos de aprobación
- Integrarse con SAP y Odoo sin reemplazar sistemas existentes
- Obtener indicadores en tiempo real
- Incorporar Inteligencia Artificial en la operación diaria

---

## Licencia

Propietario — Todos los derechos reservados.
