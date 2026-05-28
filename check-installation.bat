@echo off
echo ========================================
echo   DISCORD UCRETSIZ OYUN BOTU
echo   KURULUM KONTROL SCRIPT'I
echo ========================================
echo.

echo 1. Node.js kontrol ediliyor...
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo   ✅ Node.js kurulu
    node --version
) else (
    echo   ❌ Node.js bulunamadi!
    echo   Lutfen https://nodejs.org/ adresinden Node.js kurun
)

echo.
echo 2. npm kontrol ediliyor...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo   ✅ npm kurulu
    npm --version
) else (
    echo   ❌ npm bulunamadi!
    echo   Node.js ile birlikte gelmeli, Node.js'i yeniden kurun
)

echo.
echo 3. Dosyalar kontrol ediliyor...
if exist "package.json" (
    echo   ✅ package.json mevcut
) else (
    echo   ❌ package.json bulunamadi!
)

if exist "index.js" (
    echo   ✅ index.js mevcut
) else (
    echo   ❌ index.js bulunamadi!
)

if exist ".env" (
    echo   ✅ .env dosyasi mevcut
    echo   NOT: Token degerini kontrol etmeyi unutmayin!
) else (
    echo   ⚠️  .env dosyasi bulunamadi!
    echo   Lutfen .env.example dosyasini kopyalayip .env yapin
)

echo.
echo 4. Bağımlılıklar kontrol ediliyor...
if exist "node_modules" (
    echo   ✅ node_modules klasoru mevcut
    echo   NOT: npm install komutunu calistirdiysaniz tamam
) else (
    echo   ⚠️  node_modules klasoru bulunamadi!
    echo   Lutfen 'npm install' komutunu calistirin
)

echo.
echo ========================================
echo   KURULUM ADIMLARI:
echo.
echo   1. .env dosyasini duzenle:
echo      DISCORD_TOKEN=bot_tokeniniz
echo      CLIENT_ID=bot_client_id
echo      GUILD_ID=sunucu_id
echo.
echo   2. Bağımlılıklari yukle:
echo      npm install
echo.
echo   3. Botu baslat:
echo      npm start
echo      VEYA
echo      node index.js
echo.
echo   4. Discord'da komutlari test et:
echo      /oyunkanalıayarla
echo      /bütünücretsizoyunlarıpaylaş
echo ========================================
echo.
pause