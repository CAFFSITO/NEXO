# NEXO — Apagar NEXO (por ejemplo, para actualizarlo). Ejecutar como administrador:
#   powershell -ExecutionPolicy Bypass -File scripts\windows\detener-nexo.ps1
# Para volver a encenderlo:  Start-ScheduledTask -TaskName "NEXO"
Stop-ScheduledTask -TaskName "NEXO" -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like "*servidor.js*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host "NEXO apagado."
