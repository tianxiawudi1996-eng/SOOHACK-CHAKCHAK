param(
    [string]$Target = 'D:\project\SOOHACK CHACKCHAK',
    [string]$Branch = 'agent/mvp-v0.1-foundation',
    [string]$Remote = 'https://github.com/tianxiawudi1996-eng/SOOHACK-CHAKCHAK.git'
)

$ErrorActionPreference = 'Stop'
$BundleRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Write-Host "[1/6] Target: $Target"
New-Item -ItemType Directory -Force -Path $Target | Out-Null

$backupRoot = Join-Path (Split-Path $Target -Parent) ('SOOHACK CHACKCHACK_backup_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
if ((Test-Path $Target) -and (Get-ChildItem -Force $Target | Select-Object -First 1)) {
    Write-Host "[2/6] Existing workspace found. Creating safety backup: $backupRoot"
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    robocopy $Target $backupRoot /E /XD .git | Out-Null
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not available in PATH."
}

if (-not (Test-Path (Join-Path $Target '.git'))) {
    Write-Host "[3/6] Initializing Git repository"
    git -C $Target init
    git -C $Target remote add origin $Remote
} else {
    Write-Host "[3/6] Existing Git repository detected"
    $origin = git -C $Target remote get-url origin 2>$null
    if (-not $origin) {
        git -C $Target remote add origin $Remote
    }
}

Write-Host "[4/6] Fetching GitHub branch: $Branch"
git -C $Target fetch origin $Branch
git -C $Target checkout -B $Branch "origin/$Branch"

Write-Host "[5/6] Copying local downloadable artifacts and reports"
robocopy $BundleRoot $Target /E /XD .git /XF sync_to_D_project.ps1 | Out-Null

Write-Host "[6/6] Validating workspace"
python $Target\scripts\harness\validate_harness.py
python -m unittest discover -s $Target\tests -v
git -C $Target status -sb

Write-Host ""
Write-Host "Completed."
Write-Host "Workspace: $Target"
Write-Host "Branch:    $Branch"
