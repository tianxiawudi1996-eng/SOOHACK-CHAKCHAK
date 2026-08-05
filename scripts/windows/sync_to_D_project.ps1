[CmdletBinding()]
param(
    [string]$Target = 'D:\project\SOOHACK CHACKCHACK',
    [string]$Source = '',
    [string]$Branch = 'agent/mvp-v0.1-foundation',
    [string]$Remote = 'https://github.com/tianxiawudi1996-eng/SOOHACK-CHAKCHAK.git',
    [switch]$KeepSource,
    [switch]$SkipPush
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    & git -C $Target @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$Base,
        [Parameter(Mandatory = $true)][string]$Path
    )
    $baseUri = [System.Uri]((Resolve-Path $Base).Path.TrimEnd('\') + '\')
    $pathUri = [System.Uri](Resolve-Path $Path).Path
    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($pathUri).ToString()).Replace('/', '\')
}

function Test-IgnoredRelativePath {
    param([Parameter(Mandatory = $true)][string]$RelativePath)
    $segments = $RelativePath -split '[\\/]'
    $ignored = @('.git', 'node_modules', '.venv', 'venv', '__pycache__', '.pytest_cache', 'dist', 'build')
    foreach ($segment in $segments) {
        if ($ignored -contains $segment) { return $true }
    }
    return $false
}

function Resolve-SourceFolder {
    param(
        [Parameter(Mandatory = $true)][string]$Workspace,
        [string]$ExplicitSource
    )

    if ($ExplicitSource) {
        if (-not (Test-Path -LiteralPath $ExplicitSource -PathType Container)) {
            throw "Source folder does not exist: $ExplicitSource"
        }
        return (Resolve-Path -LiteralPath $ExplicitSource).Path
    }

    $candidatePaths = @(
        (Join-Path $Workspace 'SOOHACK CHACKCHACK'),
        (Join-Path $Workspace 'soohack-chakchak-mvp-v0.1-foundation'),
        (Join-Path (Split-Path $Workspace -Parent) 'SOOHACK CHACKCHACK\SOOHACK CHACKCHACK'),
        (Join-Path (Split-Path $Workspace -Parent) 'soohack-chakchak-mvp-v0.1-foundation')
    )

    foreach ($candidate in $candidatePaths) {
        if ((Test-Path -LiteralPath $candidate -PathType Container) -and
            ((Resolve-Path -LiteralPath $candidate).Path -ne (Resolve-Path -LiteralPath $Workspace).Path)) {
            if ((Test-Path (Join-Path $candidate 'docs')) -or
                (Test-Path (Join-Path $candidate 'apps')) -or
                (Test-Path (Join-Path $candidate 'harness'))) {
                return (Resolve-Path -LiteralPath $candidate).Path
            }
        }
    }

    $nested = Get-ChildItem -LiteralPath $Workspace -Directory -Force -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -ne (Resolve-Path -LiteralPath $Workspace).Path -and
            ((Test-Path (Join-Path $_.FullName 'docs')) -or
             (Test-Path (Join-Path $_.FullName 'apps')) -or
             (Test-Path (Join-Path $_.FullName 'harness')))
        } |
        Select-Object -First 1

    if ($nested) { return $nested.FullName }
    return $null
}

