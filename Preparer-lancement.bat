@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  Preparation de Windows Widgets...
echo  (une seule fois, ou apres une mise a jour)
echo.

call npm run build
if errorlevel 1 (
  echo.
  echo Echec du build. Verifie que Node.js est installe.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\creer-raccourcis.ps1"
if errorlevel 1 (
  echo.
  echo Le build est OK, mais la creation des raccourcis a echoue.
  pause
  exit /b 1
)

echo.
echo Pret. Tu peux lancer l'app depuis le Bureau ou le menu Demarrer.
echo.
pause
