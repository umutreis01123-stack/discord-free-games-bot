# Roblox Blox Fruits Bot - Başlama Kılavuzu

## 🚀 Hızlı Başlangıç

### Seçenek 1: Kendi Bilgisayarında Çalıştır

#### 1. Node.js Kur
- [Node.js İndir](https://nodejs.org/) (v18 veya üzeri)
- Yüklemeyi tamamla

#### 2. Bağımlılıkları Yükle
```bash
npm install
```

#### 3. Token Ekle
`.env` dosyasını aç ve Discord bot tokenini ekle:
```
DISCORD_TOKEN=your_token_here
```

#### 4. Botu Başlat
```bash
npm start
```

Tamamlandı! Bot çalışıyor. ✅

---

## 📊 Seçenek 2: GitHub Actions ile Çalıştır (24/7)

### 1. Repository Ayarları
1. GitHub'da repository'ne git
2. Settings → Secrets and variables → Actions
3. `DISCORD_TOKEN` adında secret ekle (tokenin değeri)

### 2. Workflow Dosyası Oluştur
`.github/workflows/bot.yml` dosyasını oluştur:

```yaml
name: Blox Fruits Bot

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  run-bot:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Start bot
      env:
        DISCORD_TOKEN: ${{ secrets.DISCORD_TOKEN }}
      run: npm start
```

NOT: GitHub Actions ücretsiz planı 2,000 dakika/ay sağlıyor. Bot 24/7 çalışırsa ayda ~43,000 dakika gerekir. Limitin üzerine çıkarsın.

---

## 🌐 Seçenek 3: Render.com ile Çalıştır (Ücretsiz & 24/7)

### 1. Render.com'a Git
- [Render.com](https://render.com) adresine git
- GitHub hesabıyla giriş yap

### 2. Yeni Service Oluştur
1. Dashboard → "New" → "Web Service"
2. Repository'ni seç
3. Runtime: Node
4. Build command: `npm install`
5. Start command: `npm start`

### 3. Environment Variables Ekle
1. Settings → Environment
2. `DISCORD_TOKEN` ekle (bot tokenin)
3. Deploy et

Tamamlandı! Bot 24/7 çalışıyor. ✅

---

## 📱 Seçenek 4: Heroku ile Çalıştır (Eski Yöntem)

Heroku artık ücretsiz plan sunmuyor. Render önerilir.

---

## 🔑 Discord Bot Token Almak

### 1. Discord Developer Portal
- [Discord Developer Portal](https://discord.com/developers/applications) git
- "New Application" tıkla
- İsim ver

### 2. Bot Oluştur
- "Bot" sekmesine git
- "Add Bot" tıkla
- Token'ı kopyala

### 3. Intents Aç
"Privileged Gateway Intents" bölümünde:
- ✅ MESSAGE CONTENT INTENT
- ✅ GUILD MEMBERS INTENT

### 4. Sunucuya Ekle
- "OAuth2" → "URL Generator"
- Scopes: `bot`, `applications.commands`
- Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
- Linki kopyala ve tarayıcıda aç

---

## 📋 Komut Referansı

```bash
# Bağımlılıkları yükle
npm install

# Development modunda çalıştır (Auto-reload)
npm run dev

# Production'da çalıştır
npm start
```

---

## ⚙️ Konfigürasyon

### .env Dosyası
```
DISCORD_TOKEN=your_bot_token_here
PORT=3001
```

### config.json
Bot otomatik oluşturur. İlk açılışta boş olur.

```json
{
  "bloxFruitChannel": null,
  "fruits": []
}
```

---

## 🐛 Sorun Giderme

### "Bot komutlarını görmüyor"
- Botu yeniden başlat
- Sunucudan çıkar ve tekrar ekle
- 5 dakika bekle (slash komutları senkronize olması gerekir)

### "Token hatası"
- Token'ı doğru kopyaladığından emin ol
- Tırnak işareti veya boşluk olmasın
- .env dosyasını kaydedip botu yeniden başlat

### "Bot 24/7 çalışmıyor"
- GitHub Actions limitini aştıysan, Render'a geç
- Kendi bilgisayarını açık bırak
- VPS al

### "DM'e mesaj gelmiyorluk"
- Sunucudaki bir seste bot çalıştırsa mesaj normal kanala gider
- DM'i aç ayarlarında

---

## 📚 Kaynaklar

- [Discord.js Dökümentasyon](https://discord.js.org/)
- [Discord Developer Dökümentasyon](https://discord.com/developers/docs)
- [Render Dökümentasyon](https://render.com/docs)

---

## 💡 İpuçları

1. **Geliştirme için**: Kendi bilgisayarında `npm run dev` ile çalıştır
2. **Production için**: Render veya benzer servis kullan
3. **Token Güvenliği**: Token'ı asla paylaşma, .env dosyasında sakla
4. **Config Yedekleme**: config.json'u düzenli yedekle

---

## ❓ Yardım Lazımsa

1. GitHub Issues'da issue aç
2. Hata mesajını tam olarak yaz
3. `.env` hariç gerekli dosyaları paylaş

İyi eğlenceler! 🎮