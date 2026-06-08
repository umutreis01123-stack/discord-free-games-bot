# 🍎 Roblox Blox Fruits Spawn Tracker Bot

Discord'da Roblox Blox Fruits oyunundaki fruit spawnlarını 7/24 takip eden bot.

## ✨ Özellikler

- 🔔 **Real-time Bildirim** - Fruit spawn olunca anında Discord'a haber ver
- 📊 **Otomatik Takip** - Her 2 saatte bir fruit spawn kontrolü
- 🎮 **27+ Fruit Desteği** - Tüm Blox Fruits mevcut
- ⚡ **Komut Tabanlı Yönetim** - Admin komutları ile kontrol et
- 📍 **Konum Bilgisi** - Spawn konumunu belirt

## 🚀 Komutlar

### `/fruittakip`
Blox Fruits takip panelini açar.
- Takip edilen fruits listesi
- Spawn aralığı bilgisi
- Sistem durumu

### `/fruitkanal <kanal>`
Fruit spawn bildirimlerinin geleceği kanalı ayarlar.
- Örnek: `/fruitkanal kanal: #fruit-spawnlar`

### `/fruitspawn <fruit> <konum>`
Manuel olarak fruit spawn ekler.
- Örnek: `/fruitspawn fruit: Mera konum: Starter Island`

## 📋 Desteklenen Fruits

🔥 Mera • 🟠 Gomu • ⬛ Yami • 💨 Logia • ✨ Paramecia • 🐾 Zoan • 👹 Mythical • 🌋 Magma • 🔥 Flame • ❄️ Ice • ⚡ Lightning • 🧵 String • 🏜️ Sand • 🌵 Spike • 💨 Smoke • 🪓 Chop • 🔩 Spring • 💣 Bomb • ⚖️ Kilo • 🍪 Dough • ☠️ Venom • 🔊 Rumble • 🧘 Buddha • 👤 Human Human • 🦅 Falcon • 🐕 Hound • 🐱 Cat • 🐭 Mouse

## 🎯 Kullanım

1. Bot'ı sunucuya ekle
2. `/fruitkanal` ile bildirim kanalı ayarla
3. `/fruittakip` ile panel aç
4. Fruit spawn olduğunda otomatik bildirim gel

## ⚙️ Kurulum

### Environment Variables

Railway'de şu variable'ı ekle:
```
DISCORD_TOKEN = your_token_here
```

### Config

Bot otomatik `config.json` oluşturur.

## 📊 Spawn Sistemi

- **Aralık:** Her 2 saat
- **Otomatik:** 7/24 çalışır
- **Bildirim:** @here mention ile haber ver
- **Konum:** Her spawn için konum belirtilir

## 🔒 İzinler

- `/fruitkanal` - Admin only
- `/fruitspawn` - Admin only
- `/fruittakip` - Herkes

## 📱 Discord Notifications

Fruit spawn olduğunda:
- 🔔 @here ping
- Fruit adı ve emoji
- Spawn konumu
- Rarity bilgisi
- Spawn zamanı

## 🎮 Roblox Hesap

Bot, configure edilmiş Roblox hesabı kullanarak oyunu takip eder.

## 📞 Komut Ayarı

Railway'de redeploy sonrası komutlar 1-2 dakika içinde aktif olur.

## ✅ Kontrol Listesi

- [ ] Token ekledi
- [ ] Bot sunucuya ekledi
- [ ] `/fruitkanal` ile kanal ayarladı
- [ ] `/fruittakip` ile paneli açtı
- [ ] Notification'lar geliyor

---

**Bot hazır! Fruit spawnlarını kaçırma!** 🍎🚀