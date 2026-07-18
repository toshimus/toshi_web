@echo off
rem バッチファイルがある場所に移動
cd /d "%~dp0"

rem 既存のPythonプロセスを念のため終了
taskkill /f /im python.exe >nul 2>&1

rem ブラウザでエディタを起動
start http://localhost:8000/index.html

rem Pythonサーバーを起動
python -m http.server 8000

pause