@echo off
REM =====================================================
REM SCRIPT DE INSTALACIÓN PARA WINDOWS
REM Vanguard Estadísticas Pagos
REM =====================================================

echo.
echo 🚀 Instalando Vanguard Estadísticas Pagos...
echo ==============================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ❌ Error: No se encontró package.json
    echo    Asegúrate de estar en el directorio raíz del proyecto
    pause
    exit /b 1
)

echo ✅ Directorio correcto encontrado
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado
    echo    Por favor instala Node.js 18+ desde https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js encontrado: 
node --version
echo.

REM Verificar npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: npm no está disponible
    pause
    exit /b 1
)

echo ✅ npm encontrado: 
npm --version
echo.

REM Instalar dependencias raíz
echo 📦 Instalando dependencias raíz...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias raíz
    pause
    exit /b 1
)
echo ✅ Dependencias raíz instaladas
echo.

REM Instalar dependencias del backend
echo 📦 Instalando dependencias del backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del backend
    pause
    exit /b 1
)
echo ✅ Dependencias del backend instaladas
echo.

REM Instalar dependencias del frontend
echo 📦 Instalando dependencias del frontend...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del frontend
    pause
    exit /b 1
)
echo ✅ Dependencias del frontend instaladas
echo.

cd ..

REM Crear archivo .env si no existe
if not exist "backend\.env" (
    echo 📝 Creando archivo de configuración...
    copy "backend\env.local" "backend\.env" >nul
    echo ✅ Archivo .env creado
    echo.
)

echo.
echo 🎉 ¡Instalación completada exitosamente!
echo.
echo 📋 Información del sistema:
echo    🌐 Frontend: http://localhost:3000
echo    🔧 Backend: http://localhost:5000
echo.
echo 🔑 Credenciales de acceso:
echo    DNI: 12345678
echo    Contraseña: password
echo    Rol: Administrador
echo.
echo 🚀 Para iniciar el sistema:
echo    npm run dev
echo.
echo 📚 Comandos útiles:
echo    npm run dev          - Iniciar desarrollo
echo    npm run backend      - Solo backend
echo    npm run frontend     - Solo frontend
echo.
echo ⚠️  IMPORTANTE: Antes de iniciar, configura PostgreSQL:
echo    1. Instala PostgreSQL 12+
echo    2. Crea la base de datos: estadisticas_pagos
echo    3. Ejecuta las migraciones
echo.
echo ¿Quieres continuar con la configuración de la base de datos? (S/N)
set /p continue=

if /i "%continue%"=="S" (
    echo.
    echo 📊 Configurando base de datos...
    echo    Ejecuta estos comandos en psql:
    echo.
    echo    CREATE DATABASE estadisticas_pagos;
    echo    CREATE USER estadisticas_user WITH PASSWORD 'vanguard_stats_2024';
    echo    GRANT ALL PRIVILEGES ON DATABASE estadisticas_pagos TO estadisticas_user;
    echo.
    echo    Luego ejecuta:
    echo    cd backend
    echo    node scripts/migrate.js migrate
    echo.
)

echo.
echo ✅ ¡Sistema listo para usar! 🚀
pause
