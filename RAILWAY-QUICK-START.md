# Railway Quick Start ⚡

## 🎯 30 Saniyede Başla

### 1️⃣ GitHub'a Push Et
```bash
git add .
git commit -m "Ready for Railway"
git push origin main
```

### 2️⃣ Railway'e Bağla
1. https://railway.app → Giriş yap
2. "New Project" → "Deploy from GitHub"
3. Reposunu seç

### 3️⃣ Token Ekle
Railway Dashboard:
- "Variables" tıkla
- `DISCORD_TOKEN` ekle (Discord Dev Portal'dan)
- `PORT` = `3000`
- `NODE_ENV` = `production`

### 4️⃣ Deploy!
**Otomatik başlar!** ✅

---

## 🔍 Kontrol Et

- Dashboard → "Deployments" → Yeşil ✓ mı?
- Railway verilen domain'e tıkla
- Bot sunucuda online mi?

---

## ❌ Hata Giderme

### Bot offline?
```
Railway → View Logs → Hatayı gözle
```

### Site açılmıyor?
```
Logs'ta "listening on port 3000" yazıyor mu?
```

### Veritabanı kaydedilmiyor?
```
PostgreSQL ekle (ileride daha iyi)
Şu an /tmp'de çalışıyor (temp)
```

---

## 📝 GitHub Token (Optional)

Otomatik deploy için:
1. Railway Settings
2. "Connect GitHub"
3. GitHub account seç

---

Hepsi bu! 🚀 Railway senin arkanda!
