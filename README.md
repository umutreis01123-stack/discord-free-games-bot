# 🎮 Ücretsiz Oyun Bot - Web Sitesi & Admin Paneli

Modern web sitesi ile kredi sistemini, hesap yönetimini ve sunucu listesini yönet!

## ✨ Özellikler

### 🌐 **Web Sitesi**
- ✅ Kayıt Ol & Giriş Yap
- ✅ Sunucu Listesi (Ana sayfada)
- ✅ Hesap Gönderme Sistemi
- ✅ Kullanıcı Dashboard

### 🔐 **Admin Paneli**
- ✅ Admin Giriş (`umut` / `umutpapa001122u`)
- ✅ Sunucu Yönetimi
- ✅ Hesap Yönetimi
- ✅ Kullanıcı İstatistikleri

### 🤖 **Discord Bot**
- ✅ Hesap gönderimi (DM ile)
- ✅ Komutlar
- ✅ Sistem Logları

---

## 🚀 Kurulum

### **Adım 1: Repository'i Klonla**
```bash
git clone https://github.com/KULLANICI_ADIN/REPO_ADI.git
cd REPO_ADI
```

### **Adım 2: Bağımlılıkları Yükle**
```bash
npm install
```

### **Adım 3: .env Dosyasını Oluştur**
`.env.example` dosyasını kopyala:
```bash
cp .env.example .env
```

Düzenle ve Discord Token ekle:
```
DISCORD_TOKEN=your_discord_bot_token
PORT=3000
NODE_ENV=development
```

### **Adım 4: Botu Başlat**
```bash
npm start
```

**Site:** http://localhost:3000  
**Admin:** http://localhost:3000/admin.html

---

## 🚃 Railway'e Deploy

Hızlı deploy için **RAILWAY-QUICK-START.md** oku!

### 30 Saniyede:
1. `git push origin main`
2. Railway'e bağla
3. Token ekle
4. Deploy!

Detaylı rehber: **RAILWAY-DEPLOY.md**

---

## 📝 Discord Token Nasıl Alınır?

1. https://discord.com/developers/applications
2. "New Application" → Adını gir
3. "Bot" tab → "Add Bot"
4. "TOKEN" → "Copy"
5. `.env` dosyasına yapıştır

⚠️ **Token'ı asla paylaşma! GitHub'a push etme!**

---

## 🌐 Web Sayfaları

### **Ana Sayfa** `/`
```
- Kayıt Ol (Modal)
- Giriş Yap (Modal)
- Sunucu Listesi
- Hesap Gönder (Giriş sonrası)
```

### **Admin Paneli** `/admin.html`
```
Kullanıcı: umut
Şifre: umutpapa001122u

Tabs:
- Sunucuları Yönet (Ekle, Listele)
- Hesapları Yönet (Ekle, Listele)
- Kullanıcıları Görüntüle
```

---

## 🔌 API Endpoints

### **Genel**
- `GET /` - Ana sayfa
- `GET /api/servers` - Sunucu listesi

### **Kullanıcı**
- `POST /api/register` - Kayıt ol
- `POST /api/login` - Giriş yap
- `POST /api/send-account` - Hesap gönder

### **Admin**
- `POST /api/admin-login` - Admin giriş
- `POST /api/admin/add-server` - Sunucu ekle
- `POST /api/admin/add-account` - Hesap ekle

---

## 📁 Proje Yapısı

```
.
├── index.js                 # Bot & Web Sunucusu
├── package.json             # Bağımlılıklar
├── .env.example             # Örnek .env
├── railway.toml             # Railway Config
├── Procfile                 # Heroku/Railway Komutları
│
├── public/
│   ├── index.html           # Ana Sayfa
│   └── admin.html           # Admin Paneli
│
├── database.json            # Veritabanı (otomatik)
│
├── README.md                # Bu dosya
├── KURULUM.md               # Lokal kurulum
├── RAILWAY-DEPLOY.md        # Railway rehberi
└── RAILWAY-QUICK-START.md   # Hızlı başlama
```

---

## 💾 Veritabanı Yapısı

```json
{
  "users": [
    {
      "id": "1234567890",
      "name": "İsim",
      "discordId": "987654321",
      "email": "ornek@email.com",
      "password": "şifre",
      "registeredAt": "2024-01-01T00:00:00"
    }
  ],
  "credits": {
    "1234567890": 100
  },
  "accounts": [
    {
      "name": "Hesap 1",
      "details": "Hesap bilgileri..."
    }
  ],
  "servers": [
    {
      "id": 1,
      "name": "Sunucu Adı",
      "playerCount": 150
    }
  ]
}
```

---

## 🎯 Özellikler (Roadmap)

- [x] Web Sitesi
- [x] Admin Paneli
- [x] Kayıt & Giriş Sistemi
- [x] Hesap Gönderme
- [x] Sunucu Listesi
- [ ] Kredi Sistemi
- [ ] Ürün Ekleme/Satma
- [ ] MongoDB/PostgreSQL Entegrasyonu
- [ ] Şifre Hash'leme
- [ ] E-mail Doğrulaması

---

## ⚙️ Konfigürasyon

### Admin Bilgileri
- **Kullanıcı Adı:** `umut`
- **Şifre:** `umutpapa001122u`

*Üretim ortamında değiştir!*

### Ortam Değişkenleri
```
DISCORD_TOKEN    # Discord Bot Token
PORT             # Web sunucu portu (default: 3000)
NODE_ENV         # development/production
```

---

## 🐛 Sorun Giderme

### "Port 3000 zaten kullanılıyor"
```bash
PORT=3001 npm start
```

### "Bot Discord'a bağlanamıyor"
- Token doğru mu kontrol et
- Intents aktif mi? (Dev Portal → Bot)
- Bot sunucuda mı?

### "Sitey açamıyorum"
- `http://localhost:3000` tarayıcı'ya yapıştır
- Logs'ta hata var mı kontrol et

---

## 📞 Komutlar

### Lokal Geliştirme
```bash
npm start       # Production modu
npm run dev     # Development (nodemon)
```

### Railway Deploy
```bash
git push origin main    # Otomatik deploy
```

---

## 📊 Lisans

MIT License - Özgürce kullan!

---

## 👤 Geliştirici

**Umut** - 2024

---

**Kurulum sorunu mu var?** Bak: **KURULUM.md**  
**Railway'e deploy etmek mi istiyorsun?** Bak: **RAILWAY-QUICK-START.md**
