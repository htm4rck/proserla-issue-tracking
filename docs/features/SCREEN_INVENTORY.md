# Issue Tracking — Screen Inventory (Web App + Admin)

> **Canonical source** of all MVP screens.
> Update status (`✅` `⚠️` `❌`) as implementation evolves.
> Functional scope reference: [README.md](../../README.md)

---

## Web App (Angular) — `apps/front/`

| ID | Screen | Description | File | API consumed | Status |
|----|--------|-------------|------|--------------|--------|
| **W01** | Login | Email/password access and role-based redirect | `src/app/features/auth/login.page.ts` | ✅ `POST /api/auth/login` | ✅ |
| **W02** | Main dashboard | Global KPI cards: open, in progress, closed, compliance | `src/app/features/dashboard/dashboard.page.ts` | ✅ `GET /api/incidents`, ✅ `GET /api/reports/summary` | ✅ |
| **W03** | Leader dashboard | Area/leader-focused KPI dashboard | `src/app/features/dashboard/leader-dashboard.page.ts` | ✅ `GET /api/reports/summary?leaderCode=...&areaCode=...` | ✅ |
| **W04** | Incident list | Table with filters (status, area, month, year, risk, assignee) | `src/app/features/incidents/incident-list.page.ts` | ✅ `GET /api/incidents` | ✅ |
| **W05** | New incident | Incident registration form with required fields | `src/app/features/incidents/incident-create.page.ts` | ✅ `POST /api/incidents` | ✅ |
| **W06** | Incident detail | Full detail, status, timeline, evidence, comments | `src/app/features/incidents/incident-detail.page.ts` | ✅ `GET /api/incidents/:incidentCode`, ✅ `GET /api/incident-images/:incidentCode`, ✅ `GET /api/incident-comments/:incidentCode`, ✅ `GET /api/incident-status-history/:incidentCode` | ✅ |
| **W07** | Incident status update | Change status open → in_progress → closed with validation | `src/app/features/incidents/incident-status.page.ts` | ✅ `POST /api/incident-status-history` | ✅ |
| **W08** | Incident evidence upload | Upload initial/closure images and preview gallery | `src/app/features/incidents/incident-images.page.ts` | ✅ `POST /api/incident-images`, ✅ `GET /api/incident-images/:incidentCode` | ✅ |
| **W09** | Incident comments | Add and list operational/closure comments | `src/app/features/incidents/incident-comments.page.ts` | ✅ `POST /api/incident-comments`, ✅ `GET /api/incident-comments/:incidentCode` | ✅ |
| **W10** | Users management | Create/list users with role, area, leader and active state | `src/app/features/users/user-list.page.ts` | ✅ `GET /api/users`, ✅ `POST /api/users` | ✅ |
| **W11** | Roles management | Role catalog list and create | `src/app/features/security/roles.page.ts` | ✅ `GET /api/roles`, ✅ `POST /api/roles` | ✅ |
| **W12** | Areas management | Area catalog list and create | `src/app/features/organization/areas.page.ts` | ✅ `GET /api/areas`, ✅ `POST /api/areas` | ✅ |
| **W13** | Leaders management | Leader catalog list and create | `src/app/features/organization/leaders.page.ts` | ✅ `GET /api/leaders`, ✅ `POST /api/leaders` | ✅ |
| **W14** | Catalog management | Generic catalog items (incident types, risk levels, etc.) | `src/app/features/catalogs/catalog-items.page.ts` | ✅ `GET /api/catalog-items`, ✅ `POST /api/catalog-items` | ✅ |
| **W15** | Reports center | Filterable reports and export triggers (Excel/PDF) | `src/app/features/reports/reports.page.ts` | ✅ `GET /api/reports/summary`, ✅ `GET /api/reports/export.csv` | ✅ |
| **W16** | Control panel | Dynamic filters by leader/month/year/state/type/risk | `src/app/features/control-panel/control-panel.page.ts` | ✅ `GET /api/incidents?status=...&areaCode=...&leaderCode=...` | ✅ |

### Web summary

| Status | Count |
|--------|-------|
| ✅ Implemented | 16 |
| ⚠️ Placeholder | 0 |
| ❌ Missing | 0 |

---

## External Upload Screen (GoDaddy PHP)

| ID | Screen/Endpoint | Description | File | Consumed by | Status |
|----|------------------|-------------|------|-------------|--------|
| **X01** | Image upload bridge | Receives multipart image (`report`/`closure`) by incident code and returns URL | `godaddy-php/upload.php` | NestJS image flow / optional direct integration | ✅ |

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-24 | Initial screen inventory for issue-tracking web app |
| 2026-04-24 | API consumed column now shows endpoint availability (`✅` exists, `❌` missing) |
| 2026-04-24 | Screens and APIs marked implemented for test-ready baseline |
