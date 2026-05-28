@echo off
echo Discord Ucretsiz Oyun Botu Baslatiliyor...
echo.
echo 1. Gereksinimler kontrol ediliyor...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: Node.js bulunamadi!
    echo Lutfen Node.js kurun: https://nodejs.org/
    pause
    exit /b 1
)

echo 2. Node.js versiyonu kontrol ediliyor...
node --version

echo.
echo 3. Bağımlılıklar yükleniyor...
call npm install

echo.
echo 4. .env dosyası kontrol ediliyor...
if not exist ".env" (
    echo UYARI: .env dosyasi bulunamadi!
    echo Lutfen .env.example dosyasini kopyalayip .env olarak kaydedin.
    echo Ardindan DISCORD_TOKEN degerini girin.
    pause
    exit /b 1
)

echo.
echo 5. Bot baslatiliyor...
echo.
echo ========================================
echo   BOT BASARIYLA CALISIYOR!
echo   Konsolu kapatmayin.
echo ========================================
echo.

node index.js

pause