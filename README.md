# Discord Ücretsiz Oyun & Bedava Hesap Botu

Discord sunucunuzda ücretsiz oyunları otomatik olarak paylaşan ve bedava hesap dağıtan bir bot.

## Özellikler

### Oyun Paylaşım Sistemi
- **3 Komut:**
  1. `/oyunkanalıayarla` - Ücretsiz oyunların paylaşılacağı kanalı belirler ve **HEMEN oyunları paylaşmaya başlar!**
  2. `/oyunkanalıkaldır` - Ayarlanan kanalı kaldırır
  3. `/bütünücretsizoyunlarıpaylaş` - **TÜM Steam ücretsiz oyunlarını tek seferde paylaşır!**

- **Platform Desteği:**
  - **Steam** - Tüm ücretsiz oyunlar (Free to Play, indirimdeki ücretsiz oyunlar)
  - **Epic Games** - Temel destek (isteğe bağlı aktif edilebilir)

### Bedava Hesap Sistemi (YENİ!)
- **Admin Komutları (sadece umutpapa123):**
  1. `/ürünekle` - Yeni ürün/hesap ekler
  2. `/stokekle` - Roblox hesabı ekler
  3. `/çekilişekle` - Yeni çekiliş başlatır
  4. `/stokkanalekle` - Stokların gösterileceği kanalı ayarlar

- **Kullanıcı Komutları:**
  1. `/bedavahesap` - Bedava hesap çek (günde 1 kez, %10 şans)
  2. `/kayıtol` - Sisteme kayıt ol (oto giriş yapar)
  3. `/hesapgiriş` - Kayıtlı hesabına giriş yap

### Ticket Sistemi
- **3 Komut:**
  1. `/ticketkur` - Ticket sistemini kurar (butonlu)
  2. `/sunucukurallarıoku` - Sunucu kurallarını okur ve kaydeder
  3. `/ticketyetkili` - Ticket yetkilisi ekler/çıkarır

### Akıllı Özellikler
- **Otomatik @everyone bildirimi** - Her oyun paylaşımında
- **Renkli embed mesajları** - Her oyun için rastgele renk
- **Oyun türü tahmini** - Otomatik tür belirleme
- **Rate limit koruması** - Discord limitlerine uygun paylaşım
- **Hata yönetimi** - Hatalı oyunları atlayıp devam eder
- **DM kapalı kontrolü** - DM kapalıysa özel mesaj olarak gösterir
- **Günlük limit** - Günde 1 kez bedava hesap çekme hakkı
- **Çekiliş sistemi** - Butonlu çekiliş katılımı

## Kurulum

### 1. Gereksinimler
- Node.js v18 veya üzeri
- npm veya yarn

