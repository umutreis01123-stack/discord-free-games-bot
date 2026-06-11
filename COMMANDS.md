# 🤖 Discord Bot Komutları

Tüm mevcut komutları buradan görebilirsin.

---

## 📌 Slash Komutları (Sunucuda yazılacak)

### 🎮 OYUN & HESAP KOMUTLARı

#### `/ürünekle` (Admin Only)
- **Açıklama:** Yeni stok ekle
- **Parametreler:**
  - `stok_ismi` - Stok adı (örn: Steam, Epic)
  - `adet` - Kaç adet stok var
- **Örnek:** `/ürünekle stok_ismi:Steam adet:100`
- **Dönen:** Stok başarıyla eklendi mesajı

#### `/boosthesap`
- **Açıklama:** Boost yapanlar için ücretsiz hesap al
- **Parametreler:** Yok
- **Gereklilik:** Sunucuya boost yapmış olmak gerekir
- **Dönen:** Random Steam hesabı DM'de
- **Not:** İlk kullanımda 4 hesap, sonra 1 hesap

#### `/bedavahesap`
- **Açıklama:** Bedava hesap al (eğer hakkın varsa)
- **Parametreler:** Yok
- **Dönen:** Random hesap DM'de
- **Bekleme:** Her 4 saatte bir

---

### 💜 OWO ÖDEME SİSTEMİ

#### `/owoileode`
- **Açıklama:** OWO ile ürün satın al
- **Parametreler:** Yok
- **Akış:**
  1. Rastgele bir ürün seçilir
  2. OWO gönderme talimatı gösterilir
  3. Sipariş kaydedilir ve admin'e bildirim gönderilir
- **Sonraki Adım:** `/owoödemealdı` komutunu çalıştır
- **OWO Miktarı:** 7650 OWO (varsayılan)

#### `/owoödemealdı`
- **Açıklama:** OWO ödeme aldıktan sonra hesapı al
- **Parametreler:** Yok
- **İşlem:**
  1. Pending ödemeyi bulur
  2. Random Steam hesabı seçer
  3. Hesabı DM'de gönderir
  4. Geçmişe ekler
- **Not:** Bunu `/owoileode`'den sonra kullan

#### `/owogeçmişi`
- **Açıklama:** Sana gönderilen tüm OWO'ları göster
- **Parametreler:** Yok
- **Dönen:** Son 10 OWO işlemi
- **İçerik:** Tutar, tarih, ürün adı

#### `/kredial`
- **Açıklama:** Kredi satın al (OWO ile) - **SUNUCUDA GÖRÜNÜR**
- **Parametreler:**
  - `kredi` - Kaç OWO göndermek istiyorsun
- **Örnek:** `/kredial kredi:7650`
- **İşlem:**
  1. OWO transfer talebi oluşturulur
  2. Admin'e bildirim gönderilir
  3. OWO göndermek için talimat verilir
  4. Admin onayladıktan sonra krediler eklenir

---

### 🎫 TICKET SİSTEMİ

#### `/ticket`
- **Açıklama:** Destek ticket'ı aç
- **Parametreler:** Yok
- **Dönen:** Ticket kanalı oluşturulur

#### `/destekkur`
- **Açıklama:** Destek talebi oluştur
- **Parametreler:** Yok
- **Dönen:** Destek kanalı oluşturulur

#### `/sorumlu` (Admin Only)
- **Açıklama:** Ticket sorumlusu ekle
- **Parametreler:**
  - `kullanici` - Sorumlu olacak kullanıcı
- **Örnek:** `/sorumlu kullanici:@username`

---

### 🎉 ÇEKİLİŞ & EVENT

#### `/çekiliş`
- **Açıklama:** Çekiliş başlat
- **Parametreler:**
  - `süre` - Çekiliş süresi (saniye)
  - `kazanan` - Kaç kişi kazanacak
- **Örnek:** `/çekiliş süre:300 kazanan:2`
- **Dönen:** Çekiliş başlar, katılacak button gösterilir

#### `/hakver` (Admin Only)
- **Açıklama:** Kullanıcıya hak ver
- **Parametreler:**
  - `tip` - Hak tipi (Boost Hesap / Bedava Hesap)
  - `kullanici` - Kime verilecek
  - `adet` - Kaç hak
- **Örnek:** `/hakver tip:Boost\ Hesap kullanici:@username adet:3`

---

### ℹ️ BİLGİ KOMUTLARı

#### `/sunucu`
- **Açıklama:** Sunucu bilgilerini göster
- **Parametreler:** Yok
- **Dönen:** 
  - Sunucu adı
  - Sunucu ID
  - Üye sayısı
  - Boost sayısı
  - Rol sayısı

#### `/log`
- **Açıklama:** Sohbet logları ve ses aktivitesini göster
- **Parametreler:** Yok
- **Dönen:**
  - Bot logları
  - Ses kanalında olan kişiler
  - Sunucu istatistikleri

---

## 📝 Mesaj Komutları (Prefix Komutları)

Bu komutlar sadece mesaj yazılarak çalışır, `/` olmadan!

