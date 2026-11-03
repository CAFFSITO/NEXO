# ===========================================================================
# NEXO — Deja a NEXO funcionando solo en el servidor de la escuela.
# ---------------------------------------------------------------------------
# Crea dos tareas en el Programador de tareas de Windows:
#   · "NEXO": arranca al encender la máquina (aunque nadie inicie sesión) y
#     vuelve a arrancar si se cae.
#   · "NEXO respaldo": todas las noches a las 3, copia la base y los archivos.
# Ejecutar en PowerShell COMO ADMINISTRADOR, desde la carpeta de NEXO:
#   powershell -ExecutionPolicy Bypass -File scripts\windows\instalar-tareas.ps1
# Volver a ejecutarlo no duplica nada: reemplaza las tareas.
# ===========================================================================
$ErrorActionPreference = "Stop"
$carpeta = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Resolve-Path (Join-Path $carpeta "..\..")

if (-not (Test-Path (Join-Path $raiz "servidor\nexo.env"))) {
  throw "Falta servidor\nexo.env. Copiá servidor\nexo.env.ejemplo como nexo.env y completalo antes de seguir."
}
if (-not (Test-Path (Join-Path $raiz "NEXO\dist\index.html"))) {
  throw "Falta compilar la aplicación (NEXO\dist). Ejecutá:  yarn --cwd NEXO build"
}
New-Item -ItemType Directory -Force "C:\nexo-datos" | Out-Null

# Sin límite de tiempo (por defecto Windows corta las tareas a los 3 días) y,
# si la tarea igual termina con error, se reintenta cada minuto.
$ajustes = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$servidor = New-ScheduledTaskAction -Execute (Join-Path $carpeta "iniciar-nexo.cmd")
Register-ScheduledTask -TaskName "NEXO" -Action $servidor -Trigger (New-ScheduledTaskTrigger -AtStartup) -Settings $ajustes -User "SYSTEM" -RunLevel Highest -Force | Out-Null

$ajustesRespaldo = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$respaldo = New-ScheduledTaskAction -Execute (Join-Path $carpeta "respaldar-nexo.cmd")
Register-ScheduledTask -TaskName "NEXO respaldo" -Action $respaldo -Trigger (New-ScheduledTaskTrigger -Daily -At "03:00") -Settings $ajustesRespaldo -User "SYSTEM" -RunLevel Highest -Force | Out-Null

Start-ScheduledTask -TaskName "NEXO"
Write-Host "Listo. NEXO está arrancando (puede tardar unos segundos)."
Write-Host "Probá en este servidor:  http://127.0.0.1:3073/api/salud"
Write-Host "Lo que dice NEXO queda en C:\nexo-datos\nexo.log"
