# 🎮 ShadowCore - Çekiliş & Duyuru Botu

Discord sunucusu yönetim botu. Çekiliş oluştur, duyuru gönder, istatistikleri takip et!

## ✨ Özellikler

- 🎉 **Çekiliş Sistemi** - Çekiliş oluştur, katılımcıları takip et
- 📢 **Duyuru Sistemi** - Kanal'a renkli duyuru gönder
- 📊 **Web Dashboard** - Admin paneli ve istatistikler
- 🔐 **Admin Only** - Sadece yöneticiler duyuru gönderebilir
- 💜 **ShadowCore Tasarımı** - Modern ve profesyonel arayüz

## 🚀 Komutlar

### `/çekiliş ekle <ödül> [açıklama]`
Yeni çekiliş oluştur. Katılımcılar butonla çekilişe katılabilir.

### `/duyuru <başlık> <içerik> [renk]`
Duyuru gönder (Admin only). Renkler: mavi, yeşil, kırmızı, mor

### `/duyuru kanal ayarla <kanal>`
Duyuruların geleceği kanalı ayarla (Admin only).

## 📊 Web Dashboard

Bot çalışırken http://localhost:3001 adresine erişebilirsiniz.

**Sayfalar:**
- 📊 Dashboard - Ana sayfa, istatistikler
- 🎉 Çekilişler - Tüm çekiliş aktiviteleri
- 📢 Duyurular - Gönderilen duyurular
- 📈 İstatistikler - Sistem aktivitesi

**Tasarım:**
- Dark theme (ShadowCore tarzı)
- Responsive (mobil uyumlu)
- Real-time istatistikler

## 🔧 Kurulum

### Railway'de

1. Repository'yi fork et
2. Railway'e bağla
3. Token ekle: `DISCORD_TOKEN=your_token`
4. Deploy et
5. Bot hazır!

### Lokalde

```bash
npm install
npm start
```

http://localhost:3001 adresine git

## 📋 Config Dosyası

`config.json` otomatik oluşur:

```json
{
  "duyuruKanali": null,
  "cekilisler": [],
  "istatistikler": {
    "duyuruSayisi": 0,
    "cekilislikSayisi": 0
  }
}
```

## 🎯 Kullanım Örneği

```
/çekiliş ekle "Nitro 3 Ay" "Çekilişe katılmak için butona tıkla!"
/duyuru "Sunucu Güncellemesi" "Yeni özellikler eklendi!" mor
/duyuru kanal ayarla #duyurular
```

## 📱 Özellikler

✅ Çekiliş sistemi  
✅ Duyuru gönderimi  
✅ Real-time istatistikler  
✅ Web dashboard  
✅ Admin kontrolleri  
✅ Railway tarafından deploy edilebilir  

## ⚙️ Gereksinimler

- Node.js 18+
- Discord Bot Token
- Express.js (web server)

## 📞 API

### `GET /api/stats`
İstatistikleri getir

### `GET /api/giveaways`
Tüm çekiliş verilerini getir

---

**ShadowCore v2.0 - Çekiliş & Duyuru Yönetim Sistemi** 💜