### `-sil`
- **Açıklama:** Bugün yazılan tüm mesajları sil
- **Kullanım:** Kanala `-sil` yaz
- **Gereklilik:** Admin olmalısın
- **İşlem:**
  1. Kanal taraması başlar
  2. Bugünün başından beri yazılan mesajlar silinir
  3. 3 saniye sonra sonuç mesajı da silinir
- **Not:** Yalnızca bugünün mesajları silinir

### `-resetle`
- **Açıklama:** Kanalı sıfırla (ayarlarıyla birlikte geri oluştur)
- **Kullanım:** Kanala `-resetle` yaz
- **Gereklilik:** Admin olmalısın
- **İşlem:**
  1. Kanal silinir
  2. Yeni kanal oluşturulur (aynı ayarlarla)
  3. Tüm izinler, başlık, kategori korunur
  4. Yeni kanala başarı mesajı gönderilir
- **Sonuç:** Temiz kanal, tüm eski ayarları korunmuş

### `-eventyap [sayı]`
- **Açıklama:** Event oluştur (katılım butonları)
- **Kullanım:** `-eventyap 5` (1-25 arası sayı)
- **Gereklilik:** Admin olmalısın
- **İşlem:**
  1. Belirtilen sayıda button oluşturulur
  2. Buttonlar "Katıl #1", "Katıl #2" vb. isimlendirilir
  3. Her button 5'li satırlar halinde düzenlenir
- **Sonraki Adım:** `-eventbitir` yazarak event'i bitir

### `-eventbitir`
- **Açıklama:** Actif event'leri bitir ve kazananları seç
- **Kullanım:** Kanala `-eventbitir` yaz
- **Gereklilik:** Admin olmalısın
- **İşlem:**
  1. Kanaldaki aktif event'ler bulunur
  2. Her button başına random 1 kazanan seçilir
  3. Kazananlar otomatik etiketlenir (@mention)
  4. Sonuçlar kanala yazılır
- **Dönen:** Kazananlar listesi

---

## 🔐 Admin Komutları

Sadece bot sahibi (OWNER_ID) çalıştırabileceği komutlar:

- `/ürünekle` - Yeni stok ekle
- `/hakver` - Kullanıcıya hak ver
- `/sorumlu` - Ticket sorumlusu ekle
- `-resetle` - Kanalı sıfırla
- `-sil` - Mesajları sil
- `-eventyap` - Event oluştur
- `-eventbitir` - Event'i bitir

---

## 💡 Kullanım Örnekleri

### Örnek 1: OWO ile Ürün Satın Alma
```
1. /owoileode → Ürün ve OWO talimatı gösterilir
2. OWO botuna: /w send @umutpapa123 7650
3. /owoödemealdı → Steam hesabı DM'de gelir
```

### Örnek 2: Event Oluşturma
```
1. -eventyap 3 → 3 butonlu event oluşturulur
2. Kullanıcılar "Katıl" butonlarına tıklarlar
3. -eventbitir → Random kazananlar seçilir ve etiketlenir
```

### Örnek 3: Boost Hesap Alma
```
1. Sunucuya boost yap
2. /boosthesap yazıp çalıştır
3. DM'den 4 Steam hesabı al
```

---

## ⚙️ Sistem Komutları (İç Kullanım)

Bu komutlar bot tarafından otomatik olarak çalışır:

- **Kanal Oluşturma:** Ticket/Destek talebinde kanal açılır
- **Mesaj Silme:** Event bittiğinde eski mesajlar temizlenir
- **Database Backup:** Her kayıttan sonra yedek alınır
- **Log Kaydı:** Tüm işlemler sistem loglarına kaydedilir

---

## 📌 Kısayollar

| Komut | Ne İçin | Kısaltma |
|-------|---------|----------|
| `/owoileode` | OWO ile ürün satın al | Ürün Al |
| `/owoödemealdı` | Hesap al | Hesap Al |
| `/owogeçmişi` | Geçmiş gör | Tarih |
| `-eventyap` | Event aç | Event Aç |
| `-eventbitir` | Event bitir | Kazanan Seç |
| `/boosthesap` | Boost hediyesi | Boost |
| `/bedavahesap` | Bedava hesap | Bedava |

---

## ❌ Sık Yapılan Hatalar

### "❌ Bekleyen ödeme bulunamadı"
- Neden: `/owoileode` çalıştırmadan `/owoödemealdı` çalıştırdın
- Çözüm: Önce `/owoileode` çalıştır, sonra OWO gönder, sonra `/owoödemealdı` çalıştır

### "❌ Stokta hesap kalmadı"
- Neden: Tüm hesaplar kullanıldı
- Çözüm: Admin yeni hesap eklemeli `/ürünekle`

### "❌ Sadece admin bu komutu kullanabilir"
- Neden: Sen admin değilsin
- Çözüm: Admin ile iletişime geç

### "⚠️ 1-25 arası geçerli bir sayı girin"
- Neden: `-eventyap` komutuna 26+ yazıp veya 0 yazıp çalıştırdın
- Çözüm: 1-25 arası sayı kullan: `-eventyap 5`

---

## 🆘 Yardım İhtiyacı?

Sorular için:
- Admin'e `/ticket` aç
- `/destekkur` ile destek talebi oluştur
- Discord sunucusunda destek kanalına yaz

---

**Son Güncelleme:** Haziran 2024

