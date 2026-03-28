# Démarre Piston (moteur d'exécution de code) pour ByteBattle.
# Prérequis : Docker Desktop (Windows) installé et démarré — https://www.docker.com/products/docker-desktop/
# Documentation : backend/src/code-execution/README.md

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $root 'piston-data'
$containerName = 'bytebattle-piston'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker n'est pas dans le PATH." -ForegroundColor Red
  Write-Host "Installe Docker Desktop, redémarre le terminal, puis relance ce script." -ForegroundColor Yellow
  Write-Host "Téléchargement : https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
  exit 1
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# Chemin compatible Docker Desktop (WSL2) : préférer des slashes
$vol = ($dataDir -replace '\\', '/')

docker inspect $containerName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  $running = docker inspect -f '{{.State.Running}}' $containerName 2>$null
  if ($running -eq 'true') {
    Write-Host "Piston déjà en cours : $containerName (port 2000)" -ForegroundColor Green
  } else {
    Write-Host "Démarrage du conteneur existant $containerName..." -ForegroundColor Cyan
    docker start $containerName
  }
} else {
  Write-Host "Téléchargement / création du conteneur Piston (première fois : peut prendre plusieurs minutes)..." -ForegroundColor Cyan
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
Write-Host "API Piston : http://localhost:2000" -ForegroundColor Green
Write-Host "Pour ByteBattle, dans backend/.env :" -ForegroundColor Yellow
Write-Host "  PISTON_ENDPOINT=http://localhost:2000/api/v2/execute" -ForegroundColor Gray
Write-Host "  CODE_EXECUTION_PREFER_PISTON=true" -ForegroundColor Gray
Write-Host ""
Write-Host "Important : au premier lancement, aucun langage n'est installé." -ForegroundColor Yellow
Write-Host "Clone https://github.com/engineer-man/piston puis :" -ForegroundColor Yellow
Write-Host "  cd piston/cli && npm i" -ForegroundColor Gray
Write-Host "  node index.js -u http://127.0.0.1:2000 ppman install javascript python java c++" -ForegroundColor Gray
Write-Host "(Ajuste les versions si besoin : GET http://localhost:2000/api/v2/runtimes)" -ForegroundColor Gray
Write-Host ""
