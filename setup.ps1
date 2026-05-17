# CondoManager — Script de Instalación Automatizada para Desarrolladores

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "      🏢 Bienvenido a CondoManager 🏢" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Python
Write-Host "🔍 Verificando instalación de Python..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python detectado: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    Write-Host "Por favor instala Python 3.8+ y agrégalo al PATH antes de continuar." -ForegroundColor Red
    Exit
}
Write-Host ""

# 2. Instalar dependencias de Python
Write-Host "📦 Instalando dependencias de requirements.txt..." -ForegroundColor Yellow
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ¡Dependencias de Python instaladas con éxito!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Ocurrió un error al instalar algunas dependencias. Asegúrate de tener permisos." -ForegroundColor Orange
}
Write-Host ""

# 3. Advertencia e información sobre ODBC Driver 17
Write-Host "🔧 Verificando conectores de SQL Server..." -ForegroundColor Yellow
$odbcReg17 = Get-ItemProperty -Path "HKLM:\SOFTWARE\ODBC\ODBCINST.INI\ODBC Driver 17 for SQL Server" -ErrorAction SilentlyContinue

if ($odbcReg17) {
    Write-Host "✅ ¡ODBC Driver 17 for SQL Server detectado!" -ForegroundColor Green
} else {
    Write-Host "⚠️ ADVERTENCIA: No se detectó 'ODBC Driver 17 for SQL Server'." -ForegroundColor Yellow
    Write-Host "Para conectarse a la base de datos de SQL Server de forma local, debe descargar e instalar este driver." -ForegroundColor Yellow
    Write-Host "🔗 Descarga Oficial de Microsoft: https://learn.microsoft.com/es-es/sql/connect/odbc/download-odbc-driver-for-sql-server" -ForegroundColor Cyan
}
Write-Host ""

# 4. Instrucciones finales
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   🎉 ¡Configuración de CondoManager lista! 🎉" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Para empezar a desarrollar:" -ForegroundColor White
Write-Host " 1. Enciende el Backend:  python backend/server.py" -ForegroundColor White
Write-Host " 2. Enciende el Frontend: python -m http.server 8000" -ForegroundColor White
Write-Host " 3. Abre en tu navegador: http://localhost:8000/login.html" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
