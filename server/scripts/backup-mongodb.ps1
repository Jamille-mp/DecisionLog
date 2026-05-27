$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $PSScriptRoot "..\..\backups\mongodb\$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$mongoUrl = if ($env:MONGODB_URL) { $env:MONGODB_URL } else { "mongodb://localhost:27017/decisionlog_logs" }

mongodump --uri=$mongoUrl --out=$backupDir

Write-Host "Backup MongoDB criado em: $backupDir"
