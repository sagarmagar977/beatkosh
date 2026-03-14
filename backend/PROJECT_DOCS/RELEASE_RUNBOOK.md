# BeatKosh Release Runbook

Last Updated: 2026-03-09

## 1. Pre-Release Checklist

1. Apply DB migrations.
2. Run backend test suite.
3. Run frontend lint and type-check.
4. Regenerate automation report.
5. Confirm tracker statuses in `PROJECT_DOCS/IMPLEMENTATION_TRACKER.md`.

## 2. Standard Commands

Backend:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py test
```

Frontend:

```powershell
cmd /c npm run lint
cmd /c npx tsc --noEmit
```

Automation:

```powershell
powershell -ExecutionPolicy Bypass -File PROJECT_DOCS\scripts\run_checks.ps1
```

## 3. High-Risk Functional Paths to Verify

1. Auth and role switching.
2. Producer draft upload wizard and publish.
3. Artist library (order history, downloads, recently played).
4. Activity feed (follows, likes, drops).
5. Payment lifecycle (`initiate -> confirm/webhook -> wallet settlement`).
6. Producer settings (plans, subscription, payout profile).
7. Resources center and article detail rendering.

## 4. API Smoke Endpoints

- `GET /api/v1/health/`
- `GET /api/v1/reference/beat22/`
- `GET /api/v1/beats/`
- `GET /api/v1/orders/history/` (auth)
- `GET /api/v1/analytics/drops/feed/` (auth)
- `GET /api/v1/resources/articles/`
- `GET /api/v1/payments/plans/`

## 5. Rollback Strategy

1. If release issue is app-level only:
   - revert application code to previous stable commit.
2. If migration causes issue:
   - deploy hotfix migration (forward-only preferred).
3. For payment path issues:
   - disable nonessential confirm path UI entry
   - keep webhook handler active and idempotent
   - reconcile affected payments manually from `Payment` and `Transaction` records.

## 6. Operational Notes

- `next build` can fail with `spawn EPERM` in local Windows policy-restricted environments; CI on Linux should be source of truth.
- Seed plans are created by migration `payments.0003_seed_default_plans`.
- Keep `PROJECT_DOCS/MASTER_EXECUTION_PLAN.md` and `IMPLEMENTATION_TRACKER.md` synced after every significant release.
