@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Gelistirme modu:
echo  - API:  http://127.0.0.1:7861
echo  - UI:   http://127.0.0.1:5173
echo.

start "ClearVoice API" cmd /k "cd /d "%~dp0" && python -u api.py"
timeout /t 2 /nobreak >nul
pushd frontend
if not exist "node_modules\" call npm install
call npm run dev
popd
