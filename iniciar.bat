@echo off
title Formulas Quimicas - Sistema Inventario

echo.
echo  ================================================
echo     FORMULAS QUIMICAS - Sistema de Inventario
echo             Iniciando aplicacion...
echo  ================================================
echo.

:: Verificar dependencias
if not exist "%~dp0server\node_modules" (
    echo  [ERROR] No se encontraron dependencias del servidor.
    echo  Ejecuta primero: instalar.bat
    echo.
    pause
    exit /b 1
)
if not exist "%~dp0client\node_modules" (
    echo  [ERROR] No se encontraron dependencias del cliente.
    echo  Ejecuta primero: instalar.bat
    echo.
    pause
    exit /b 1
)

:: Iniciar servidor
echo  [1/2] Iniciando servidor  ^(puerto 5000^)...
start "FQ - Servidor (NO CERRAR)" cmd /k "title FQ - Servidor (NO CERRAR) && cd /d "%~dp0server" && npm run dev"

timeout /t 3 /nobreak >nul

:: Iniciar cliente
echo  [2/2] Iniciando cliente   ^(puerto 5173^)...
start "FQ - Cliente (NO CERRAR)" cmd /k "title FQ - Cliente (NO CERRAR) && cd /d "%~dp0client" && npm run dev"

timeout /t 4 /nobreak >nul

:: Abrir navegador
echo  Abriendo navegador...
start "" "http://localhost:5173"

echo.
echo  ================================================
echo     Sistema iniciado correctamente!
echo.
echo     URL:   http://localhost:5173
echo     API:   http://localhost:5000
echo.
echo     Para detener: cierra las dos ventanas
echo     negras  "FQ - Servidor"  y  "FQ - Cliente"
echo  ================================================
echo.
pause
