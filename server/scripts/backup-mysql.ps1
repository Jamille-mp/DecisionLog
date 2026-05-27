$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $PSScriptRoot "..\..\backups\mysql"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$hostName = if ($env:DATABASE_HOST) { $env:DATABASE_HOST } else { "localhost" }
$port = if ($env:DATABASE_PORT) { $env:DATABASE_PORT } else { "3306" }
$user = if ($env:DATABASE_USER) { $env:DATABASE_USER } else { "root" }
$password = if ($env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD } else { "2010005" }
$database = if ($env:DATABASE_NAME) { $env:DATABASE_NAME } else { "decisionlog" }
$outputFile = Join-Path $backupDir "$database-$timestamp.sql"

mysqldump --host=$hostName --port=$port --user=$user --password=$password --databases $database --result-file=$outputFile

Write-Host "Backup MySQL criado em: $outputFile"
