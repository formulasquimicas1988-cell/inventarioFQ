@echo off
title Formulas Quimicas - Instalacion

echo.
echo  ================================================
echo     FORMULAS QUIMICAS - Sistema de Inventario
echo              Instalando dependencias...
echo  ================================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js no esta instalado.
    echo  Descargalo en: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% detectado.
echo.

:: Instalar servidor
echo  [1/2] Instalando dependencias del servidor...
echo  ------------------------------------------------
cd /d "%~dp0server"
call npm install
if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion del servidor.
    pause
    exit /b 1
)
echo  [OK] Servidor listo.
echo.

:: Instalar cliente
echo  [2/2] Instalando dependencias del cliente...
echo  ------------------------------------------------
cd /d "%~dp0client"
call npm install
if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion del cliente.
    pause
    exit /b 1
)
echo  [OK] Cliente listo.
echo.

echo  ================================================
echo     Instalacion completada con exito!
echo.
echo     Ahora ejecuta:  iniciar.bat
echo  ================================================
echo.
pause
