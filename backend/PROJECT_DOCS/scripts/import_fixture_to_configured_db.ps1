param(
    [switch]$SkipFlush
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent (Split-Path -Parent $scriptDir)
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
$fixturePath = Join-Path $backendDir "data-migration.json"

if (-not (Test-Path $pythonExe)) {
    throw "Python virtual environment not found at $pythonExe"
}

if (-not (Test-Path $fixturePath)) {
    throw "Fixture file not found at $fixturePath"
}

if ($env:FORCE_SQLITE) {
    throw "FORCE_SQLITE is set in this shell. Clear it before importing into Supabase/Postgres."
}

if (-not $SkipFlush) {
    & $pythonExe manage.py flush --no-input
}

& $pythonExe manage.py loaddata $fixturePath
& $pythonExe manage.py shell -c "from accounts.models import User; from beats.models import Beat, BeatUploadDraft; from catalog.models import SoundKit; print({'users': User.objects.count(), 'beats': Beat.objects.count(), 'beat_drafts': BeatUploadDraft.objects.count(), 'soundkits': SoundKit.objects.count()})"

Write-Host "Fixture import complete."
