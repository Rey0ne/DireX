@echo off
cd /d %~dp0
start "TapNow-Backend" cmd /c "cd server && npx tsx src/index.ts"
start "TapNow-Frontend" cmd /c "npx vite --port 5173 --host"
echo TapNow started
