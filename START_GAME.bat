@echo off
title OPEN ROAD 3D - Driving Simulator
cls
echo =======================================================
echo           OPEN ROAD 3D - DRIVING SIMULATOR
echo =======================================================
echo.
echo Opening game in your web browser...
start "" http://localhost:3000

netstat -ano | findstr :3000 >nul
if %errorlevel% neq 0 (
  echo Starting background web server...
  node server.js
) else (
  echo Web server is already active on http://localhost:3000!
)
pause
