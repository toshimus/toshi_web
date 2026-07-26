@echo off
rem バッチファイルが置かれているフォルダへ自動的に移動
cd /d "%~dp0"

rem 既存のプロセスとの衝突を避けるため、ポートを8080に変更して別ウィンドウで起動
start "LocalWebServer" python -m http.server 8080

rem サーバーの準備を待機
timeout /t 2 >nul

rem ポート8080でブラウザを開く
start http://localhost:8080/make_mondai.html