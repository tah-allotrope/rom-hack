@echo off
REM Double-click to play: starts server.py and opens the game page.
start "" python "%~dp0server.py"
timeout /t 2 /nobreak >nul
start "" http://localhost:8000/