### 2. Bot Oluşturma
1. [Discord Developer Portal](https://discord.com/developers/applications) adresine gidin
2. "New Application" butonuna tıklayın
3. Bot adını girin ve oluşturun
4. "Bot" sekmesine gidin ve "Add Bot" butonuna tıklayın
5. "Reset Token" butonuna tıklayıp token'ı kopyalayın
6. "Privileged Gateway Intents" bölümünden:
   - PRESENCE INTENT (isteğe bağlı)
   - SERVER MEMBERS INTENT (isteğe bağlı)
   - MESSAGE CONTENT INTENT (**ZORUNLU**) seçin

### 3. Botu Sunucuya Ekleme
1. "OAuth2" → "URL Generator" sekmesine gidin
2. "Scopes" bölümünden "bot" ve "applications.commands" seçin
3. "Bot Permissions" bölümünden gerekli izinleri seçin:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands
4. Oluşturulan linki kopyalayıp tarayıcıda açın
5. Botu eklemek istediğiniz sunucuyu seçin

### 4. Proje Kurulumu
```bash
# Depoyu klonlayın
git clone [repo-url]
cd discord-ucretsiz-oyun-botu

# Bağımlılıkları yükleyin
npm install

# .env dosyasını düzenleyin
# DISCORD_TOKEN, CLIENT_ID ve GUILD_ID değerlerini girin
```

### 5. .env Dosyasını Düzenleme
`.env` dosyasını açın ve şu değerleri girin:
```
DISCORD_TOKEN=bot_tokeniniz_buraya
CLIENT_ID=bot_client_id_buraya
GUILD_ID=sunucu_id_buraya
```

### 6. Botu Başlatma
```bash
# Geliştirme modunda
npm run dev

# Normal modda
npm start
```

## Kullanım

### Komutlar

#### Oyun Paylaşım Komutları
1. **/oyunkanalıayarla**
   - Ücretsiz oyunların paylaşılacağı kanalı belirler
   - Kullanım: `/oyunkanalıayarla kanal: #oyun-duyuruları`

2. **/oyunkanalıkaldır**
   - Ayarlanan oyun kanalını kaldırır
   - Kullanım: `/oyunkanalıkaldır`

3. **/bütünücretsizoyunlarıpaylaş**
   - Tüm platformlardaki ücretsiz oyunları paylaşır
   - Kullanım: `/bütünücretsizoyunlarıpaylaş`

#### Bedava Hesap Sistemi Komutları
**Admin Komutları (sadece umutpapa123):**
4. **/ürünekle**
   - Yeni ürün/hesap ekler
   - Kullanım: `/ürünekle ürün_adı: "Netflix Premium" kullanıcı_adı: "user123" şifre: "pass123"`

5. **/stokekle**
   - Roblox hesabı ekler
   - Kullanım: `/stokekle roblox_ismi: "robloxUser" roblox_şifresi: "robloxPass"`

6. **/çekilişekle**
   - Yeni çekiliş başlatır
   - Kullanım: `/çekilişekle ödül: "Netflix Hesabı" kazanan_sayısı: 3 süre_dakika: 60`

7. **/stokkanalekle**
   - Stokların gösterileceği kanalı ayarlar
   - Kullanım: `/stokkanalekle kanal: #stok-duyuruları`

**Kullanıcı Komutları:**
8. **/bedavahesap**
   - Bedava hesap çek (günde 1 kez, %10 şans)
   - Kullanım: `/bedavahesap`

9. **/kayıtol**
   - Sisteme kayıt ol (oto giriş yapar)
   - Kullanım: `/kayıtol`

10. **/hesapgiriş**
    - Kayıtlı hesabına giriş yap
    - Kullanım: `/hesapgiriş`

#### Ticket Sistemi Komutları
11. **/ticketkur**
    - Ticket sistemini kurar (butonlu)
    - Kullanım: `/ticketkur kanal: #ticket`

12. **/sunucukurallarıoku**
    - Sunucu kurallarını okur ve kaydeder
    - Kullanım: `/sunucukurallarıoku kanal: #kurallar`

13. **/ticketyetkili**
    - Ticket yetkilisi ekler/çıkarır
    - Kullanım: `/ticketyetkili kullanıcı: @Kullanıcı ekle: true`

### Örnek Paylaşım Formatı
Bot, oyunları **verdiğin örnek formatta** paylaşır:
```
@everyone 🚨 **YENİ ÜCRETSİZ OYUN!** 🚨

🎮 **OYUN_ADI**

🚨 **YENİ OYUN RADARIMIZDA: OYUN_ADI** 🚨

Selam ekip! 🎮 Akşamlara akmalık, saatlerimizi gömeceğimiz ve yeni favorimiz olmaya aday bir oyunla geldim. Atmosferi, gerilimi ve oynanışıyla tam bizlik duruyor.

🏷️ **Fiyat:** ~~49.99 TL~~ → **ÜCRETSİZ**
🎭 **Tür:** Aksiyon/Strateji
🖥️ **Platform:** Steam
🔗 **Steam Linki:** [Hemen İndir](link)
```

### Bedava Hesap Sistemi Nasıl Çalışır?

#### 1. **Admin (umutpapa123) İşlemleri:**
- `/ürünekle` ile Netflix, Spotify, YouTube Premium gibi hesaplar eklenir
- `/stokekle` ile Roblox hesapları eklenir
- `/stokkanalekle` ile stokların gösterileceği kanal ayarlanır
- `/çekilişekle` ile çekilişler başlatılır

#### 2. **Kullanıcı İşlemleri:**
- `/kayıtol` ile sisteme kayıt olunur (oto giriş yapılır)
- `/bedavahesap` ile günde 1 kez bedava hesap çekilir
  - **%10 şans** ile hesap kazanılır
  - Kazanılırsa DM olarak gönderilir
  - DM kapalıysa özel mesaj olarak gösterilir
- `/hesapgiriş` ile kayıtlı hesaba giriş yapılır

#### 3. **Çekiliş Sistemi:**
- Admin çekiliş başlatır
- Kullanıcılar "Katıl" butonuna tıklar
- Süre dolunca rastgele kazananlar seçilir
- Kazananlara DM ile bilgi gönderilir

## Geliştirme

### Yapılandırma
- `config.json`: Sunucu bazlı kanal ayarları ve bedava hesap stokları
- `.env`: Bot token ve ID'leri

### Bağımlılıklar
- `discord.js`: Discord API iletişimi
- `axios`: HTTP istekleri
- `cheerio`: Web scraping
- `dotenv`: Çevre değişkenleri

### Yeni Özelliklerin Yapısı
1. **Bedava Hesap Sistemi:**
   - `config.freeAccounts.stock`: Stoktaki hesaplar
   - `config.freeAccounts.users`: Kayıtlı kullanıcılar
   - `config.freeAccounts.lastDailyUse`: Günlük kullanım takibi
   - `config.freeAccounts.giveaways`: Aktif çekilişler

2. **Güvenlik Özellikleri:**
   - DM kapalı kontrolü
   - Günlük limit kontrolü
   - Şifreler gizli gösterim (||şifre||)
   - Admin kontrolü (sadece umutpapa123)

### Önemli Notlar

1. **/oyunkanalıayarla** komutu çalıştırıldığında:
   - Kanal hemen ayarlanır
   - **Otomatik olarak Steam'deki tüm ücretsiz oyunlar paylaşılmaya başlanır**
   - Her oyun için @everyone bildirimi gönderilir

2. **/bütünücretsizoyunlarıpaylaş** komutu:
   - **TÜM Steam ücretsiz oyunlarını tek seferde paylaşır**
   - 50+ oyun paylaşabilir
   - Rate limit nedeniyle yavaş yavaş paylaşır (1.2 saniye aralıklarla)

3. **Epic Games desteği** mevcut ama varsayılan olarak kapalı. Aktif etmek için `index.js` dosyasında `getEpicFreeGames()` fonksiyonunu kullanabilirsiniz.

## Sorun Giderme

### Bot çalışmıyor
- Token'ın doğru olduğundan emin olun
- Botun sunucuda olduğundan emin olun
- Gerekli izinlerin verildiğinden emin olun

### Komutlar görünmüyor
- Botu yeniden başlatın
- Sunucudan çıkarıp tekrar ekleyin
- Komutların sync olması için birkaç dakika bekleyin

### Oyunlar paylaşılmıyor
- İnternet bağlantınızı kontrol edin
- Steam'in erişilebilir olduğundan emin olun
- Rate limit nedeniyle bekleme süresi eklenmiştir

### Bedava Hesap Sistemi Sorunları
#### Hesap çıkmıyor
- Stokta hesap olduğundan emin olun (umutpapa123 eklemeli)
- %10 şans olduğunu unutmayın
- Günde 1 kez kullanabileceğinizi unutmayın

#### DM gelmiyor
- DM ayarlarınızın açık olduğundan emin olun
- DM kapalıysa komut yanıtında özel mesaj olarak gösterilir
- Spam klasörünüzü kontrol edin

#### Admin komutları çalışmıyor
- Sadece umutpapa123 kullanıcı adına sahip kişi kullanabilir
- Kullanıcı adınızın doğru olduğundan emin olun

#### Çekilişe katılamıyorum
- Çekilişin aktif olduğundan emin olun
- Sürenin dolmadığından emin olun
- Zaten katıldıysanız tekrar katılamazsınız

## Lisans
MIT License