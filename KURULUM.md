# Ücretsiz Oyun Bot - Yeni Sistem

## 🎮 Özellikler

✅ **Web Sitesi**
- Kayıt Ol / Giriş Yap
- Admin Giriş Paneli
- Sunucu Listesi
- Hesap Gönderme Sistemi

✅ **Admin Paneli**
- Kullanıcı Adı: `umut`
- Şifre: `umutpapa001122u`
- Sunucu Yönetimi
- Hesap Yönetimi
- Kullanıcı Listesi

✅ **Discord Bot**
- DM ile hesap gönderme
- Komutlar (ileride eklenecek)

---

## 📋 Kurulum

### 1. Node.js Kurulumu
- https://nodejs.org/ adresinden indir
- 18.x veya üzeri sürümü kullan

### 2. Proje Kurulumu
```bash
npm install
```

### 3. .env Dosyası
`.env.example` dosyasını kopyala ve `.env` yaparak düzenle:
```
DISCORD_TOKEN=your_discord_bot_token
PORT=3000
```

Discord Bot Token'ı nasıl alacaksın:
1. Discord Developer Portal'a git: https://discord.com/developers/applications
2. "New Application" tıkla
3. "Bot" sekmesine git ve "Add Bot" tıkla
4. Token'ı kopyala ve `.env` dosyasına yapıştır

### 4. Botu Çalıştır
```bash
npm start
```

---

## 🌐 Web Sitesi Erişimi

Botun çalışmaya başladıktan sonra:
- **Ana Sayfa**: http://localhost:3000
- **Admin Paneli**: http://localhost:3000/admin.html

### Kullanıcı Hesaplarıyla Giriş
1. "Kayıt Ol" tıkla
2. İsim, Discord ID, E-posta, Şifre gir
3. Kayıt yap
4. "Giriş Yap" ile giriş yap
5. "Hesap Gönder" ile hesap seç ve gönder

### Admin Paneline Giriş
1. Admin sayfasına git
2. Kullanıcı Adı: `umut`
3. Şifre: `umutpapa001122u`
4. Sunucu ve hesapları yönet

---

## 📁 Dosya Yapısı

```
.
├── index.js              # Ana bot dosyası
├── public/
│   ├── index.html        # Ana sayfa
│   └── admin.html        # Admin paneli
├── package.json          # Bağımlılıklar
└── database.json         # Veritabanı (otomatik oluşturulur)
```

---

## ⚙️ İleride Eklenecek Özellikler

- [ ] Kredi Sistemi
- [ ] Ürün Ekleme/Stok Yönetimi
- [ ] Hesap Alma/Verme
- [ ] Veritabanı (MongoDB/SQLite)
- [ ] Şifre Hash'leme
- [ ] E-mail Doğrulaması

---

## 🐛 Sorun Giderme

### "Port 3000 zaten kullanılıyor"
Farklı bir port kullan:
```bash
PORT=3001 npm start
```

### "Discord Bot bağlanamıyor"
- Token'ı kontrol et
- Bot'u Discord Developer Portal'dan Intents'e izin ver
- Intent'leri aktifleştir: Messages, Message Content, Direct Messages

---

## 📞 Destek

Kurulum sırasında sorun yaşarsan buradan yardım al.
