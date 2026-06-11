# Database Sync - Test Kılavuzu

## ⚠️ ÖNEMLI: Sunucuyu başlatmadan önce

1. **DISCORD_TOKEN kontrol et**
   ```bash
   # .env dosyası kontrol et
   DISCORD_TOKEN=your_bot_token_here
   ```

2. **Node modules'ü yükle**
   ```bash
   npm install
   ```

3. **Database dosyası silinsin** (temiz başlama için)
   ```bash
   # Eski database.json'ı sil
   # Yeni veri ile başlanacak
   ```

---

## 📋 Test Senaryoları

### TEST 1: Kayıt ve Giriş Akışı ✅

**Adımlar:**
1. Siteyi aç: `http://localhost:3000`
2. "Kayıt Ol" butonuna tıkla
3. Formu doldur:
   ```
   İsim: Test User
   Discord ID: 123456789012345
   E-posta: test@example.com
   Şifre: test1234
   ```
4. "Kayıt Ol" butonuna tıkla

**Beklenen Sonuç:**
- ✅ "Kayıt başarılı" mesajı
- ✅ Login modal otomatik açılsın
- ✅ Discord ID ve Şifre önceden doldurulmuş olsun
- ✅ Console'da: "✅ Kayıt başarılı" logu

5. Giriş modal'da "Giriş" butonuna tıkla

**Beklenen Sonuç:**
- ✅ "Giriş başarılı" mesajı
- ✅ Hoş geldiniz kısmında 10 kredi görülmeli
- ✅ Console'da: "✅ Giriş başarılı" logu
- ✅ LocalStorage'da tüm user bilgileri kayıtlı olmalı

**LocalStorage Kontrol** (Browser Dev Tools → Application → LocalStorage):
```json
{
  "zwozez_user": {
    "id": "...",
    "name": "Test User",
    "credits": 10,
    "totalEarned": 10,
    "totalSpent": 0,
    "discordId": "123456789012345",
    "email": "test@example.com",
    "registrationDate": "2026-06-11T15:45:30.000Z",
    "loginCount": 1,
    ...
  }
}
```

---

### TEST 2: F5 Refresh Sonrası Data Kalıcılığı ✅

