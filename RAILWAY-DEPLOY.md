# Railway'e Deploy Etme Rehberi

## 🚀 Adım 1: Railway Hesabı Oluştur

1. https://railway.app adresine git
2. GitHub hesabınla giriş yap (ya da e-posta ile kayıt ol)
3. Hesap oluştur

---

## 🔗 Adım 2: GitHub Deposu Hazırla

### Eğer Git deposu yoksa:
```bash
git init
git add .
git commit -m "Initial commit"
```

### GitHub'a Push Et:
1. GitHub'da yeni bir depo oluştur (boş bırak)
2. Terminalde:
```bash
git remote add origin https://github.com/KULLANICI_ADIN/DEPO_ADI.git
git branch -M main
git push -u origin main
```

---

## 🚃 Adım 3: Railway'de Proje Oluştur

1. Railway.app'te giriş yap
2. "Start a New Project" tıkla
3. "Deploy from GitHub" seç
4. GitHub reposunu seç
5. "Add Service" → "GitHub" seç

---

## 🔑 Adım 4: Environment Variables Ekle

Railway Dashboard'da:
1. Projeyi seç
2. "Variables" sekmesine git
3. Aşağıdaki değişkenleri ekle:

```
DISCORD_TOKEN = YOUR_BOT_TOKEN_HERE
PORT = 3000
NODE_ENV = production
```

### Discord Token'ı Nasıl Alacaksın:

1. Discord Developer Portal'a git: https://discord.com/developers/applications
2. "New Application" tıkla
3. "Bot" sekmesinde "Add Bot" tıkla
4. "TOKEN" bölümünde "Copy" tıkla
5. Railway'e yapıştır

**ÖNEMLİ:** Token'ı kimseyle paylaşma!

---

## 🤖 Adım 5: Bot Permissions (İzinler)

Discord Developer Portal'da:
1. "OAuth2" → "URL Generator" seç
2. **Scopes:**
   - ✅ bot
   - ✅ applications.commands

3. **Permissions:**
   - ✅ Send Messages
   - ✅ Read Messages/View Channels
   - ✅ Embed Links
   - ✅ Read Message History

4. Oluşan URL'yi tarayıcıya yapıştır ve botu sunucuya ekle

---

## 🌐 Adım 6: Domaininizi (Opsiyonel)

Railway otomatik domain veriyor:
- Örnek: `your-app.up.railway.app`

Bu domain'i browser'da aç ve siteyi test et!

---

## ✅ Deploy Sonrası Kontrol

1. Railway Dashboard'ta "Deployments" sekmesine bak
2. Yeşil ✓ işareti görünmüş mi?
3. Bot online mi? (Discord Server'da kontrol et)
4. Site erişilebilir mi? (Verilen domain'i aç)

### Logs Kontrol:
1. Railway Dashboard → "View Logs"
2. Hataları gözle

---

## 🔄 Güncelleme

Kod değiştirip GitHub'a push ettiğinde:
```bash
git add .
git commit -m "Güncelleme açıklaması"
git push origin main
```

Railway **otomatik olarak** yeni kodu deploy edecek!

---

## 🆘 Sık Sorunlar

### Problem: "Discord Bot offline"
- ✅ Token doğru mu?
- ✅ Bot Intents aktif mi? (Developer Portal → Bot → Privileged Gateway Intents)
- ✅ Bot sunucuda mi?

### Problem: "Sitey açamıyorum"
- ✅ Port 3000 mi kullanılıyor?
- ✅ Deploy başarılı mı? (Logs kontrol et)

### Problem: "Veritabanı kayıt edilmiyor"
- ✅ `/tmp` klasöründe yazma izni var mı?
- ✅ PostgreSQL/MongoDB kullanmayı düşün (ileride)

---

## 📊 İleri Seviye: Veritabanı Ekle

Verileri kalıcı hale getirmek için:

### Option 1: Railway PostgreSQL
```bash
# Railway'de "Add Service" → "PostgreSQL" seç
```

### Option 2: MongoDB Atlas
- https://www.mongodb.com/cloud/atlas
- Ücretsiz 512MB veritabanı
- Connection string'i Railway'e ekle

---

## 🎯 Özet

✅ GitHub Deposu  
✅ Railway'e Bağla  
✅ Environment Variables Ekle  
✅ Deploy Et  
✅ Test Et  

Tamam! 🚀
