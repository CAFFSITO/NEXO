@echo off
rem ===========================================================================
rem NEXO - Respaldo nocturno (lo ejecuta el Programador de tareas, ver
rem instalar-tareas.ps1). Copia la base y los archivos subidos a la carpeta de
rem NEXO_RESPALDOS_DIR (servidor\nexo.env) y guarda los ultimos 30 dias.
rem ===========================================================================
setlocal
set "RAIZ=%~dp0..\.."
set "REGISTRO=C:\nexo-datos\respaldos.log"
set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
cd /d "%RAIZ%\base-de-datos"
"%NODE%" --env-file=..\servidor\nexo.env respaldar.mjs >> "%REGISTRO%" 2>&1
