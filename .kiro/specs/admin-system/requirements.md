# Admin Panel ve Sistem Gereksinimleri

## 1. Web Admin Paneli

### Giriş Sistemi
- Kullanıcı: `umut`
- Şifre: `umutpapa001122u`
- Giriş ve Kayıt Ol butonları olacak

### Ana Sayfa
- Sunucu sayısı gösterilecek
- Stoklar butonu olacak (başındaki ana buton)
- Yönetim Paneli butonu (sağ tarafta)

### Stoklar Sayfası
- Admin sitede stok oluşturur:
  - Stok adı
  - Miktar
  - Kaç kredi değerinde
  - Görsel URL
  - Kredi verme sistemi

### Yönetim Paneli (Sağ Menü)
- Duyurular
- Promosyon Kodları
  - Ekle
  - Süreli ekle
  - Kaldır
- Sunuculara mesaj gönder
- Üye e-postaları ve yönetimi

## 2. Kredi Sistemi
- Kullanıcı stok almak için tıklar
- Kaç adet alacağını seçer
- Kriteri otomatik hesaplanır (stok × kredi değeri)
- Discord botunda: Stokları farklı şekilde gösterilir

## 3. Promosyon Kodu Sistemi
- Admin panelinde oluşturulur
- Hediye: Ya kredi YA DA hesap
- `/promosyonkodukullan <kod>` komutu
- Bot DM'den kazanılan şeyi gönderir

## 4. Destek Siparişi Komutu
- `/desteksiparişkur`
- Konu ve açıklama formu
- Ticket kanalı oluşturur
- Kanal başında: "zwozez modorasyon" yazısı
- Arka planda bot görüntüsü + kullanıcı profili

## 5. E-posta Sistemi
- Kayıt olurken bot yazacak: "zwozez modorasyon"
- E-posta saklanacak
- Admin panelinde görünecek

## 6. Komutlar (Sadece umutpapa123)
- `/desteksiparişkur` - Ticket açma
- Diğer komutlar botada olmayacak, siteden yapılacak

## 7. Bedava Hesap Cooldown
- 4 saat de bir kullanılabilir (güncelleme)
