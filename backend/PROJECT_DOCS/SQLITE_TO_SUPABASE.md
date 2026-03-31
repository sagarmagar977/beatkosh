# SQLite to Supabase

Use this flow to move local Django metadata from `db.sqlite3` into a configured PostgreSQL database such as Supabase.

## 1. Export from SQLite

From the backend folder:

```powershell
.\PROJECT_DOCS\scripts\export_sqlite_fixture.ps1
```

This script forces Django to read from local SQLite even if `DATABASE_URL` exists in `.env`.

## 2. Verify the fixture

```powershell
Select-String -Path .\data-migration.json -Pattern '"model": "accounts.user"| "model": "beats.beat"| "model": "accounts.producerprofile"'
```

If that returns real app models, the fixture came from SQLite rather than an empty remote database.

## 3. Import into Supabase/Postgres

Make sure `.env` contains the target `DATABASE_URL` and that `FORCE_SQLITE` is not set in the current shell.

```powershell
.\PROJECT_DOCS\scripts\import_fixture_to_configured_db.ps1
```

Use `-SkipFlush` only if you intentionally want to merge into an existing database.

## Notes

- ImageKit stores media files, not relational metadata.
- Supabase stores relational metadata.
- Render should only be pointed at Supabase after the local import has been verified.
