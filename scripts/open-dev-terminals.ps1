# Opens two PowerShell windows: backend + frontend
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$nodePath = "C:\Program Files\nodejs"
$cmdBack = "cd '$backend'; if (-not (Get-Command npm -EA SilentlyContinue)) { `$env:Path = '$nodePath;' + `$env:Path }; Write-Host 'BACKEND :3000' -ForegroundColor Cyan; npm run start:dev"
$cmdFront = "cd '$frontend'; if (-not (Get-Command npm -EA SilentlyContinue)) { `$env:Path = '$nodePath;' + `$env:Path }; Write-Host 'FRONTEND :5173' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmdBack
Start-Sleep -Milliseconds 500
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmdFront
Write-Host "Opened 2 windows: backend + frontend." -ForegroundColor Green
