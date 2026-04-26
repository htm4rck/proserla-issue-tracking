# 000 — Phase rollout plan

Recommended order to close gaps with low rework risk.

---

## Phase 0 — Stabilize baseline

- [ ] Freeze naming conventions and folder conventions.
- [ ] Confirm API inventory vs screen inventory mapping.
- [ ] Lock docker runtime as default local execution path.

## Phase 1 — Data and auth foundation

- [ ] Migration baseline + constraints.
- [ ] Auth login + JWT + role guards.
- [ ] Seed minimum data for roles/areas/leaders.

## Phase 2 — Incident operational core

- [ ] Incidents create/list/detail.
- [ ] Status transitions + history.
- [ ] Comments flow.
- [ ] Evidence upload integration (Nest -> PHP bridge).

## Phase 3 — Admin masters

- [ ] Users management.
- [ ] Roles/areas/leaders management.
- [ ] Catalog management.

## Phase 4 — Dashboards and reports

- [ ] Main dashboard KPIs.
- [ ] Leader dashboard metrics.
- [ ] Reports center + exports.

## Phase 5 — Hardening and release

- [ ] E2E regression tests.
- [ ] Performance tuning for filters/reports.
- [ ] CI/CD full green and release checklist.

---

## Exit criteria per phase

| Phase | Exit criteria |
|------|----------------|
| 0 | Team agrees on architecture and inventory truth |
| 1 | Auth + DB migrations running in all environments |
| 2 | Core incident workflow operational end-to-end |
| 3 | Admin configuration screens usable |
| 4 | Decision dashboards and exports available |
| 5 | Release candidate stable and documented |

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-24 | Initial phased rollout plan |
