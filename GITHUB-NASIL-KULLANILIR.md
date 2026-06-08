# GitHub'tan Bot Çalıştırma

## 🤔 Render ne alakası?

**Render** = Ücretsiz hosting servisi (botunu 24/7 çalıştırmak için)  
Senin GitHub repon → Render'a bağla → Bot her zaman çalışır

---

## 📱 GitHub'tan Çalıştırma Yöntemleri

### Seçenek 1: Bilgisayarında Çalıştır (KOLAY)

```bash
# 1. Repository'ni klonla
git clone https://github.com/YOU/repo-name.git
cd repo-name

# 2. Bağımlılıkları yükle
npm install

# 3. Token'ı .env'ye ekle
echo "DISCORD_TOKEN=your_token_here" > .env

# 4. Botu başlat
npm start
```

✅ **Avantaj:** Hızlı ve kolay  
❌ **Dezavantaj:** Bilgisayarını açık tutmalısın (24/7 yok)

---

### Seçenek 2: GitHub Actions ile (ORTA)

GitHub'da kendi sunucuları var - orada bot çalışır!

#### Adım 1: Token'ı Secret Olarak Ekle

1. GitHub repo sayfasına git
2. **Settings** → **Secrets and variables** → **Actions**
3. **"New repository secret"** tıkla
4. İsim: `DISCORD_TOKEN`
5. Değer: Bot tokenini yapıştır (özel kopyala)
6. **"Add secret"** tıkla

#### Adım 2: Workflow Dosyası Oluştur

Repo'da `.github/workflows/bot.yml` dosyası zaten var. Kontrol et:

```yaml
name: Blox Fruits Bot Starter

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  start-bot:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start bot
      env:
        DISCORD_TOKEN: ${{ secrets.DISCORD_TOKEN }}
      run: npm start
```

#### Adım 3: Aktifleştir

1. Push yap veya manuel trigger:
   - **Actions** → **"Blox Fruits Bot Starter"** → **"Run workflow"**

2. Bot çalışmaya başlayacak

✅ **Avantaj:** GitHub'ın sunucusu  
❌ **Dezavantaj:** Ayda ~2000 dakika limitli (24/7 = 43000 dakika gerekli - YETERŞIZ!)

---

### Seçenek 3: Render.com ile (ÖNERİLEN - 24/7)

Ücretsiz ve sınırsız! 🎉

#### Adım 1: Render'a Git

1. [Render.com](https://render.com) aç
2. GitHub hesabıyla giriş yap (ya da yeni hesap oluştur)

#### Adım 2: Service Oluştur

1. Dashboard → **"New+"** → **"Web Service"**
2. Repository'ni seç
3. Aşağıdaki ayarları yap:

| Ayar | Değer |
|------|-------|
| **Name** | `blox-fruits-bot` |
| **Environment** | `Node` |
| **Region** | Closest to you |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free |

#### Adım 3: Environment Variable Ekle

1. Deploy etmeden önce **"Add Environment Variable"** tıkla
2. **Key:** `DISCORD_TOKEN`
3. **Value:** Bot tokenini yapıştır
4. **"Create Web Service"** tıkla

#### Adım 4: Deploy Başlatılır

Bot otomatik olarak deploy ve çalışmaya başlar! ✅

✅ **Avantaj:** Tamamen ücretsiz, 24/7 çalışır, sınırsız  
✅ **Avantaj:** Hiç bir sınır yok

---

## 🔄 Güncellemeler

### Bilgisayarda Çalıştırıyorsan

```bash
# 1. Son değişiklikleri çek
git pull

# 2. Botu yeniden başlat
npm start
```

### GitHub Actions veya Render'da Çalıştırıyorsan

**Otomatik!** Push yaptığın anda güncellenir.

```bash
# Push yap → Otomatik deploy
git push
```

---

## 🆚 Karşılaştırma

| Özellik | Bilgisayar | GitHub Actions | Render |
|---------|-----------|-----------------|--------|
| **Kurulum Zorluğu** | ⭐ Kolay | ⭐⭐ Orta | ⭐⭐ Orta |
| **24/7 Çalışma** | ❌ Hayır | ⚠️ Sınırlı | ✅ Evet |
| **Maliyet** | Elektrik | Ücretsiz | Ücretsiz |
| **Ayda Limit** | Yok | 2000 dk | Yok |
| **Tavsiye** | Test için | Demo | **Üretim** |

---

## 🚀 HIZLI BAŞLAT (Render)

1. [Render.com](https://render.com) aç
2. GitHub'la giriş yap
3. Repo seç
4. Ayarları yap (yukarıdaki gibi)
5. Token ekle
6. Deploy et

**5 dakika içinde çalışır!** 🎉

---

## ❓ Sık Sorulan Sorular

**S: Token açığa çıkacak mı?**  
C: Hayır, secret olarak saklanır. Sadece GitHub/Render görebilir.

**S: Bot kilitlenmez mi?**  
C: Render yoğun yüklere karşı koruma sağlıyor. Sorun olmaz.

**S: Port ayarı gerekli mi?**  
C: Hayır, bot `.env`'de ayarlanır.

**S: Config.json kaybedebilir mi?**  
C: Evet! Render'ı her deploy'da reset eder. Düzenli yedekle.

**S: Hangisini seçemeliyim?**  
C: **Render** - en kolay ve 24/7.

---

## 📞 Yardım

- Hata alırsan GitHub Issues'da soru aç
- Mesaj tamam kopyala ve paylaş
- Hata tanımını yazüz

---

**Hazırsan? [BAŞLAT.md](./BAŞLAT.md) dosyasını oku!** 🚀