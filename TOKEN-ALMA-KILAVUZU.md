# Yeni Discord Token Alma Kılavuzu

## Adım 1: Discord Developer Portal'a Git
1. https://discord.com/developers/applications adresine gidin
2. Giriş yapın

## Adım 2: Mevcut Uygulamayı Bul veya Yeni Oluştur
1. "Applications" listesinden mevcut botu bulun
2. Veya "New Application" butonuna tıklayın
3. İsim verin ve "Create" butonuna tıklayın

## Adım 3: Bot Oluştur
1. Sol menüden "Bot" sekmesine tıklayın
2. "Add Bot" butonuna tıklayın
3. "Yes, do it!" butonuna tıklayın

## Adım 4: Token'ı Resetle ve Kopyala
1. "Reset Token" butonuna tıklayın
2. "Yes, do it!" butonuna tıklayın
3. Yeni token'ı kopyalayın

## Adım 5: Gerekli İzinleri Aç
1. "Privileged Gateway Intents" bölümünde:
   - ✅ PRESENCE INTENT (isteğe bağlı)
   - ✅ SERVER MEMBERS INTENT (isteğe bağlı)
   - ✅ MESSAGE CONTENT INTENT (**ZORUNLU**)

## Adım 6: Botu Sunucuya Ekle
1. "OAuth2" → "URL Generator" sekmesine gidin
2. "Scopes" bölümünde:
   - ✅ bot
   - ✅ applications.commands
3. "Bot Permissions" bölümünde:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Manage Channels (ticket sistemi için)
   - ✅ Moderate Members (timeout için)
4. Oluşturulan linki kopyalayın
5. Linki tarayıcıda açın
6. Botu eklemek istediğiniz sunucuyu seçin

## Adım 7: Token'ı .env Dosyasına Yapıştır
1. `.env` dosyasını açın
2. `DISCORD_TOKEN=` satırını bulun
3. Eski token'ı silin
4. Yeni token'ı yapıştırın
5. Dosyayı kaydedin

## Adım 8: Botu Başlat
```bash
cd "c:\Users\uu219\OneDrive\Masaüstü\oyun dısı dosyalar\dc ucretsiz oyunları paylasan bot"
node index-full.js
```

## Önemli Notlar:
- Token'ı **ASLA** paylaşmayın!
- Token sıfırlanırsa bot çalışmaz
- Yeni token almanız gerekir
- Token formatı: `MTUwNTYxODgxMDg1NjgwNDUzMg.G5fIIR.MlXpSwENsEhhnhJoTcchfHrDCo6fM_jKa2xeVU`
- `.env` dosyasında tırnak işareti **KULLANMAYIN**

## Sorun Giderme:
- **"Invalid token" hatası:** Token yanlış veya süresi dolmuş
- **"Missing permissions" hatası:** Botun gerekli izinleri yok
- **"Cannot send messages" hatası:** Bot kanalda mesaj gönderme iznine sahip değil