require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Veritabanı
const DB_FILE = (process.env.NODE_ENV || 'development') === 'production' 
  ? '/tmp/database.json' 
  : 'database.json';

function getDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('DB okunamadı:', e.message);
  }
  
  return {
    stocks: [],
    products: [],
    invites: {}, // userId -> davet sayısı
    invitedUsers: [], // davet edilen kullanıcılar
    commandsEnabled: true
  };
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB kaydedilemedi:', e.message);
  }
}

// Admin Bilgileri
const ADMIN_USER = 'umut';
const ADMIN_PASS = 'umutpapa001122u';
const OWNER_ID = 'umutpapa123';

// ============ WEB SİTESİ ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: Stokları Getir
app.get('/api/stocks', (req, res) => {
  const db = getDatabase();
  const stocksWithProducts = db.stocks.map(stock => ({
    ...stock,
    productCount: db.products.filter(p => p.stockId === stock.id).length
  }));
  res.json(stocksWithProducts);
});

// API: Admin Giriş
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = 'admin_token_' + Date.now();
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
  }
});

// API: Stok Oluştur (Admin)
app.post('/api/admin/create-stock', (req, res) => {
  const { token, name } = req.body;
  
  if (!token || !token.startsWith('admin_token_')) {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  const stock = {
    id: Date.now().toString(),
    name,
    createdAt: new Date()
  };
  
  db.stocks.push(stock);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Stok oluşturuldu', stock });
});

// API: Ürün Ekle (Admin)
app.post('/api/admin/add-product', (req, res) => {
  const { token, name, stockId, details } = req.body;
  
  if (!token || !token.startsWith('admin_token_')) {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  const product = {
    id: Date.now().toString(),
    name,
    stockId,
    details: details || '',
    createdAt: new Date()
  };
  
  db.products.push(product);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Ürün eklendi', product });
});

// API: Stokları Sil (Admin)
app.delete('/api/admin/stock/:id', (req, res) => {
  const { token } = req.body;
  const { id } = req.params;
  
  if (!token || !token.startsWith('admin_token_')) {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  db.stocks = db.stocks.filter(s => s.id !== id);
  db.products = db.products.filter(p => p.stockId !== id);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Stok silindi' });
});

// API: Ürün Sil (Admin)
app.delete('/api/admin/product/:id', (req, res) => {
  const { token } = req.body;
  const { id } = req.params;
  
  if (!token || !token.startsWith('admin_token_')) {
    return res.status(401).json({ error: 'Yetkiniz yok' });
  }
  
  const db = getDatabase();
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Ürün silindi' });
});

// ============ DISCORD BOT ============

client.on('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const db = getDatabase();
  
  // -invite komutu
  if (message.content === '-invite') {
    const userId = message.author.id;
    const inviteCount = db.invites[userId] || 0;
    const invitedCount = db.invitedUsers.filter(u => u.inviterId === userId).length;
    
    const embed = new EmbedBuilder()
      .setColor(0xe94560)
      .setTitle('📊 Davet İstatistikleri')
      .addFields(
        { name: '📨 Davet Ettiğin Kişi Sayısı', value: inviteCount.toString(), inline: true },
        { name: '✅ Giriş Yapan Sayısı', value: invitedCount.toString(), inline: true }
      )
      .setFooter({ text: 'Zwozez Discord Botu' });
    
    return message.reply({ embeds: [embed] });
  }
  
  // Kurucun kim
  if (message.content === 'Kurucun kim') {
    const embed = new EmbedBuilder()
      .setColor(0xe94560)
      .setTitle('👑 Kurucunuz')
      .setDescription('umutpapa123')
      .setFooter({ text: 'Zwozez Discord Botu' });
    
    return message.reply({ embeds: [embed] });
  }
  
  // Komutlar kapalıysa durdur
  if (!db.commandsEnabled) {
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ Komutlar şu anda kapalı!');
    }
  }
  
  // /komutlarıkapat - Sadece umutpapa123
  if (message.content === '/komutlarıkapat') {
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ Buna izniniz yok!');
    }
    
    db.commandsEnabled = false;
    saveDatabase(db);
    return message.reply('🔒 Komutlar kapatıldı!');
  }
  
  // /komutlarıaç - Sadece umutpapa123
  if (message.content === '/komutlarıaç') {
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ Buna izniniz yok!');
    }
    
    db.commandsEnabled = true;
    saveDatabase(db);
    return message.reply('🔓 Komutlar açıldı!');
  }
  
  // /bedava hesap komutu
  if (message.content === '/bedava hesap') {
    // Rastgele ürün seç
    if (db.products.length === 0) {
      return message.reply('❌ Stok Yok');
    }
    
    const randomProduct = db.products[Math.floor(Math.random() * db.products.length)];
    const stock = db.stocks.find(s => s.id === randomProduct.stockId);
    
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🎁 Bedava Hesap')
      .addFields(
        { name: '📦 Stok', value: stock.name, inline: true },
        { name: '🎮 Ürün', value: randomProduct.name, inline: true }
      )
      .setDescription(`\`\`\`\n${randomProduct.details || 'Bilgi yok'}\n\`\`\``)
      .setFooter({ text: 'Zwozez Discord Botu' });
    
    message.reply({ embeds: [embed] });
    
    // Davet istatistiğini güncelle
    if (!db.invites[message.author.id]) {
      db.invites[message.author.id] = 0;
    }
    db.invitedUsers.push({
      userId: message.author.id,
      username: message.author.username,
      joinedAt: new Date()
    });
    saveDatabase(db);
  }
});

// ============ SUNUCU ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
