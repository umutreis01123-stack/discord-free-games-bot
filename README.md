# Discord Ücretsiz Oyun Botu

Discord sunucunuzda ücretsiz oyunları otomatik olarak paylaşan bir bot.

## Özellikler

- **3 Komut:**
  1. `/oyunkanalıayarla` - Ücretsiz oyunların paylaşılacağı kanalı belirler ve **HEMEN oyunları paylaşmaya başlar!**
  2. `/oyunkanalıkaldır` - Ayarlanan kanalı kaldırır
  3. `/bütünücretsizoyunlarıpaylaş` - **TÜM Steam ücretsiz oyunlarını tek seferde paylaşır!**

- **Platform Desteği:**
  - **Steam** - Tüm ücretsiz oyunlar (Free to Play, indirimdeki ücretsiz oyunlar)
  - **Epic Games** - Temel destek (isteğe bağlı aktif edilebilir)

- **Akıllı Özellikler:**
  - **Otomatik @everyone bildirimi** - Her oyun paylaşımında
  - **Renkli embed mesajları** - Her oyun için rastgele renk
  - **Oyun türü tahmini** - Otomatik tür belirleme
  - **Rate limit koruması** - Discord limitlerine uygun paylaşım
  - **Hata yönetimi** - Hatalı oyunları atlayıp devam eder

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

1. **/oyunkanalıayarla**
   - Ücretsiz oyunların paylaşılacağı kanalı belirler
   - Kullanım: `/oyunkanalıayarla kanal: #oyun-duyuruları`

2. **/oyunkanalıkaldır**
   - Ayarlanan oyun kanalını kaldırır
   - Kullanım: `/oyunkanalıkaldır`

3. **/bütünücretsizoyunlarıpaylaş**
   - Tüm platformlardaki ücretsiz oyunları paylaşır
   - Kullanım: `/bütünücretsizoyunlarıpaylaş`

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

## Geliştirme

### Yapılandırma
- `config.json`: Sunucu bazlı kanal ayarları
- `.env`: Bot token ve ID'leri

### Bağımlılıklar
- `discord.js`: Discord API iletişimi
- `axios`: HTTP istekleri
- `cheerio`: Web scraping
- `dotenv`: Çevre değişkenleri

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

## Lisans
MIT License