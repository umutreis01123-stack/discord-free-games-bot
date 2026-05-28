# Discord Bot 7/24 Ücretsiz Deploy Rehberi

## 📋 HAZIRLIK
1. **GitHub'da repo oluştur** (https://github.com)
2. **Tüm dosyaları GitHub'a yükle:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/kullaniciadi/bot-adi.git
   git push -u origin main
   ```

## 🚀 EN KOLAY: REPLIT

### Kurulum:
1. **Replit'te hesap aç:** https://replit.com
2. **"Create Repl" → "Node.js" seç**
3. **Tüm dosyaları yükle:**
   - `index.js`
   - `package.json`
   - `.env` (düzenle: token'ını gir)
   - Diğer dosyalar

4. **`keep-alive.js` dosyası oluştur:**
   ```javascript
   const http = require('http');
   const server = http.createServer((req, res) => {
     res.writeHead(200);
     res.end('Bot aktif!');
   });
   server.listen(3000);
   ```

5. **package.json güncelle:**
   ```json
   "scripts": {
     "start": "node index.js",
     "keep-alive": "node keep-alive.js"
   }
   ```

6. **Replit'te çalıştır:**
   ```bash
   npm install
   npm start
   ```

7. **Uptime Robot kur:** https://uptimerobot.com
   - Yeni monitor oluştur
   - URL: `https://bot-adi.replit.co`
   - Check interval: 5 minutes

## 🌐 RENDER (Önerilen)

### Kurulum:
1. **Render'da hesap aç:** https://render.com
2. **"New" → "Web Service"**
3. **GitHub repo'nu bağla**
4. **Ayarlar:**
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Plan:** Free
   - **Auto-Deploy:** Yes

5. **Environment Variables ekle:**
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`

6. **Deploy et!**

## ☁️ HEROKU

### Kurulum:
1. **Heroku'da hesap aç:** https://heroku.com
2. **Heroku CLI kur:**
   ```bash
   npm install -g heroku
   heroku login
   ```

3. **Proje oluştur:**
   ```bash
   heroku create bot-adi
   git push heroku main
   ```

4. **Config Variables ekle:**
   ```bash
   heroku config:set DISCORD_TOKEN=tokenin
   heroku config:set CLIENT_ID=clientid
   heroku config:set GUILD_ID=guildid
   ```

5. **Procfile oluştur:**
   ```
   worker: node index.js
   web: node keep-alive.js
   ```

## 🎮 GLITCH

### Kurulum:
1. **Glitch'te hesap aç:** https://glitch.com
2. **"New Project" → "Import from GitHub"**
3. **Repo URL'sini gir**
4. **.env dosyasını düzenle**
5. **"Tools" → "Logs" ile kontrol et**

## ⚡ HIZLI BAŞLANGIÇ: CODESANDBOX

### Kurulum:
1. **CodeSandbox'ta hesap aç:** https://codesandbox.io
2. **"Create Sandbox" → "Node.js"**
3. **Dosyaları yükle**
4. **Secrets ekle:**
   - Environment Variables bölümüne token'ları gir
5. **"Server Control Panel" → "Start Script"**

## 📊 KARŞILAŞTIRMA TABLOSU

| Platform | Ücretsiz Saat | RAM | Otomatik Restart | Kolaylık |
|----------|---------------|-----|------------------|----------|
| **Replit** | 7/24* | 0.5GB | ✅ | ⭐⭐⭐⭐⭐ |
| **Render** | 750/ay | 512MB | ✅ | ⭐⭐⭐⭐ |
| **Heroku** | 550-1000/ay | 512MB | ✅ | ⭐⭐⭐ |
| **Glitch** | 1000/ay | 512MB | ✅ | ⭐⭐⭐⭐ |
| **CodeSandbox** | 75/container | 1GB | ✅ | ⭐⭐⭐ |

*Uptime Robot ile

## 🛠️ TROUBLESHOOTING

### Bot çalışmıyorsa:
1. **Token kontrol et:** `.env` dosyasında doğru mu?
2. **Log kontrol et:** Platformun log/console bölümüne bak
3. **Port dinleme:** `keep-alive.js` ile web sunucusu çalıştır
4. **Dependencies:** `npm install` çalıştı mı?

### Bot duruyorsa:
1. **Uptime Robot:** Ping atıyor mu?
2. **Free tier limit:** Aylık limit dolmuş olabilir
3. **Memory limit:** RAM yetersiz kalıyor olabilir

## 🔄 YEDEKLEME

1. **GitHub'da otomatik backup:**
   ```bash
   # Her gün otomatik commit
   git add .
   git commit -m "Auto-backup $(date)"
   git push
   ```

2. **Config yedekle:**
   - `.env` dosyasını güvenli yerde sakla
   - `config.json` yedeğini al

## 📞 DESTEK

- **Discord Bot Issues:** Discord Developer Portal
- **Platform Issues:** Platformun support sayfası
- **Bot Code Issues:** GitHub Issues

## ⚠️ ÖNEMLİ UYARILAR

1. **Token güvenliği:** `.env` dosyasını public repo'da paylaşma!
2. **Rate limit:** Discord API limitlerine dikkat et
3. **Free tier:** Aylık limitleri aşmamaya çalış
4. **Backup:** Kodunu düzenli yedekle

## 🚀 HIZLI DEPLOY SCRIPT'i

`deploy.sh` oluştur:
```bash
#!/bin/bash
echo "Deploy başlıyor..."
npm install
echo "Bot başlatılıyor..."
node index.js
```

Platforma göre bu script'i kullan.