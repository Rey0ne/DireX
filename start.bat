@echo off
pushd "C:\Users\ROG\tapnow-canvas"
echo =============================
echo   TapNow Canvas
echo =============================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Close this window to stop.
echo =============================
echo.

timeout /t 3 /nobreak >nul
start "" http://localhost:5173

call npm run dev:all
