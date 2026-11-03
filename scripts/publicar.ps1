# ===========================================================================
# NEXO — Publicar los cambios en el servidor de la escuela
# ---------------------------------------------------------------------------
# Los cambios se hacen SIEMPRE en esta carpeta (la del proyecto, con git), se
# prueban con "npm run dev" y, cuando están listos, este script:
#   1. compila la aplicación (NEXO\dist);
#   2. copia al servidor solo el programa. NUNCA toca lo que es de la escuela:
#      la base (base-de-datos\nexo.db), los archivos subidos (servidor\almacen),
#      los respaldos ni la configuración (servidor\nexo.env).
# Después hay que reiniciar NEXO en el servidor (Ctrl + C y  node server.js).
#
# Uso (PowerShell, desde la carpeta del proyecto):
#   powershell -ExecutionPolicy Bypass -File scripts\publicar.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\publicar.ps1 -Destino \\otro\servidor -SinCompilar
# ===========================================================================
param(
  # NEXO vive en su propia subcarpeta: en division73 hay otros proyectos.
  [string]$Destino = "\\192.168.4.252\division73\nexo",
  [switch]$SinCompilar
)
$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $raiz

$padre = Split-Path -Parent $Destino
if (-not (Test-Path $padre)) {
  throw "No llego a $padre. ¿Estás conectado a la red de la escuela y abriste la carpeta una vez desde el Explorador (con su usuario y contraseña)?"
}
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory $Destino | Out-Null }

# Avisar si hay cambios sin guardar en git (se publican igual).
$pendientes = @(git status --porcelain 2>$null).Count
if ($pendientes -gt 0) { Write-Host "Aviso: hay $pendientes archivos con cambios sin commit. Se publican igual." -ForegroundColor Yellow }

# 1. Compilar la aplicación y asegurar las piezas del servidor.
if (-not $SinCompilar) {
  Write-Host "Compilando la aplicación..."
  yarn --cwd NEXO build
  if ($LASTEXITCODE -ne 0) { throw "La compilación falló: no se publicó nada." }
}
if (-not (Test-Path "NEXO\dist\index.html")) { throw "Falta NEXO\dist. Compilá con:  yarn --cwd NEXO build" }
if (-not ((Test-Path "servidor\node_modules\express") -and (Test-Path "servidor\node_modules\ws"))) {
  Write-Host "Instalando las piezas del servidor..."
  yarn --cwd servidor install
}

# 2. Copiar el programa (sin borrar nada de lo que ya está allá).
Write-Host "Copiando a $Destino ..."
$excluirCarpetas = @(".git", "node_modules", "NEXO\node_modules", "NEXO\dist", "logs", "EstructuraCarpetasNexo",
  "servidor\almacen", "servidor\cargas", "servidor\archivos-subidos", "servidor\tests", ".vscode", ".claude", "NEXO\.git") |
  ForEach-Object { Join-Path $raiz $_ }
$excluirArchivos = @("nexo.db", "nexo.db-*", "nexo-respaldo-*.db", "*.log", "nexo.env", "AUDITORIA_PANTALLAS_RESULTADOS.json")
robocopy $raiz $Destino /E /R:2 /W:3 /NFL /NDL /NJH /NP /MT:8 /XD $excluirCarpetas /XF $excluirArchivos | Select-Object -Last 6
if ($LASTEXITCODE -ge 8) { throw "Hubo errores al copiar (robocopy $LASTEXITCODE)." }

# La aplicación compilada se reemplaza entera (adentro no hay datos): así no
# se acumulan versiones viejas.
robocopy (Join-Path $raiz "NEXO\dist") (Join-Path $Destino "NEXO\dist") /MIR /R:2 /W:3 /NFL /NDL /NJH /NP /MT:8 | Select-Object -Last 6
if ($LASTEXITCODE -ge 8) { throw "Hubo errores al copiar la aplicación (robocopy $LASTEXITCODE)." }

Write-Host ""
Write-Host "Publicado en $Destino." -ForegroundColor Green
Write-Host "Ahora reiniciá NEXO en el servidor: Ctrl + C en su consola y de nuevo  node server.js"