function Move-RootArtifact {
    param(
        [Parameter(Mandatory = $true)][string]$Workspace,
        [Parameter(Mandatory = $true)][string]$FileName,
        [Parameter(Mandatory = $true)][string]$DestinationDirectory
    )
    $sourceFile = Join-Path $Workspace $FileName
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) { return }
    New-Item -ItemType Directory -Force -Path $DestinationDirectory | Out-Null
    $destinationFile = Join-Path $DestinationDirectory $FileName
    if (Test-Path -LiteralPath $destinationFile) {
        $sourceHash = (Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash
        $destinationHash = (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256).Hash
        if ($sourceHash -eq $destinationHash) {
            Remove-Item -LiteralPath $sourceFile -Force
            return
        }
        $suffix = Get-Date -Format 'yyyyMMdd_HHmmss'
        $destinationFile = Join-Path $DestinationDirectory (([IO.Path]::GetFileNameWithoutExtension($FileName)) + "_$suffix" + ([IO.Path]::GetExtension($FileName)))
    }
    Move-Item -LiteralPath $sourceFile -Destination $destinationFile -Force
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed or not available in PATH.'
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python is not installed or not available in PATH.'
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null
$Target = (Resolve-Path -LiteralPath $Target).Path
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupRoot = Join-Path (Split-Path $Target -Parent) ("_backup\SOOHACK_CHACKCHACK_$timestamp")
$logRoot = Join-Path $Target 'docs\stage8\audits'
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$logPath = Join-Path $logRoot ("LOCAL_WORKSPACE_MERGE_$timestamp.md")

Write-Host "[1/9] Workspace: $Target"
Write-Host "[2/9] Creating safety backup: $backupRoot"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
robocopy $Target $backupRoot /E /R:2 /W:1 /XD .git node_modules .venv venv __pycache__ .pytest_cache dist build _backup | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Backup failed. Robocopy exit code: $LASTEXITCODE" }

Write-Host '[3/9] Preparing Git repository'
if (-not (Test-Path (Join-Path $Target '.git'))) {
    Invoke-Git @('init')
    Invoke-Git @('remote', 'add', 'origin', $Remote)
    Invoke-Git @('fetch', 'origin', $Branch)
    Invoke-Git @('checkout', '-B', $Branch, "origin/$Branch")
} else {
    $origin = (& git -C $Target remote get-url origin 2>$null)
    if (-not $origin) {
        Invoke-Git @('remote', 'add', 'origin', $Remote)
    } elseif ($origin.Trim() -ne $Remote) {
        Invoke-Git @('remote', 'set-url', 'origin', $Remote)
    }

    $currentBranch = (& git -C $Target branch --show-current).Trim()
    $isDirty = -not [string]::IsNullOrWhiteSpace((& git -C $Target status --porcelain | Out-String).Trim())
    if ($currentBranch -ne $Branch) {
        if ($isDirty) {
            throw "Working tree has changes on '$currentBranch'. Commit or stash them before switching to '$Branch'. Backup: $backupRoot"
        }
        Invoke-Git @('fetch', 'origin', $Branch)
        Invoke-Git @('checkout', '-B', $Branch, "origin/$Branch")
    } else {
        Invoke-Git @('fetch', 'origin', $Branch)
        if (-not $isDirty) {
            Invoke-Git @('merge', '--ff-only', "origin/$Branch")
        }
    }
}

$resolvedSource = Resolve-SourceFolder -Workspace $Target -ExplicitSource $Source
$movedCount = 0
$identicalCount = 0
$conflictCount = 0

Write-Host '[4/9] Merging extracted contents into the existing workspace'
if ($resolvedSource) {
    Write-Host "Detected source: $resolvedSource"
    $sourceFiles = @(Get-ChildItem -LiteralPath $resolvedSource -File -Recurse -Force)
    foreach ($file in $sourceFiles) {
        $relative = Get-RelativePath -Base $resolvedSource -Path $file.FullName
        if (Test-IgnoredRelativePath -RelativePath $relative) { continue }

        $destination = Join-Path $Target $relative
        $destinationDirectory = Split-Path $destination -Parent
        New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
        $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash

        if (Test-Path -LiteralPath $destination -PathType Leaf) {
            $destinationHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
            if ($sourceHash -eq $destinationHash) {
                $identicalCount++
                if (-not $KeepSource) { Remove-Item -LiteralPath $file.FullName -Force }
                continue
            }

            $conflictBackup = Join-Path $backupRoot (Join-Path 'conflicts' $relative)
            New-Item -ItemType Directory -Force -Path (Split-Path $conflictBackup -Parent) | Out-Null
            Copy-Item -LiteralPath $destination -Destination $conflictBackup -Force
            $conflictCount++
        }

        Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
        $copiedHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        if ($copiedHash -ne $sourceHash) { throw "Hash verification failed: $relative" }
        $movedCount++
        if (-not $KeepSource) { Remove-Item -LiteralPath $file.FullName -Force }
    }

    if (-not $KeepSource) {
        Get-ChildItem -LiteralPath $resolvedSource -Directory -Recurse -Force |
            Sort-Object FullName -Descending |
            Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue) } |
            Remove-Item -Force -ErrorAction SilentlyContinue
        if (-not (Get-ChildItem -LiteralPath $resolvedSource -Force -ErrorAction SilentlyContinue)) {
            Remove-Item -LiteralPath $resolvedSource -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host 'No nested extracted workspace was found. Existing root will be organized and committed.'
}

Write-Host '[5/9] Organizing loose downloaded artifacts'
$reportsDir = Join-Path $Target 'docs\stage8\reports'
$packagesDir = Join-Path $Target 'artifacts\packages'
$scriptsDir = Join-Path $Target 'scripts\windows'
Move-RootArtifact -Workspace $Target -FileName '수학착착_범소프트_8Phase_개발진행_제품화로드맵_v1.0.docx' -DestinationDirectory $reportsDir
Move-RootArtifact -Workspace $Target -FileName '수학착착_범소프트_8Phase_개발진행_제품화로드맵_v1.0.md' -DestinationDirectory $reportsDir
Move-RootArtifact -Workspace $Target -FileName 'SOOHACK_CHACKCHAK_latest_workspace_2026-08-06.zip' -DestinationDirectory $packagesDir
Move-RootArtifact -Workspace $Target -FileName 'soohack-chakchak-mvp-v0.1-foundation.zip' -DestinationDirectory $packagesDir
Move-RootArtifact -Workspace $Target -FileName 'sync_to_D_project.ps1' -DestinationDirectory $scriptsDir

Write-Host '[6/9] Writing merge audit report'
$parentBefore = (& git -C $Target rev-parse HEAD).Trim()
$sourceDisplay = if ($resolvedSource) { $resolvedSource } else { 'NONE_DETECTED' }
$report = @"
# Local Workspace Merge Audit

- Executed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')
- Target: `$Target`
- Source: `$sourceDisplay`
- Branch: `$Branch`
- Remote: `$Remote`
- Safety backup: `$backupRoot`
- Parent commit before merge: `$parentBefore`

## File results

- Moved or overwritten after SHA-256 verification: $movedCount
- Identical duplicates removed: $identicalCount
- Conflicting destination files backed up: $conflictCount
- Source retained: $KeepSource

## Status

- Local merge: DONE_IMPLEMENTED
- Harness validation: PENDING
- Unit tests: PENDING
- Git commit and push: PENDING
"@
Set-Content -LiteralPath $logPath -Value $report -Encoding UTF8

Write-Host '[7/9] Running validation'
Invoke-Git @('diff', '--check')
& python (Join-Path $Target 'scripts\harness\validate_harness.py')
if ($LASTEXITCODE -ne 0) { throw 'Harness validation failed.' }
& python -m unittest discover -s (Join-Path $Target 'tests') -v
if ($LASTEXITCODE -ne 0) { throw 'Unit tests failed.' }

$report = (Get-Content -LiteralPath $logPath -Raw) -replace 'Harness validation: PENDING', 'Harness validation: PASS' -replace 'Unit tests: PENDING', 'Unit tests: PASS'
Set-Content -LiteralPath $logPath -Value $report -Encoding UTF8

Write-Host '[8/9] Committing changes'
Invoke-Git @('add', '-A')
& git -C $Target diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
    Invoke-Git @('commit', '-m', 'chore: merge and organize local workspace')
} else {
    Write-Host 'No Git changes detected after merge.'
}

Write-Host '[9/9] Pushing branch'
if (-not $SkipPush) {
    Invoke-Git @('push', '-u', 'origin', $Branch)
} else {
    Write-Host 'Push skipped by -SkipPush.'
}

$head = (& git -C $Target rev-parse HEAD).Trim()
Write-Host ''
Write-Host 'Completed successfully.'
Write-Host "Workspace: $Target"
Write-Host "Branch:    $Branch"
Write-Host "HEAD:      $head"
Write-Host "Backup:    $backupRoot"
Write-Host "Audit:     $logPath"
