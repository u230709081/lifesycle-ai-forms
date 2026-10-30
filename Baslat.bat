@echo off
cd /d "%~dp0"
if not exist ".env" copy /Y ".env.example" ".env" >nul
start "Formika server" /B node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
