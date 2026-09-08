param(
  [string]$Source = 'C:\Users\ddedi\Documents\Math Memory Tutor\reference\alg-eq-001',
  [string]$RepoRoot = 'D:\project\SOOHACK CHACKCHACK',
  [string]$Branch = 'codex/product-core-priority-reset001'
)

$ErrorActionPreference = 'Stop'
$Target = Join-Path $RepoRoot 'reference\alg-eq-001'
$EvidenceDir = Join-Path $RepoRoot 'docs\product-core\evidence'
$EvidencePath = Join-Path $EvidenceDir 'RESET001_SHA256.json'

if (-not (Test-Path (Join-Path $Source 'index.html'))) {
  throw "RESET001_SOURCE_INVALID: index.html not found at $Source"
}
if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
  throw "REPO_ROOT_INVALID: .git not found at $RepoRoot"
}

git -C $RepoRoot fetch origin

$current = (git -C $RepoRoot branch --show-current).Trim()
if ($current -ne $Branch) {
  $remoteBranch = git -C $RepoRoot branch -r --list "origin/$Branch"
  if ($remoteBranch) {
    git -C $RepoRoot checkout -B $Branch "origin/$Branch"
  } else {
    git -C $RepoRoot checkout -B $Branch origin/main
  }
}

$backup = $null
if (Test-Path $Target) {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $backup = Join-Path $RepoRoot "_backup\reset001_$stamp"
  New-Item -ItemType Directory -Force -Path $backup | Out-Null
  robocopy $Target $backup /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 | Out-Null
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null
robocopy $Source $Target /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 | Out-Null

function Get-RelativeHashMap([string]$Root) {
  $map = [ordered]@{}
  Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName | ForEach-Object {
    $rel = [IO.Path]::GetRelativePath($Root, $_.FullName).Replace('\','/')
    $map[$rel] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
  }
  return $map
}

$sourceHashes = Get-RelativeHashMap $Source
$targetHashes = Get-RelativeHashMap $Target
$sourceKeys = @($sourceHashes.Keys)
$targetKeys = @($targetHashes.Keys)

if (($sourceKeys -join [Environment]::NewLine) -ne ($targetKeys -join [Environment]::NewLine)) {
  throw 'RESET001_FILESET_MISMATCH'
}
foreach ($key in $sourceKeys) {
  if ($sourceHashes[$key] -ne $targetHashes[$key]) {
    throw "RESET001_HASH_MISMATCH: $key"
  }
}

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
$rows = @()
foreach ($key in $sourceKeys) {
  $rows += [ordered]@{ path=$key; sha256=$sourceHashes[$key] }
}
$evidence = [ordered]@{
  schema_version = '1.0.0'
  source = $Source
  target = $Target
  imported_at = (Get-Date).ToString('o')
  file_count = $sourceKeys.Count
  all_hashes_match = $true
  backup = $backup
  files = $rows
}
$evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $EvidencePath -Encoding utf8

Write-Host "RESET001_COPY_VERIFIED files=$($sourceKeys.Count)"
Write-Host "Evidence: $EvidencePath"

git -C $RepoRoot add -- 'reference/alg-eq-001' 'docs/product-core/evidence/RESET001_SHA256.json'
$staged = git -C $RepoRoot diff --cached --name-only
if ($staged) {
  git -C $RepoRoot commit -m 'feat: import RESET-001 canonical lesson source'
  git -C $RepoRoot push -u origin $Branch
} else {
  Write-Host 'No Git changes detected.'
}

Write-Host 'NEXT: run localhost visual QA at 1440 / 768 / 390 and record RESET001_VISUAL_QA.md'