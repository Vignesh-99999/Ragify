@echo off
setlocal enabledelayedexpansion

echo ================================
echo Starting Backend and Frontend
echo ================================

REM ---- OPEN VS CODE ----
echo Opening Visual Studio Code...
start code .

REM =====================================================
REM =============== NODE BACKEND ========================
REM =====================================================

set BACKEND_PORT=5000
:CHECK_BACKEND
netstat -ano | findstr :%BACKEND_PORT% >nul
if %ERRORLEVEL%==0 (
    echo Port %BACKEND_PORT% busy, switching...
    set /a BACKEND_PORT+=1
    goto CHECK_BACKEND
)

echo Starting Node Backend Server...
start cmd /k "cd backend && set PORT=%BACKEND_PORT% && node server.js"

timeout /t 5 /nobreak > nul

REM =====================================================
REM =============== RAG FLASK BACKEND ===================
REM =====================================================

echo Starting RAG Flask Backend...

start cmd /k "call venv\Scripts\activate && cd rag-backend && python app.py"


REM =====================================================
REM =============== ANGULAR FRONTEND ====================
REM =====================================================

set FRONTEND_PORT=4200
:CHECK_FRONTEND
netstat -ano | findstr :%FRONTEND_PORT% >nul
if %ERRORLEVEL%==0 (
    echo Port %FRONTEND_PORT% busy, switching...
    set /a FRONTEND_PORT+=1
    goto CHECK_FRONTEND
)

echo Starting Angular Frontend...
start cmd /k "ng serve --port %FRONTEND_PORT% "

echo ================================
echo Project is running!
echo Node Backend: http://localhost:%BACKEND_PORT%
echo RAG Backend:  http://localhost:5001
echo Frontend:     http://localhost:%FRONTEND_PORT%
echo ================================
pause
