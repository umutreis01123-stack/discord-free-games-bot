# Roblox Blox Fruits Stok Bot

Discord sunucunuzda Roblox Blox Fruits hesaplarını yönetip paylaşan bot.

## Özellikler

### Ana Komutlar
1. **`/bloxfruitkur`** - Blox Fruits stok sistemini aç
   - GUI ile tüm stokları görüntüle
   - Select menu ile Fruit seç
   - Rastgele Fruit çek butonu

2. **`/bloxkanal`** - Stok kanalını ayarla
   - Yeni Fruit eklendiğinde bu kanala duyuru gönderilir

3. **`/fruityekle`** - Yeni Fruit ekle
   - Fruit adı, oyuncu adı, şifre ile yeni hesap ekle
   - Otomatik kanal'a duyuru gönderilir

### Stok Sistemleri
- **Select Menu** - Fruit türüne göre filtrele
- **Rastgele Çekiliş** - "Şanslı" butonuyla rastgele Fruit çek
- **DM Gönderme** - Detayları kullanıcının DM'ine gönder
- **GUI Arayüzü** - Güzel ve kullanıcı dostu tasarım

### Desteklenen Fruits
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

## Kurulum

### 1. Gereksinimler
- Node.js v18+
- Discord Bot Token

### 2. Bağımlılıkları Yükle
```bash
npm install
```

### 3. Token'ı `.env` Dosyasına Koy
```
DISCORD_TOKEN=your_token_here
```

### 4. Botu Başlat
```bash
node index-full.js
```

## Kullanım

### Admin Komutları

#### `/bloxfruitkur`
Blox Fruits yönetim panelini açar.
- Stoktaki tüm Fruits'ler görüntülenir
- Select menu ile Fruit seçilir
- "Rastgele Fruit Çek" butonu ile şansa katılır
- Seçilen Fruit'in detayları DM'e gönderilir

#### `/bloxkanal <kanal>`
Stok kanalını ayarlar.
- Yeni Fruit eklendiğinde bu kanala duyuru gönderilir
- Örnek: `/bloxkanal #stok-duyuruları`

#### `/fruityekle <fruit> <oyuncu_adı> <şifre>`
Yeni Fruit ekler.
- Örnek: `/fruityekle Mera eloysturk 123456`
- Otomatik olarak kanal'a duyuru gönderilir

## Komut Örnekleri

```bash
# Stok kanalı ayarla
/bloxkanal kanal: #stok-duyuruları

# Mera Fruit ekle
/fruityekle fruit: Mera oyuncu_adı: player123 şifre: mypassword

# Gomu Fruit ekle
/fruityekle fruit: Gomu oyuncu_adı: player456 şifre: pass123

# Sistemini aç ve stokları gör
/bloxfruitkur
```

## Config Yapısı

```json
{
  "bloxFruitChannel": "channel_id",
  "fruits": [
    {
      "name": "Mera",
      "username": "oyuncu_adı",
      "password": "şifre",
      "addedAt": 1234567890,
      "addedBy": "user_id"
    }
  ]
}
```

## Özellikler

### 🎯 Select Menu
- Tüm Fruit türlerini dropdown'dan seç
- Seçilen Fruit'in tüm hesaplarını göster
- Otomatik DM'e gönder

### 🎲 Rastgele Çekiliş
- "Rastgele Fruit Çek" butonu
- Stoktaki herhangi bir Fruit rastgele seç
- Kazananı DM'e bildir

### 📬 DM Gönderme
- Fruit detayları kullanıcının DM'ine gönderilir
- DM kapalıysa ephemeral mesaj olarak gösterilir
- Güvenli şifre gösterimi (||şifre||)

### 📢 Kanal Duyuruları
- Yeni Fruit eklenince stok kanalına otomatik duyuru
- Renkli embed mesajları
- Ekleyen kişi ve tarih bilgisi

## Sorun Giderme

### Bot çalışmıyor
- Token'ı kontrol edin
- Botun sunucuda olduğundan emin olun
- Admin izinlerini kontrol edin

### Komutlar görünmüyor
- Botu yeniden başlatın
- Sunucudan çıkarıp tekrar ekleyin
- 5 dakika bekleyin

### DM gelmiyor
- DM ayarlarınızı kontrol edin
- Ephemeral mesajda detayları görüntüleyin

## Lisans
MIT License