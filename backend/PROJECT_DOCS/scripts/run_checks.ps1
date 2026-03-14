$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$checks = @(
    @{ Name = "Backend Tests"; Workdir = $root; Command = ".\\.venv\\Scripts\\python.exe manage.py test" },
    @{ Name = "Frontend Lint"; Workdir = Join-Path $root "frontend"; Command = "cmd /c npm run lint" },
    @{ Name = "Frontend TypeCheck"; Workdir = Join-Path $root "frontend"; Command = "cmd /c npx tsc --noEmit" }
)

$results = @()
foreach ($check in $checks) {
    Push-Location $check.Workdir
    try {
        Invoke-Expression $check.Command 2>&1 | Out-Null
        $exit = $LASTEXITCODE
    } catch {
        $exit = 1
    }
    Pop-Location

    $status = if ($exit -eq 0) { "PASS" } else { "FAIL" }
    $results += [PSCustomObject]@{
        Name = $check.Name
        Status = $status
        ExitCode = $exit
    }
}

$reportPath = Join-Path $root "PROJECT_DOCS\\AUTOMATION_REPORT.md"
$lines = @()
$lines += "# BeatKosh Automation Report"
$lines += ""
$lines += "Generated: $timestamp"
$lines += ""
$lines += "| Check | Status | Exit Code |"
$lines += "|---|---|---|"
foreach ($row in $results) {
    $lines += "| $($row.Name) | $($row.Status) | $($row.ExitCode) |"
}

$failed = $results | Where-Object { $_.Status -eq "FAIL" }
$overall = if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }
$lines += ""
$lines += "Overall: **$overall**"

Set-Content -Path $reportPath -Value ($lines -join "`r`n")
Write-Output "Automation report written to $reportPath"
if ($overall -eq "FAIL") { exit 1 }
exit 0
