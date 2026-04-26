# 000 — Full gap closure checklist

This document tracks **all remaining gaps** to move from current baseline to operational MVP.

---

## 1) Architecture and data model hardening

### 1.1 Database migration baseline

- [ ] Introduce migration tooling (`typeorm migration:*` workflow).
- [ ] Create initial migration with tables:
  - [ ] `roles`
  - [ ] `areas`
  - [ ] `leaders`
  - [ ] `users`
  - [ ] `incidents`
  - [ ] `incident_images`
  - [ ] `incident_status_history`
  - [ ] `incident_comments`
  - [ ] `catalog_items`
- [ ] Add unique/index constraints for frequent filters (`incident_code`, `status`, `area_code`, `leader_code`, `created_at`).
- [ ] Add FK constraints where applicable (`users.role_code`, `users.area_code`, incident references).
- [ ] Disable schema sync in all non-local environments.

### 1.2 Domain consistency

- [ ] Define canonical enum values for status/type/risk/comment/image-type.
- [ ] Align API payload fields with screen inventory filters (`month`, `year`, `state`, `potential`, `type`).
- [ ] Add audit fields where needed (`created_by`, `updated_by`, `closed_by`).

---

## 2) Backend gaps (API)

### 2.1 Authentication and authorization

- [ ] `POST /api/auth/login` (W01) implemented.
- [ ] JWT issuance + validation middleware/guard.
- [ ] Role guard (Admin, Leader, Operator).
- [ ] Endpoint-level restrictions:
  - [ ] Leader scoped to own area.
  - [ ] Operator scoped to own records (or assigned permissions).

### 2.2 Incident lifecycle

- [ ] Incident creation validation for required business fields.
- [ ] Controlled transition rules `open -> in_progress -> closed`.
- [ ] Closure rule enforcement:
  - [ ] closure comment required
  - [ ] optional/required closure evidence toggle
- [ ] Status change endpoint writes `incident_status_history` atomically.

### 2.3 Catalog and organization APIs

- [ ] Roles CRUD completion (currently basic create/list).
- [ ] Areas CRUD completion.
- [ ] Leaders CRUD completion.
- [ ] Catalog items by type endpoint (`GET /api/catalog-items?catalogType=...`).

### 2.4 Reports and exports

- [ ] Aggregation endpoint(s) for dashboard KPIs.
- [ ] Monthly leader/area report endpoint.
- [ ] Open / in-progress / closed report endpoints.
- [ ] Compliance % endpoint.
- [ ] Export endpoint(s):
  - [ ] Excel export
  - [ ] PDF export (or planned phase if deferred)

### 2.5 Quality and observability

- [ ] Add integration tests per critical endpoint group.
- [ ] Add request logging/correlation ids.
- [ ] Add error normalization and business error codes.
- [ ] Add OpenAPI tags/schemas for all modules.

---

## 3) Frontend gaps (Angular)

### 3.1 Critical MVP screens

- [ ] W01 Login
- [ ] W04 Incident list
- [ ] W05 New incident
- [ ] W06 Incident detail
- [ ] W07 Incident status update
- [ ] W08 Incident evidence upload
- [ ] W10 Users management

### 3.2 Important screens

- [ ] W02 Main dashboard
- [ ] W03 Leader dashboard
- [ ] W12 Areas management
- [ ] W13 Leaders management
- [ ] W15 Reports center

### 3.3 Post-MVP / hardening

- [ ] W11 Roles management
- [ ] W14 Catalog management
- [ ] W16 Control panel advanced filters

### 3.4 Frontend technical quality

- [ ] Shared API client layer and typed models.
- [ ] Route guards by role.
- [ ] Global error handling and empty/loading states.
- [ ] Form-level validation matching backend rules.

---

## 4) File and evidence flow

### 4.1 Nest + GoDaddy PHP bridge integration

- [ ] Backend proxy endpoint to upload images (do not expose upload secret in frontend).
- [ ] Persist image metadata in `incident_images`:
  - [ ] `incident_code`
  - [ ] `image_type` (`report|closure`)
  - [ ] `url`
  - [ ] `storage_path`
  - [ ] uploader identity
- [ ] Validate image type assignment by screen flow.
- [ ] Add replacement/removal policy (if business allows).

### 4.2 Deployment automation

- [ ] Validate local deploy script for PHP bridge (`scripts/deploy-godaddy-php.ps1`).
- [ ] Validate GitHub Actions FTP deploy workflow with secrets.
- [ ] Add post-deploy smoke check for `upload.php` response contract.

---

## 5) DevOps and environments

- [ ] Create env matrix (`local`, `staging`, `prod`) for API/web/php bridge.
- [ ] Add CI pipeline for backend tests + lint + build.
- [ ] Add CI pipeline for frontend tests + lint + build.
- [ ] Add container image tagging/version policy.
- [ ] Add backup/restore procedure for postgres data.

---

## 6) Acceptance checklist (MVP release gate)

- [ ] End-to-end flow works: create incident -> upload evidence -> status progression -> close incident -> see in dashboard/report.
- [ ] Role restrictions verified with test users.
- [ ] At least one monthly report export is downloadable.
- [ ] API docs published and aligned with UI behavior.
- [ ] Smoke test script passes in dockerized local stack.

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-24 | Initial full-gap checklist |
