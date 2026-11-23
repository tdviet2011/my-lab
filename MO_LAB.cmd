@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 20 hoac moi hon de mo lab.
  echo Trang tai: https://nodejs.org/
  pause
  exit /b 1
)
node server.mjs --open
pause
