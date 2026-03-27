@echo off
title Inventario Formulas Quimicas
color 0A

echo ================================================
echo    INVENTARIO FORMULAS QUIMICAS
echo ================================================
echo.

REM Verificar que existe el .env del servidor
if not exist "server\.env" (
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

echo [1/2] Iniciando servidor backend (puerto 3001)...
start "Backend - Formulas Quimicas" cmd /k "cd /d %~dp0server && npm run dev"

echo [2/2] Iniciando frontend Vite (puerto 5173)...
start "Frontend - Formulas Quimicas" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Esperando que los servidores arranquen...
timeout /t 4 /nobreak >nul

echo Abriendo navegador...
start "" "http://localhost:5173"

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
