# ByteBattle dev: backend uses Piston for code execution (not local Node/Python).
# Requires: MongoDB, internet (emkc.org) OR self-hosted Piston on PISTON_ENDPOINT.
$root = Split-Path $PSScriptRoot -Parent
$nodePath = "C:\Program Files\nodejs"
$envFile = Join-Path $root "backend\.env"
if (Test-Path $envFile) {
  $c = Get-Content $envFile -Raw
  if ($c -notmatch 'CODE_EXECUTION_PREFER_PISTON=true') {
    Add-Content $envFile "`nCODE_EXECUTION_PREFER_PISTON=true"
    Write-Host "Appended CODE_EXECUTION_PREFER_PISTON=true to backend\.env" -ForegroundColor Yellow
  }
}
Write-Host "Starting backend (Piston mode) + frontend..." -ForegroundColor Cyan
$cmdBack = "cd '$($root)\backend'; `$env:Path = '$nodePath;' + `$env:Path; npm run start:dev"
$cmdFront = "cd '$($root)\frontend'; `$env:Path = '$nodePath;' + `$env:Path; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmdBack
Start-Sleep -Milliseconds 600
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmdFront
Write-Host "API: http://localhost:3000  |  UI: http://localhost:5173" -ForegroundColor Green
Write-Host "Code runs on Piston at URL in backend\.env (PISTON_ENDPOINT)." -ForegroundColor Gray
