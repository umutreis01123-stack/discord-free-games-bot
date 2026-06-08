# 🎮 ShadowBot - Admin Panel Bot

Discord sunucusu yönetim botu + Web Dashboard. Mesaj gönder, duyuru yap, istatistikleri takip et!

## ✨ Özellikler

- 📨 **DM Gönder** - Tek kullanıcıya mesaj
- 📬 **Toplu DM** - Sunucudaki herkese veya role mesaj
- 📢 **Duyuru Sistemi** - Kanal'a renkli duyuru gönder
- 📊 **Web Dashboard** - Admin paneli ve istatistikler
- 🔐 **Admin Only** - Sadece yöneticiler kullanabilir

## 🚀 Komutlar

### `/dm <kullanıcı> <mesaj>`
Belirtilen kullanıcıya DM gönder.

### `/topludm <mesaj> [rol]`
Toplu DM gönder. Rol belirtilmezse herkese gönder.

### `/duyuru <başlık> <içerik> [renk]`
Duyuru gönder (mavi, yeşil, kırmızı, mor).

### `/duyurukanal <kanal>`
Duyuruların geleceği kanalı ayarla.

### `/panel`
Admin panelini aç (istatistikler).

## 📊 Web Dashboard

Bot çalışırken http://localhost:3001 adresine erişebilirsiniz.

**Özellikler:**
- İstatistikler (DM, Toplu DM, Duyuru)
- Komut listesi
- Sunucu yönetimi
- Dark theme (ShadowMC tarzı)

## 🔧 Kurulum

### Railway'de

1. Token ekle: `DISCORD_TOKEN=your_token`
2. Redeploy et
3. `/duyurukanal` ile kanal ayarla
4. Komutları kullan!

### Lokalde

```bash
npm install
npm start
```

## 📋 Config Dosyası

`config.json` otomatik oluşur:

```json
{
  "announceChannel": null,
  "users": {},
  "messages": [],
  "stats": {
    "dmsSent": 0,
    "bulkDmsSent": 0,
    "announcementsSent": 0
  }
}
```

## 🎯 Kullanım Örneği

```
/dm @kullanıcı Merhaba!
/topludm Sunucu duyurusu @role:Moderatör
/duyuru "Sunucu Haber" "Sunucu güncellemesi..." mavi
/duyurukanal #duyurular
/panel
```

## 📱 Özellikler

✅ Admin paneli arayüzü  
✅ Real-time istatistikler  
✅ Toplu mesajlaşma  
✅ Renkli duyurular  
✅ Web dashboard  
✅ Railroad tarafından çalışacak  

## ⚙️ Gereksinimler

- Node.js 18+
- Discord Bot Token
- Express.js (web server)

## 📞 Destek

Hata varsa logs'a bak:
```
/panel
```

---

**ShadowBot v1.0 - Sunucu Yönetim Botu** 🚀