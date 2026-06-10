require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
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

// Veritabanı dosyası
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
    products: [],
    orders: [],
    notifications: [],
    supportTickets: [],
    accountRequests: []
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
  const { username, discordId, email, password } = req.body;
  
  if (!username || !discordId || !email || !password) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }
  
  const db = getDatabase();
  
  // Kontrol
  if (db.users.some(u => u.discordId === discordId || u.email === email)) {
    return res.status(400).json({ error: 'Bu Discord ID veya E-posta zaten kayıtlı' });
  }
  
  const user = {
    id: Date.now().toString(),
    username,
    discordId,
    email,
    password,
    credits: 0,
    registeredAt: new Date()
  };
  
  db.users.push(user);
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
    username: user.username,
    credits: user.credits
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

// Ürünleri Getir
app.get('/api/products', (req, res) => {
  const db = getDatabase();
  res.json(db.products);
});

// Admin: Ürün Ekle
app.post('/api/admin/add-product', (req, res) => {
  const { token, name, price, image, link, stock } = req.body;
  
  if (!token || token !== 'admin_token') {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  const product = {
    id: Date.now().toString(),
    name,
    price,
    image,
    link,
    stock: stock || 0,
    createdAt: new Date()
  };
  
  db.products.push(product);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Ürün eklendi', product });
});

// Kredi Ver (Admin)
app.post('/api/admin/add-credit', (req, res) => {
  const { token, userId, amount } = req.body;
  
  if (!token || token !== 'admin_token') {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  user.credits += parseInt(amount);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Kredi verildi' });
});

// Hesap Gönder İsteği
app.post('/api/request-account', (req, res) => {
  const { userId, productId, customAccount } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Giriş yapınız' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  const request = {
    id: Date.now().toString(),
    userId,
    username: user.username,
    discordId: user.discordId,
    productId,
    customAccount: customAccount || null,
    status: 'pending',
    createdAt: new Date()
  };
  
  db.accountRequests.push(request);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Hesap gönderme isteği oluşturuldu', requestId: request.id });
});

// Admin: Hesap İsteğini Onayla ve Gönder
app.post('/api/admin/approve-account', (req, res) => {
  const { token, requestId } = req.body;
  
  if (!token || token !== 'admin_token') {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  const request = db.accountRequests.find(r => r.id === requestId);
  
  if (!request) {
    return res.status(400).json({ error: 'İstek bulunamadı' });
  }
  
  request.status = 'approved';
  saveDatabase(db);
  
  // Bot'a DM gönder
  const discordId = request.discordId;
  client.users.fetch(discordId).then(userDM => {
    const accountInfo = request.customAccount || `Ürün: ${request.productId}`;
    userDM.send(`
✅ **Hesap Gönderildi**

📦 **Ürün Bilgisi:**
\`\`\`
${accountInfo}
\`\`\`

**Zwozez Discord Botu**
    `);
  }).catch(err => {
    console.log('DM gönderilemedi:', err);
  });
  
  res.json({ success: true, message: 'Hesap gönderildi' });
});

// Kullanıcıları Getir (Admin)
app.get('/api/admin/users', (req, res) => {
  const db = getDatabase();
  res.json(db.users.map(u => ({
    id: u.id,
    username: u.username,
    discordId: u.discordId,
    email: u.email,
    credits: u.credits,
    registeredAt: u.registeredAt
  })));
});

// Bekleyen İstekleri Getir (Admin)
app.get('/api/admin/pending-requests', (req, res) => {
  const db = getDatabase();
  const pending = db.accountRequests.filter(r => r.status === 'pending');
  res.json(pending);
});

// ============ DISCORD BOT ============

client.on('ready', () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;
  
  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();
  
  if (command === 'urunler') {
    const db = getDatabase();
    if (db.products.length === 0) {
      return message.reply('Şu anda satılık ürün yok.');
    }
    
    let list = '📦 **Satılık Ürünler:**\n';
    db.products.forEach((prod, i) => {
      list += `${i + 1}. **${prod.name}** - ${prod.price}₺ (${prod.stock} stok)\n`;
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
