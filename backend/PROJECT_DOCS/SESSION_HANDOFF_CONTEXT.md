# BeatKosh Session Handoff Context

Last Updated: 2026-03-09

## Purpose

This file makes continuation easy in any new session.  
Use this first before starting new work.

## Read Order (Always)

1. `PROJECT_DOCS/MASTER_EXECUTION_PLAN.md`
2. `PROJECT_DOCS/IMPLEMENTATION_TRACKER.md`
3. `PROJECT_DOCS/PRD_BEAT22_ALIGNMENT.md`
4. `DOCS/prd.md` and `DOCS/design.md` (baseline context)

## Current Truth Snapshot

- Beat22 reference integration is implemented:
  - backend reference APIs
  - reference-based frontend pages
- Core backend/frontend baseline exists across marketplace, payments, projects, and verification.
- `C1` download history and artist library is now implemented.
- `D1` upload wizard is now implemented (draft media + metadata + license + publish).
- `C3` resources/tutorial/blog/FAQ is now implemented.
- `D3` subscription/pro plan/payout settings is now implemented.
- `C2` likes/follows/drops feed is now implemented.
- `E1`, `E2`, and `E3` hardening/documentation tracks are now implemented.
- Current execution plan is complete; next work should start as a new enhancement phase.

## How To Resume Implementation

1. Confirm active task in `IMPLEMENTATION_TRACKER.md`.
2. Build backend model + serializer + API for the task.
3. Build frontend route/components for the same task.
4. Add tests.
5. Update tracker statuses and activity log.
6. Move to next queue item from `MASTER_EXECUTION_PLAN.md`.

## Quick Validation Commands

Full automation run:

```powershell
powershell -ExecutionPolicy Bypass -File PROJECT_DOCS\scripts\run_checks.ps1
```

Backend tests:

```powershell
.\.venv\Scripts\python.exe manage.py test
```

Frontend lint:

```powershell
cmd /c npm run lint
```

Frontend type-check:

```powershell
cmd /c npx tsc --noEmit
```

## Notes for Future Sessions

- In this environment, `npm run build` may fail with `spawn EPERM` due to local OS policy.  
  Treat lint + type-check + backend tests as the reliable baseline checks unless build permissions are fixed.
- `reference resource/beat22` is the design parity source for artist/producer UX alignment.
