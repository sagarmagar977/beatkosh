$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent (Split-Path -Parent $scriptDir)
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
$fixturePath = Join-Path $backendDir "data-migration.json"
$backupPath = Join-Path $backendDir "db.sqlite3.backup"
$dbPath = Join-Path $backendDir "db.sqlite3"

if (-not (Test-Path $pythonExe)) {
    throw "Python virtual environment not found at $pythonExe"
}

if (-not (Test-Path $dbPath) -and (Test-Path $backupPath)) {
    Copy-Item $backupPath $dbPath -Force
}

if (-not (Test-Path $dbPath)) {
    throw "SQLite database not found at $dbPath"
}

if (Test-Path $fixturePath) {
    Remove-Item $fixturePath -Force
}

$env:FORCE_SQLITE = "true"
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
try {
    & $pythonExe manage.py dumpdata `
        --exclude auth.permission `
        --exclude contenttypes `
        --natural-foreign `
        --natural-primary `
        --indent 2 `
        --output $fixturePath
} finally {
    Remove-Item Env:FORCE_SQLITE -ErrorAction SilentlyContinue
    Remove-Item Env:PYTHONUTF8 -ErrorAction SilentlyContinue
    Remove-Item Env:PYTHONIOENCODING -ErrorAction SilentlyContinue
}

Write-Host "SQLite export complete:" $fixturePath
