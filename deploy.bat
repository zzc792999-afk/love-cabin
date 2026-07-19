@echo off
title Love Cabin GitHub Deploy Helper
echo ====================================================
echo      Love Cabin GitHub Deploy Helper (Bypass)
echo ====================================================
echo.
echo Starting PowerShell upload tool...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy_helper.ps1"
echo.
echo ====================================================
pause
