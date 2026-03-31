# Starts Piston (code execution engine) for ByteBattle.
# Prerequisite: Docker Desktop (Windows) installed and running - https://www.docker.com/products/docker-desktop/
# Documentation: backend/src/code-execution/README.md

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $root 'piston-data'
$containerName = 'bytebattle-piston'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker is not in PATH." -ForegroundColor Red
  Write-Host "Install Docker Desktop, restart the terminal, then run this script again." -ForegroundColor Yellow
  Write-Host "Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
  exit 1
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# Docker Desktop-compatible path (WSL2): prefer slashes
$vol = ($dataDir -replace '\\', '/')

# docker inspect writes to stderr when missing - avoid Stop for this expected error
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& docker inspect $containerName 2>&1 | Out-Null
$containerExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap

if ($containerExists) {
  $running = docker inspect -f '{{.State.Running}}' $containerName 2>$null
  if ($running -eq 'true') {
    Write-Host "Piston already running: $containerName (port 2000)" -ForegroundColor Green
  } else {
    Write-Host "Starting existing container $containerName..." -ForegroundColor Cyan
    docker start $containerName
  }
} else {
  Write-Host "Pulling / creating Piston container (first time may take several minutes)..." -ForegroundColor Cyan
  docker pull ghcr.io/engineer-man/piston:latest
  docker run `
    --privileged `
    -v "${vol}:/piston" `
    -dit `
    -p 2000:2000 `
    --name $containerName `
    ghcr.io/engineer-man/piston:latest
}

Write-Host ""
Write-Host "Piston API: http://localhost:2000" -ForegroundColor Green
Write-Host "For ByteBattle, in backend/.env (or keep backend default):" -ForegroundColor Yellow
Write-Host "  PISTON_ENDPOINT=http://127.0.0.1:2000/api/v2/execute" -ForegroundColor Gray
Write-Host ""
Write-Host "Important: at first launch, no language runtime is installed." -ForegroundColor Yellow
Write-Host "Clone https://github.com/engineer-man/piston then run:" -ForegroundColor Yellow
Write-Host "  cd piston/cli && npm i" -ForegroundColor Gray
Write-Host "  node index.js -u http://127.0.0.1:2000 ppman install javascript python java c++" -ForegroundColor Gray
Write-Host "(Adjust versions if needed: GET http://localhost:2000/api/v2/runtimes)" -ForegroundColor Gray
Write-Host ""
