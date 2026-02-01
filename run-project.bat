@echo off
setlocal enabledelayedexpansion

echo ================================
echo Starting Backend and Frontend
echo ================================

REM ---- OPEN VS CODE (ADDED) ----
echo Opening Visual Studio Code...
start code .

REM ---- AUTO BACKEND PORT (ADDED) ----
set BACKEND_PORT=5000
:CHECK_BACKEND
netstat -ano | findstr :%BACKEND_PORT% >nul
if %ERRORLEVEL%==0 (
    echo Port %BACKEND_PORT% busy, switching...
    set /a BACKEND_PORT+=1
    goto CHECK_BACKEND
)

REM ---- Start Backend (SLIGHT ADD, SAME COMMAND) ----
echo Starting Backend Server...
start cmd /k "cd backend && set PORT=%BACKEND_PORT% && node server.js"

REM ---- Wait for backend to start ----
timeout /t 5 /nobreak > nul

REM ---- AUTO FRONTEND PORT (ADDED) ----
set FRONTEND_PORT=4200
:CHECK_FRONTEND
netstat -ano | findstr :%FRONTEND_PORT% >nul
if %ERRORLEVEL%==0 (
    echo Port %FRONTEND_PORT% busy, switching...
    set /a FRONTEND_PORT+=1
    goto CHECK_FRONTEND
)

REM ---- Start Frontend (SLIGHT ADD, SAME COMMAND) ----
echo Starting Angular Frontend...
start cmd /k "ng serve --port %FRONTEND_PORT% --open"

echo ================================
echo Project is running!
echo Backend: http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo ================================
pause
