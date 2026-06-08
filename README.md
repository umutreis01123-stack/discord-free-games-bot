# 🍎 Roblox Blox Fruits Stok Bot

Discord sunucunuzda Roblox Blox Fruits hesaplarını yönetip paylaşan bot.

## 🚀 Başlıyoruz!

**3 Çalıştırma Seçeneği:**

### 1️⃣ Bilgisayarında Çalıştır (En Kolay)
```bash
npm install
npm start
```

### 2️⃣ GitHub Actions ile (Ücretsiz)
- Token'ı secret olarak ekle
- Workflow otomatik çalışır
- Aylık 2,000 dakika limitli

### 3️⃣ Render.com ile (Önerilen - 24/7)
- Repository'ni Render'a bağla
- Token ekle
- Deploy et

**📖 Detaylı kurulum: [BAŞLAT.md](./BAŞLAT.md)**

---

## 📋 Komutlar

### `/bloxfruitkur`
Blox Fruits yönetim panelini açar.
- Select menu ile Fruit seç
- Rastgele Fruit çek
- Detayları DM'e gönder

### `/bloxkanal <kanal>`
Stok kanalını ayarlar.
- Yeni Fruit eklenince otomatik duyuru
- Örnek: `/bloxkanal kanal: #stok`

### `/fruityekle <fruit> <oyuncu_adı> <şifre>`
Yeni Fruit ekler.
- Örnek: `/fruityekle fruit: Mera oyuncu_adı: player123 şifre: pass123`

---

## 🎮 Desteklenen Fruits

- 🔥 Mera
- 🟠 Gomu
- ⬛ Yami
- 💨 Logia
- ✨ Paramecia
- 🐾 Zoan
- 👹 Mythical
- ⭐ Legendary
- 💎 Rare
- 📦 Common

---

## ✨ Özellikler

### 🎯 Select Menu GUI
- Dropdown'dan Fruit seç
- Her Fruit için emoji
- Stok sayısı göster

### 🎲 Rastgele Çekiliş
- "Rastgele Fruit Çek" butonu
- DM'e sonuç gönder

### 📬 DM Gönderme
- Detayları kullanıcının DM'ine gönder
- DM kapalıysa ephemeral mesaj
- Güvenli şifre gösterimi

### 📢 Kanal Duyuruları
- Yeni Fruit ekleme bildirimi
- Renkli embed'ler
- Ekleyen ve tarih bilgisi

---

## 🔧 Teknik Özellikler

- **Runtime:** Node.js 18+
- **Framework:** Discord.js v14
- **Database:** JSON (config.json)
- **Hosting:** Kendi bilgisayar / GitHub Actions / Render

---

## 📁 Proje Yapısı

```
.
├── index-full.js           # Ana bot dosyası
├── config.json             # Stok verileri (otomatik oluşur)
├── package.json            # Bağımlılıklar
├── .env                    # Bot token (gizli)
├── README.md              # Bu dosya
├── BAŞLAT.md              # Detaylı kurulum
└── .github/workflows/     # GitHub Actions
    └── bot.yml
```

---

## 📖 Başlangıç

### Adım 1: Token Al
1. [Discord Developer Portal](https://discord.com/developers/applications)
2. "New Application" → İsim ver
3. "Bot" → "Add Bot"
4. Token'ı kopyala

### Adım 2: Bağla
1. .env dosyası oluştur
2. `DISCORD_TOKEN=your_token_here` ekle

### Adım 3: Çalıştır
```bash
npm install
npm start
```

**Tamamlandı!** Bot çalışıyor. ✅

---

## 🐛 Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Komutlar görünmüyor | Botu yeniden başlat ve 5 dakika bekle |
| Token hatası | Token'ı doğru kopyala, .env kaydet |
| Bot çalışmıyor | Node.js yüklü mü? `npm install` çalıştır |
| DM gelmiyor | DM ayarlarını aç veya ephemeral mesaja bak |

---

## 🌐 Çalıştırma Seçenekleri Karşılaştırması

| Seçenek | Maliyet | 24/7 | Sınır | Zorluk |
|---------|---------|------|-------|--------|
| Bilgisayar | Elektrik | ❌ | Yok | ⭐ Kolay |
| GitHub Actions | Ücretsiz | ❌ | 2000 dk/ay | ⭐⭐ Orta |
| Render | Ücretsiz | ✅ | Yok | ⭐⭐ Orta |

**Tavsiye:** Render seçin (24/7 ve ücretsiz)

---

## 📚 Kaynaklar

- [Discord.js Docs](https://discord.js.org/)
- [Discord Developer Docs](https://discord.com/developers/docs)
- [Render Docs](https://render.com/docs)
- [GitHub Actions](https://github.com/features/actions)

---

## 📝 Lisans

MIT License - Özgürce kullan!

---

## 💡 İpuçları

✅ Token'ı .env dosyasında sakla (GitHub'a yükleme)  
✅ config.json'u düzenli yedekle  
✅ Geliştirme için `npm run dev` kullan  
✅ Production'da Render kullan  

---

**Sorular? GitHub Issues'da soru aç!** 🎮