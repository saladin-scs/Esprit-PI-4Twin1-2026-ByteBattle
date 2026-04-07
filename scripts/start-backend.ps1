# ByteBattle – backend (NestJS) on http://localhost:3000
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\backend
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  $env:Path = "C:\Program Files\nodejs;" + $env:Path
}
Write-Host "Starting backend..." -ForegroundColor Cyan
npm run start:dev