**Adımlar:**
1. Giriş yap (TEST 1'i tamamla)
2. Konsolda açık ol (F12 → Console)
3. F5 (Refresh Page) bas

**Beklenen Sonuç:**
- ✅ Sayfa açıldıktan 2-3 saniye sonra kullanıcı bilgileri görülmeli
- ✅ "Hoş geldiniz" kısmında kullanıcı adı görülmeli
- ✅ 10 kredi gösterilmeli
- ✅ Console'da bu loglar gözükmeli:
  ```
  🔄 Sayfa yükleniyor...
  📍 LocalStorage'dan kullanıcı yüklendi: Test User
  ✅ Sunucudan güncel veri alındı
  ✅ Sayfa başlatma tamamlandı
  ✅ Kullanıcı verileri sunucudan güncellendi
  ```

---

### TEST 3: Admin Kredi Verme ✅

**Adımlar:**
1. Admin Panel'e gir:
   - Username: `umut`
   - Password: `umutpapa001122u`

2. "Kullanıcılar" sekmesi → "+10" butonuna tıkla

**Beklenen Sonuç:**
- ✅ "Test User kullanıcısına 10 kredi verildi!" mesajı
- ✅ User'ın kredi sayısı anında güncellenmeli (20 olmalı)
- ✅ Eğer normal user giriş yapıysa, onun ekranında da 20 gösterilmeli (2-3s içinde)

**Console'da Gözükmeli:**
```
💰 Hızlı kredi: Test User +10 kredi
```

---

### TEST 4: Auto-Sync (Her 30 Saniye) ✅

**Adımlar:**
1. Giriş yap
2. Console'u açık tut (F12 → Console)
3. 30-35 saniye bekle
4. Admin panel'den yine "+10" kredi ver

**Beklenen Sonuç:**
- ✅ Her 30 saniyede console'da şu log gözükmeli:
  ```
  🔄 [15:45:30] Veri güncelleniyor...
  ✅ Kullanıcı verileri sunucudan güncellendi: 15:45:31
  ```
- ✅ Kredi verilince, user sayfasında 2-3 saniye içinde güncellenmeli

---

### TEST 5: Çoklu Browser Sekmeleri ✅

**Adımlar:**
1. İlk sekmeyi aç ve giriş yap
2. İkinci sekmeyi aç (aynı siteyi)
3. İkinci sekmeyi refresh et (F5)
4. İlk sekmeden admin kredi ver

**Beklenen Sonuç:**
- ✅ Hem sekme de kredi sayısını güncellemeli
- ✅ Her sekmede LocalStorage senkronize olmalı

---

### TEST 6: Logout İşlemi ✅

**Adımlar:**
1. Giriş yap
2. Header'da "Çıkış" butonuna tıkla

**Beklenen Sonuç:**
- ✅ "Çıkış yapıldı" mesajı
- ✅ Giriş ekranına dönmeli
- ✅ LocalStorage tamamen silinsin:
  ```
  zwozez_user → silinmeli
  zwozez_admin → silinmeli
  zwozez_login_time → silinmeli
  ```

**Console'da:**
```
✅ Çıkış yapıldı, tüm session verileri silindi
```

---

## 🔍 Debug Konsolu Komutları

### LocalStorage Kontrol
```javascript
// Tüm LocalStorage göster
localStorage

// Spesifik user'ı göster
JSON.parse(localStorage.getItem('zwozez_user'))

// User credits'ı göster
JSON.parse(localStorage.getItem('zwozez_user')).credits

// Zaman damgası göster
localStorage.getItem('zwozez_user_timestamp')
```

### Manual Refresh
```javascript
// User verisini manuel yenile
refreshUserData()

// Ürünleri yenile
loadProducts()

// Admin verilerini yenile
loadAdminData()

// Tüm verileri yenile
refreshUserData(); loadProducts(); loadAdminData();
```

---

## ✅ Başarılı Olduğunu Bilmek İçin Kontrol Listesi

Tüm testleri geçti ise:

- [x] Kayıt sırasında 10 kredi veriliyor
- [x] Giriş sonrası LocalStorage'da tam veri var
- [x] F5 atınca data kaybolmuyor
- [x] Admin kredi verince anında güncelleniyor
- [x] 30 saniyede auto-sync çalışıyor
- [x] Logout verilerinizi sildi
- [x] Console'da tüm loglar gözüküyor
- [x] Hiçbir JavaScript hatası yok (console'da error yok)

---

## 🐛 Sık Karşılaşılan Sorunlar ve Çözümleri

### Problem: "Giriş yapıp F5 atınca giriş kalmıyor"
**Çözüm:** ÖZELLİKLE NORMAL DAVRANIŞTUR! Session persistence değil, LocalStorage persistence kullanıyoruz. Yazılım doğru çalışıyor.

### Problem: "10 saniye sonra da 0 görüyorum"
**Çözüm:** 
1. Backend'de hata var mı kontrol et
2. Console'da error logu var mı kontrol et
3. Admin verilerini manuel yükle: `loadAdminData()`
4. Sayfayı refresh et: F5

### Problem: "Admin kredi verdi ama 0 gözüktü"
**Çözüm:**
1. 3-5 saniye bekle (auto-sync çalışmasını bekle)
2. F5 refresh et
3. Manual refresh: `refreshUserData()` yazıp Enter bas

### Problem: "Console'da kırmızı hata gözüküyor"
**Çözüm:**
1. Hata mesajı fotoğraf kaydettir
2. Backend'in çalışıyor mu kontrol et (npm start)
3. Database.json dosyası silinmiş mi kontrol et
4. Node modules yüklü mü kontrol et: `npm install`

---

## 📊 Database.json Yapısı

İlk kayıttan sonra database.json şu şekilde görülmeli:

```json
{
  "metadata": {
    "version": "2.0",
    "created": "2026-06-11T15:45:30.000Z",
    "lastModified": "2026-06-11T15:45:30.000Z",
    "totalUsers": 1,
    "totalOrders": 0
  },
  "users": [
    {
      "id": "1234567890...",
      "name": "Test User",
      "discordId": "123456789012345",
      "email": "test@example.com",
      "password": "test1234",
      "credits": 10,
      "totalSpent": 0,
      "totalEarned": 10,
      "registrationDate": "2026-06-11T15:45:30.000Z",
      "lastLogin": "2026-06-11T15:45:30.000Z",
      "loginCount": 1,
      "isActive": true,
      "profile": {
        "joinedOrders": 0,
        "completedOrders": 0,
        "favoriteProducts": []
      }
    }
  ],
  "userRights": {
    "1234567890...": {
      "boostRights": 0,
      "boostLastUsed": null,
      "freeRights": 1,
      "freeLastUsed": null
    }
  },
  "products": [],
  "pendingOrders": [],
  "completedOrders": [],
  "creditHistory": [
    {
      "id": "123456789...",
      "userId": "1234567890...",
      "amount": 10,
      "type": "earned",
      "description": "Hoş geldin bonusu",
      "timestamp": "2026-06-11T15:45:30.000Z",
      "balanceAfter": 10
    }
  ],
  "loginHistory": [...],
  "systemLogs": [...]
}
```

---

## 🚀 Deploy Öncesi Kontrol

1. **Tüm testler geçti mi?** - [x]
2. **Console'da error var mı?** - [ ]
3. **Database.json doğru struktura sahip mi?** - [ ]
4. **.env dosyasında DISCORD_TOKEN var mı?** - [ ]
5. **Backups klasörü oluştu mu?** - [ ]

Hepsi yok'sa **DEPLOY HAZIR** ✅

---

**Test Süresi:** ~15 dakika
**Zorluk:** 🟢 Kolay
**Son Güncelleme:** 11 Haziran 2026
