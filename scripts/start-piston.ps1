# Démarre Piston (moteur d'exécution de code) pour ByteBattle.
# Prérequis : Docker Desktop (Windows) installé et démarré — https://www.docker.com/products/docker-desktop/
# Documentation : backend/src/code-execution/README.md

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$containerName = 'bytebattle-piston'
$volumeName = 'bytebattle-piston-packages'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker n'est pas dans le PATH." -ForegroundColor Red
  Write-Host "Installe Docker Desktop, redémarre le terminal, puis relance ce script." -ForegroundColor Yellow
  Write-Host "Téléchargement : https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
  exit 1
}

# Create persistent Docker volume for Piston packages (faster and safer than Windows bind mounts).
$prevEap2 = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& docker volume inspect $volumeName 2>&1 | Out-Null
$volumeExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap2
if (-not $volumeExists) {
  docker volume create $volumeName | Out-Null
}

# docker inspect écrit sur stderr si absent — éviter Stop sur cette erreur attendue
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& docker inspect $containerName 2>&1 | Out-Null
$containerExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap

if ($containerExists) {
  $mountsJson = docker inspect -f '{{json .Mounts}}' $containerName 2>$null
  $hasLegacyRootMount = $mountsJson -match '"Destination"\s*:\s*"/piston"'
  $hasBindPackagesMount = ($mountsJson -match '"Destination"\s*:\s*"/piston/packages"') -and ($mountsJson -match '"Type"\s*:\s*"bind"')
  if ($hasLegacyRootMount -or $hasBindPackagesMount) {
    Write-Host "Ancienne config détectée. Recréation du conteneur avec volume Docker /piston/packages..." -ForegroundColor Yellow
    docker rm -f $containerName
    $containerExists = $false
  }
}

if ($containerExists) {
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
    -v "${volumeName}:/piston/packages" `
    -dit `
    -p 2000:2000 `
    --name $containerName `
    ghcr.io/engineer-man/piston:latest
}

Write-Host ""
Write-Host "API Piston : http://localhost:2000" -ForegroundColor Green
Write-Host "Pour ByteBattle, dans backend/.env (ou laisse le defaut du backend) :" -ForegroundColor Yellow
Write-Host "  PISTON_ENDPOINT=http://127.0.0.1:2000/api/v2/execute" -ForegroundColor Gray
Write-Host ""
Write-Host "Important : au premier lancement, aucun langage n'est installé." -ForegroundColor Yellow
Write-Host "Clone https://github.com/engineer-man/piston puis :" -ForegroundColor Yellow
Write-Host "  cd piston/cli && npm i" -ForegroundColor Gray
Write-Host "  node index.js -u http://127.0.0.1:2000 ppman install node python java gcc" -ForegroundColor Gray
Write-Host "(Ajuste les versions si besoin : GET http://localhost:2000/api/v2/runtimes)" -ForegroundColor Gray
Write-Host ""
