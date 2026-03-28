# ByteBattle – frontend (Vite) on http://localhost:5173
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\frontend
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  $env:Path = "C:\Program Files\nodejs;" + $env:Path
}
Write-Host "Starting frontend..." -ForegroundColor Cyan
npm run dev
