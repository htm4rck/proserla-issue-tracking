# 000 — Gap closure plan (Issue Tracking)

> **Purpose:** convert current repository baseline (Docker + backend objects + partial API) into a usable MVP for incident operations.
> **Scope source:** [README.md](../../../README.md), [SCREEN_INVENTORY.md](../SCREEN_INVENTORY.md).

**Detailed plan (checklists + owners + DoD):** [01-gap-closure-checklist.md](./01-gap-closure-checklist.md).

**Execution sequence by phase:** [02-phase-rollout-plan.md](./02-phase-rollout-plan.md).

---

## Current baseline (today)

| Piece | Status | Notes |
|------|--------|-------|
| Docker local stack (`infra`) | ✅ | API + web + postgres runtime available |
| Backend object model | ✅ Partial | Core entities/services/controllers created |
| API coverage for inventory | ✅ Mostly | Missing auth/login and report/export endpoints |
| Angular feature screens | ❌ | Only shell + health indicator |
| RBAC/authentication | ❌ | No JWT/session flow yet |
| Reports / exports | ❌ | Excel/PDF endpoints missing |
| Migrations / relational constraints | ❌ | Auto entity loading only; no migration strategy yet |

---

## Definition of done (000 package)

- [ ] MVP screens W01–W10 from inventory are implemented and integrated.
- [ ] API endpoints used by W01–W10 are available, tested, and documented.
- [ ] Database schema is migration-driven (no production sync mode).
- [ ] Role-based access restrictions are enforced for Admin/Leader/Operator.
- [ ] Evidence upload flow supports `report` and `closure` images per incident code.
- [ ] Monthly and filtered reports have at least one export format (Excel or PDF).
- [ ] Docker stack runs with `up --build` and a smoke test script passes.

---

## Changelog

| Date | Note |
|------|------|
| 2026-04-24 | Initial 000 package for full MVP gap planning |
