@echo off
:: ==============================================================================
:: EdgeShield PC Client - Background Auto-Start Launcher
:: ==============================================================================
:: Sets working directory to the client root folder and runs client.py under pythonw.exe.
:: Used by schtasks.exe fallback to guarantee working directory and windowless execution.

cd /d "%~dp0.."
set "CLIENT_DIR=%CD%"

:: Locate Python interpreter (prefer pythonw in client/.venv for windowless execution)
if exist "%CLIENT_DIR%\.venv\Scripts\pythonw.exe" (
    set "PY_EXE=%CLIENT_DIR%\.venv\Scripts\pythonw.exe"
) else if exist "%CLIENT_DIR%\venv\Scripts\pythonw.exe" (
    set "PY_EXE=%CLIENT_DIR%\venv\Scripts\pythonw.exe"
) else if exist "%CLIENT_DIR%\..\.venv\Scripts\pythonw.exe" (
    set "PY_EXE=%CLIENT_DIR%\..\.venv\Scripts\pythonw.exe"
) else if exist "%CLIENT_DIR%\.venv\Scripts\python.exe" (
    set "PY_EXE=%CLIENT_DIR%\.venv\Scripts\python.exe"
) else (
    set "PY_EXE=pythonw.exe"
)

start "" "%PY_EXE%" "%CLIENT_DIR%\client.py" %*
