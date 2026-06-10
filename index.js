require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Veritabanı dosyası (Railway için /tmp kullan)
const DB_FILE = (process.env.NODE_ENV || 'development') === 'production' 
  ? '/tmp/database.json' 
  : 'database.json';

// Veritabanı yapısı
function getDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('DB okunamadı:', e.message);
  }
  
  return {
    users: [],
    credits: {}, // userId -> kredi miktarı
    accounts: [], // satılacak hesaplar
    servers: [] // sunucu listesi
  };
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB kaydedilemedi:', e.message);
  }
}

// Admin bilgileri
const ADMIN_USER = 'umut';
const ADMIN_PASS = 'umutpapa001122u';

// ============ WEB SİTESİ ROUTES ============

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kayıt Ol
app.post('/api/register', (req, res) => {
  const { name, discordId, email, password } = req.body;
  
  if (!name || !discordId || !email || !password) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }
  
  const db = getDatabase();
  
  // Kontrol
  if (db.users.some(u => u.discordId === discordId || u.email === email)) {
    return res.status(400).json({ error: 'Bu Discord ID veya E-posta zaten kayıtlı' });
  }
  
  const user = {
    id: Date.now().toString(),
    name,
    discordId,
    email,
    password, // Gerçek projede hash yapılmalı
    registeredAt: new Date()
  };
  
  db.users.push(user);
  db.credits[user.id] = 0;
  saveDatabase(db);
  
  res.json({ success: true, message: 'Kayıt başarılı', userId: user.id });
});

// Giriş Yap
app.post('/api/login', (req, res) => {
  const { discordId, password } = req.body;
  
  if (!discordId || !password) {
    return res.status(400).json({ error: 'Discord ID ve Şifre gerekli' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.discordId === discordId && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Hatalı Discord ID veya Şifre' });
  }
  
  res.json({ 
    success: true, 
    userId: user.id,
    name: user.name,
    credits: db.credits[user.id] || 0
  });
});

// Admin Giriş
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: 'admin_token_' + Date.now() });
  } else {
    res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
  }
});

// Sunucu Listesi (ana sayfada gösterilecek)
app.get('/api/servers', (req, res) => {
  const db = getDatabase();
  res.json(db.servers);
});

// Hesap Gönder (kayıtlı kullanıcı)
app.post('/api/send-account', (req, res) => {
  const { userId, accountIndex } = req.body;
  
  if (!userId || accountIndex === undefined) {
    return res.status(400).json({ error: 'Parametreler eksik' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  const account = db.accounts[accountIndex];
  
  if (!account) {
    return res.status(400).json({ error: 'Hesap bulunamadı' });
  }
  
  // Bot'a mesaj gönder
  const discordId = user.discordId;
  client.users.fetch(discordId).then(userDM => {
    userDM.send(`
✅ **Hesap Gönderildi**

🎮 **Hesap Bilgileri:**
${account.details}

📧 **Gönderen:** ${user.name}
    `);
  }).catch(err => {
    console.log('DM gönderilemedi:', err);
  });
  
  res.json({ success: true, message: 'Hesap başarıyla gönderildi' });
});

// Admin Panel - Hesap Ekle
app.post('/api/admin/add-account', (req, res) => {
  const { token, name, details } = req.body;
  
  if (!token || token !== 'admin_token') {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  db.accounts.push({ name, details });
  saveDatabase(db);
  
  res.json({ success: true, message: 'Hesap eklendi' });
});

// Admin Panel - Sunucu Ekle
app.post('/api/admin/add-server', (req, res) => {
  const { token, name, playerCount } = req.body;
  
  if (!token || token !== 'admin_token') {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  db.servers.push({ name, playerCount, id: Date.now() });
  saveDatabase(db);
  
  res.json({ success: true, message: 'Sunucu eklendi' });
});

// ============ DISCORD BOT ============

client.on('ready', () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Prefix komutları
  if (!message.content.startsWith('!')) return;
  
  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();
  
  if (command === 'hesaplar') {
    const db = getDatabase();
    if (db.accounts.length === 0) {
      return message.reply('Şu anda satılık hesap yok.');
    }
    
    let list = '📊 **Satılık Hesaplar:**\n';
    db.accounts.forEach((acc, i) => {
      list += `${i + 1}. **${acc.name}**\n`;
    });
    
    message.reply(list);
  }
});

// ============ SUNUCU ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
