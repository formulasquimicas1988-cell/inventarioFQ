@echo off
title Inventario Formulas Quimicas
color 0A

echo ================================================
echo    INVENTARIO FORMULAS QUIMICAS
echo ================================================
echo.

REM Verificar que Node.js este instalado
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js no encontrado. Descargalo desde https://nodejs.org
    pause
    exit /b 1
)

REM Verificar que existe el .env del servidor
if not exist "%~dp0server\.env" (
    echo [ERROR] No se encontro el archivo server\.env
    echo.
    echo Crea el archivo server\.env con el siguiente contenido:
    echo.
    echo DB_HOST=localhost
    echo DB_PORT=3306
    echo DB_USER=root
    echo DB_PASSWORD=
    echo DB_NAME=formulasquimicas
    echo PORT=3001
    echo NODE_ENV=development
    echo.
    pause
    exit /b 1
)

REM Instalar dependencias del servidor si faltan
if not exist "%~dp0server\node_modules" (
    echo [INFO] Instalando dependencias del servidor...
    cd /d "%~dp0server"
    call npm install
    echo.
)

REM Instalar dependencias del cliente si faltan
if not exist "%~dp0client\node_modules" (
    echo [INFO] Instalando dependencias del cliente...
    cd /d "%~dp0client"
    call npm install
    echo.
)

echo [1/2] Iniciando servidor backend (puerto 3001)...
start "Backend - Formulas Quimicas" cmd /k "cd /d "%~dp0server" && npm run dev"

echo [2/2] Iniciando frontend Vite (puerto 5173)...
start "Frontend - Formulas Quimicas" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo Esperando que los servidores arranquen...
timeout /t 4 /nobreak >nul

echo Abriendo navegador...
start "" "http://localhost:5200"

echo.
echo ================================================
echo  Servidores corriendo:
echo    Backend:  http://localhost:3001
echo    Frontend: http://localhost:5173
echo ================================================
echo.
echo Cierra las ventanas de cmd para detener los servidores.
echo.
pause
