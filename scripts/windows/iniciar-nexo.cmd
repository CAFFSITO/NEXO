@echo off
rem ===========================================================================
rem NEXO - Arranque en el servidor de la escuela
rem ---------------------------------------------------------------------------
rem Lo ejecuta el Programador de tareas de Windows al encender la maquina (ver
rem instalar-tareas.ps1). Si NEXO se cierra por un error, vuelve a arrancar
rem solo a los 10 segundos. Todo lo que dice NEXO queda en el registro.
rem La configuracion esta en servidor\nexo.env.
rem ===========================================================================
setlocal
set "RAIZ=%~dp0..\.."
set "REGISTRO=C:\nexo-datos\nexo.log"
set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
cd /d "%RAIZ%\servidor"

:arrancar
rem El registro se renueva al pasar los 20 MB (se guarda el anterior).
if exist "%REGISTRO%" for %%A in ("%REGISTRO%") do if %%~zA GTR 20000000 move /y "%REGISTRO%" "%REGISTRO%.anterior" > nul
echo [%date% %time%] Arrancando NEXO >> "%REGISTRO%"
"%NODE%" --env-file=nexo.env servidor.js >> "%REGISTRO%" 2>&1
echo [%date% %time%] NEXO se detuvo (codigo %errorlevel%). Vuelve a arrancar en 10 segundos. >> "%REGISTRO%"
ping -n 11 127.0.0.1 > nul
goto arrancar
