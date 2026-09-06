@echo off
title Speed Breaker ADAS Demo

echo ==========================================
echo     SPEED BREAKER ADAS DEMO
echo ==========================================
echo.

echo Starting FastAPI Backend...
start "ADAS Backend" cmd /k "cd /d C:\Users\Roshan\Documents\Speed breaker FYP\Advanced && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 5 /nobreak >nul

echo Starting React Frontend...
start "ADAS Frontend" cmd /k "cd /d C:\Users\Roshan\Documents\Speed breaker FYP\Advanced\frontend && npm.cmd run dev"

timeout /t 5 /nobreak >nul

echo.
echo ==========================================
echo     DEMO SERVERS STARTED
echo ==========================================
echo.
echo Dashboard: http://localhost:5173
echo Backend:   http://localhost:8000
echo.
echo Opening dashboard...

start http://localhost:5173

echo.
echo You can close this window.
pause