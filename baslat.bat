@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ClearVoice AI baslatiliyor...
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo npm bulunamadi. Node.js kurulu olmali.
  pause
  exit /b 1
)

if not exist "frontend\node_modules\" (
  echo Frontend bagimliliklari yukleniyor...
  pushd frontend
  call npm install
  if errorlevel 1 (
    popd
    echo npm install basarisiz.
    pause
    exit /b 1
  )
  popd
)

echo Frontend derleniyor...
pushd frontend
call npm run build
if errorlevel 1 (
  popd
  echo Frontend build basarisiz.
  pause
  exit /b 1
)
popd

echo.
echo Tarayici: http://127.0.0.1:7861
set PYTHONUNBUFFERED=1
python -u api.py
pause
