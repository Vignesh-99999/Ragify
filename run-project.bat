@echo off
setlocal enabledelayedexpansion

echo ================================
echo Starting Backend, Frontend, Ollama
echo ================================

REM =====================================================
REM =============== CHECK OLLAMA =========================
REM =====================================================

echo Checking Ollama installation...

where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Ollama not found. Installing...
    
    REM Download installer
    powershell -Command "Invoke-WebRequest -Uri https://ollama.com/download/OllamaSetup.exe -OutFile OllamaSetup.exe"
    
    REM Install silently
    start /wait OllamaSetup.exe
    
    echo Ollama installed.
) else (
    echo Ollama already installed.
)

REM =====================================================
REM =============== START OLLAMA =========================
REM =====================================================

echo Starting Ollama server...
start cmd /k "ollama serve"

timeout /t 5 /nobreak > nul

REM =====================================================
REM =============== CHECK MISTRAL MODEL ==================
REM =====================================================

echo Checking mistral model...

ollama list | findstr mistral >nul
if %ERRORLEVEL% NEQ 0 (
    echo Mistral not found. Pulling model...
    start cmd /k "ollama pull mistral"
    timeout /t 10 /nobreak > nul
) else (
    echo Mistral already available.
)

REM =====================================================
REM =============== OPEN VS CODE =========================
REM =====================================================

echo Opening Visual Studio Code...
start code .

REM =====================================================
REM =============== NODE BACKEND =========================
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
REM =============== RAG FLASK BACKEND ====================
REM =====================================================

echo Starting RAG Flask Backend...
start cmd /k "call venv\Scripts\activate && cd rag-backend && python app.py"

REM =====================================================
REM =============== ANGULAR FRONTEND =====================
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
start cmd /k "ng serve --port %FRONTEND_PORT%"

REM =====================================================
REM =============== FINAL OUTPUT =========================
REM =====================================================

echo ================================
echo Project is running!
echo Node Backend: http://localhost:%BACKEND_PORT%
echo RAG Backend:  http://localhost:5001
echo Frontend:     http://localhost:%FRONTEND_PORT%
echo Ollama:       http://localhost:11434
echo ================================

pause