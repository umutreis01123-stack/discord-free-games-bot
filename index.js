require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { REST } = require('discord.js');
const { Routes } = require('discord.js');
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

// Güçlü Veritabanı Sistemi
const DB_FILE = (process.env.NODE_ENV || 'development') === 'production' 
  ? '/tmp/database.json' 
  : 'database.json';

const BACKUP_DIR = 'backups';

// Backup klasörünü oluştur
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup(db) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `database-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(db, null, 2));
    
    // Eski backupları temizle (son 10 tanesini sakla)
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('database-') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length > 10) {
      backups.slice(10).forEach(file => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      });
    }
  } catch (e) {
    console.log('Backup oluşturulamadı:', e.message);
  }
}

function getDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      
      // Veritabanı yapısını kontrol et ve eksik alanları ekle
      if (!data.metadata) {
        data.metadata = {
          version: '2.0',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          totalUsers: 0,
          totalOrders: 0
        };
      }
      
      if (!data.users) data.users = [];
      if (!data.categories) data.categories = []; // ✅ YENİ: Stok kategorileri
      if (!data.products) data.products = [];
      if (!data.userRights) data.userRights = {};
      if (!data.pendingOrders) data.pendingOrders = [];
      if (!data.completedOrders) data.completedOrders = [];
      if (!data.creditHistory) data.creditHistory = [];
      if (!data.loginHistory) data.loginHistory = [];
      if (!data.systemLogs) data.systemLogs = [];
      
      return data;
    }
  } catch (e) {
    console.log('DB okunamadı:', e.message);
    
    // Backup'dan geri yüklemeyi dene
    try {
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('database-') && file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (backups.length > 0) {
        console.log('Backup\'dan geri yükleniyor:', backups[0]);
        const backupData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, backups[0]), 'utf8'));
        return backupData;
      }
    } catch (backupError) {
      console.log('Backup geri yüklenemedi:', backupError.message);
    }
  }
  
  // Yeni veritabanı oluştur
  return {
    metadata: {
      version: '2.0',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      totalUsers: 0,
      totalOrders: 0
    },
    users: [],
    categories: [], // ✅ YENİ: Stok kategorileri
    products: [],
    userRights: {},
    pendingOrders: [],
    completedOrders: [],
    creditHistory: [],
    loginHistory: [],
    systemLogs: []
  };
}

function saveDatabase(db) {
  try {
    // Metadata güncelle
    db.metadata.lastModified = new Date().toISOString();
    db.metadata.totalUsers = db.users.length;
    db.metadata.totalOrders = db.completedOrders.length;
    
    // Her kaydetmeden önce backup al
    createBackup(db);
    
    // Veritabanını kaydet
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    
    console.log('✅ Veritabanı kaydedildi:', new Date().toISOString());
  } catch (e) {
    console.error('❌ DB kaydedilemedi:', e.message);
  }
}

function addSystemLog(db, action, details, userId = null) {
  const log = {
    id: Date.now().toString() + Math.random(),
    timestamp: new Date().toISOString(),
    action,
    details,
    userId,
    ip: 'system'
  };
  
  db.systemLogs.push(log);
  
  // Son 1000 log'u sakla
  if (db.systemLogs.length > 1000) {
    db.systemLogs = db.systemLogs.slice(-1000);
  }
}

function addCreditHistory(db, userId, amount, type, description) {
  const history = {
    id: Date.now().toString() + Math.random(),
    userId,
    amount,
    type, // 'earned', 'spent', 'gifted'
    description,
    timestamp: new Date().toISOString(),
    balanceAfter: db.users.find(u => u.id === userId)?.credits || 0
  };
  
  db.creditHistory.push(history);
}

const ADMIN_USER = 'umut';
const ADMIN_PASS = 'umutpapa001122u';
const OWNER_ID = '1403495996138323989';

// ============ WEB SİTESİ ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kayıt Ol - Geliştirilmiş Sistem (HER ALANI DOĞRU BAŞLATLA)
app.post('/api/register', (req, res) => {
  const { name, discordId, email, password } = req.body;
  
  // Veri doğrulama
  if (!name || !discordId || !email || !password) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }
  
  // Veri formatı kontrolleri
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: 'İsim 2-50 karakter arası olmalı' });
  }
  
  if (discordId.length < 10 || discordId.length > 20) {
    return res.status(400).json({ error: 'Discord ID formatı hatalı' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-posta formatı hatalı' });
  }
  
  const db = getDatabase();
  
  // Mevcut kullanıcı kontrolü
  if (db.users.some(u => u.discordId === discordId)) {
    return res.status(400).json({ error: 'Bu Discord ID zaten kayıtlı' });
  }
  
  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Bu E-posta zaten kayıtlı' });
  }
  
  // Yeni kullanıcı oluştur - HER ÖZELLİĞİ NET BİR ŞEKİLDE AYARLA
  const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  const user = {
    id: userId,
    name: name.trim(),
    discordId: discordId.trim(),
    email: email.trim().toLowerCase(),
    password: password, // Gerçek projede hash'lenmelidir
    credits: 10, // Hoş geldin bonusu
    totalSpent: 0,
    totalEarned: 10,
    registrationDate: now,
    lastLogin: null,
    loginCount: 0,
    isActive: true,
    profile: {
      joinedOrders: 0,
      completedOrders: 0,
      favoriteProducts: []
    }
  };
  
  db.users.push(user);
  
  // Kullanıcı hakkı sistemi
  db.userRights[userId] = { 
    boostRights: 1, // Boost hakkı (ilk kez 4 hesap, sonra 1 1)
    boostUsageCount: 0, // Kaçıncı kez kullandığını takip et
    boostLastUsed: null,
    freeRights: 1, // Bedava hesap hakkı
    freeLastUsed: null
  };
  
  // Sistem logları
  addSystemLog(db, 'USER_REGISTERED', `Yeni kullanıcı kaydı: ${user.name} (${user.discordId})`, userId);
  addCreditHistory(db, userId, 10, 'earned', 'Hoş geldin bonusu');
  
  // Veritabanını kaydet
  saveDatabase(db);
  
  console.log(`✅ Yeni kullanıcı kaydı: ${user.name} (${user.discordId}) - ID: ${userId}`);
  
  res.json({ 
    success: true, 
    message: 'Kayıt başarılı! 10 kredi ve 1 bedava hesap hakkı kazandınız!',
    user: {
      id: userId,
      name: user.name,
      credits: user.credits,
      discordId: user.discordId,
      email: user.email,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      totalSpent: user.totalSpent,
      totalEarned: user.totalEarned,
      profile: user.profile,
      userRights: db.userRights[userId]
    }
  });
});

// Giriş Yap - Geliştirilmiş Sistem (HER ALAN DÖNDÜR)
app.post('/api/login', (req, res) => {
  const { discordId, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!discordId || !password) {
    return res.status(400).json({ error: 'Discord ID ve şifre gerekli' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.discordId === discordId && u.password === password);
  
  if (!user) {
    // Başarısız giriş denemesi
    addSystemLog(db, 'LOGIN_FAILED', `Başarısız giriş denemesi: ${discordId} (IP: ${clientIP})`);
    saveDatabase(db);
    return res.status(401).json({ error: 'Hatalı Discord ID veya Şifre' });
  }
  
  if (!user.isActive) {
    return res.status(401).json({ error: 'Hesabınız devre dışı' });
  }
  
  // Giriş bilgilerini güncelle
  user.lastLogin = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  
  // Giriş geçmişi
  const loginRecord = {
    id: Date.now().toString() + Math.random(),
    userId: user.id,
    timestamp: new Date().toISOString(),
    ip: clientIP,
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  db.loginHistory.push(loginRecord);
  
  // Son 100 giriş kaydını sakla
  if (db.loginHistory.length > 100) {
    db.loginHistory = db.loginHistory.slice(-100);
  }
  
  // Kullanıcı hakkı bilgileri
  const userRights = db.userRights[user.id] || { 
    boostRights: 0, 
    boostLastUsed: null,
    freeRights: 1,
    freeLastUsed: null
  };
  
  addSystemLog(db, 'LOGIN_SUCCESS', `Başarılı giriş: ${user.name} (${user.discordId})`, user.id);
  saveDatabase(db);
  
  console.log(`✅ Giriş: ${user.name} (${user.discordId})`);
  
  res.json({ 
    success: true, 
    message: 'Giriş başarılı!',
    user: {
      id: user.id,
      name: user.name,
      credits: user.credits,
      discordId: user.discordId,
      email: user.email,
      totalSpent: user.totalSpent || 0,
      totalEarned: user.totalEarned || 0,
      loginCount: user.loginCount,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      profile: user.profile,
      userRights: userRights
    }
  });
});

// Admin Giriş
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true, token: 'admin_authenticated' });
  } else {
    res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
  }
});

// Ürünleri Getir
app.get('/api/products', (req, res) => {
  const db = getDatabase();
  res.json(db.products);
});

// ✅ YENİ: Kategorileri Getir (Stoklar)
app.get('/api/categories', (req, res) => {
  const db = getDatabase();
  res.json(db.categories);
});

// ✅ YENİ: Stok Oluştur (Admin)
app.post('/api/admin/categories', (req, res) => {
  const { name, image, quantity } = req.body;
  
  if (!name || !image || !quantity) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }
  
  const db = getDatabase();
  
  // Stok ismi benzersiz mi kontrol et
  if (db.categories.some(c => c.name === name)) {
    return res.status(400).json({ error: 'Bu stok ismi zaten var' });
  }
  
  const category = {
    id: Date.now().toString(),
    name: name.trim(),
    image: image.trim(),
    quantity: parseInt(quantity),
    createdAt: new Date().toISOString(),
    products: [] // Bu stokta olan ürünler
  };
  
  db.categories.push(category);
  saveDatabase(db);
  
  res.json({ success: true, category });
});

// ✅ YENİ: Stok Sil (Admin)
app.delete('/api/admin/categories/:categoryId', (req, res) => {
  const { categoryId } = req.params;
  const db = getDatabase();
  
  const categoryIndex = db.categories.findIndex(c => c.id === categoryId);
  if (categoryIndex === -1) {
    return res.status(404).json({ error: 'Stok bulunamadı' });
  }
  
  // Bu stokta ürün var mı kontrol et
  if (db.categories[categoryIndex].products.length > 0) {
    return res.status(400).json({ error: 'Bu stokta ürün var, silemezsin' });
  }
  
  db.categories.splice(categoryIndex, 1);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Stok silindi' });
});

// ✅ YENİ: Stok Miktarı Güncelle (Admin)
app.put('/api/admin/categories/:categoryId', (req, res) => {
  const { categoryId } = req.params;
  const { quantity } = req.body;
  
  const db = getDatabase();
  const category = db.categories.find(c => c.id === categoryId);
  
  if (!category) {
    return res.status(404).json({ error: 'Stok bulunamadı' });
  }
  
  category.quantity = parseInt(quantity);
  saveDatabase(db);
  
  res.json({ success: true, category });
});

// Admin: Ürün Ekle
app.post('/api/admin/products', (req, res) => {
  const { name, quantity, credits, accounts, categoryId } = req.body;
  
  if (!name || !credits || !accounts || !categoryId) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }
  
  const db = getDatabase();
  
  // Stok var mı kontrol et
  const category = db.categories.find(c => c.id === categoryId);
  if (!category) {
    return res.status(404).json({ error: 'Stok bulunamadı' });
  }
  
  // Hesapları satırlara böl ve temizle
  const accountList = accounts.split('\n')
    .filter(acc => acc.trim())
    .map(acc => ({
      id: Date.now().toString() + Math.random(),
      details: acc.trim(),
      used: false
    }));
  
  const product = {
    id: Date.now().toString(),
    categoryId: categoryId, // ✅ YENİ: Hangi stoka ait olduğunu takip et
    name: name.trim(),
    quantity: parseInt(quantity),
    credits: parseInt(credits),
    accounts: accountList,
    createdAt: new Date().toISOString()
  };
  
  db.products.push(product);
  
  // Stokta ürün sayısını artır
  category.products.push(product.id);
  
  saveDatabase(db);
  
  res.json({ success: true, product });
});

// Admin: Kredi Ver - Geliştirilmiş Sistem
app.post('/api/admin/give-credits', (req, res) => {
  const { userId, amount, reason } = req.body;
  
  if (!userId || !amount) {
    return res.status(400).json({ error: 'Kullanıcı ID ve miktar gerekli' });
  }
  
  const creditAmount = parseInt(amount);
  if (isNaN(creditAmount) || creditAmount <= 0) {
    return res.status(400).json({ error: 'Geçersiz kredi miktarı' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  const oldCredits = user.credits;
  user.credits += creditAmount;
  user.totalEarned = (user.totalEarned || 0) + creditAmount;
  
  // Kredi geçmişi kaydet
  addCreditHistory(db, userId, creditAmount, 'gifted', reason || 'Admin tarafından verildi');
  addSystemLog(db, 'CREDIT_GIVEN', `Admin ${creditAmount} kredi verdi: ${user.name} (${oldCredits} → ${user.credits})`, userId);
  
  saveDatabase(db);
  
  console.log(`💰 Admin kredi verdi: ${user.name} (+${creditAmount}) = ${user.credits}`);
  
  res.json({ 
    success: true, 
    message: `${user.name} kullanıcısına ${creditAmount} kredi verildi`,
    newCredits: user.credits,
    oldCredits: oldCredits
  });
});

// Admin: Hesap Gönder
app.post('/api/admin/send-account', (req, res) => {
  const { userId, productId, accountDetails } = req.body;
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  const product = db.products.find(p => p.id === productId);
  
  if (!user || !product) {
    return res.status(404).json({ error: 'Kullanıcı veya ürün bulunamadı' });
  }
  
  // Bot'a DM gönder
  client.users.fetch(user.discordId).then(userDM => {
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🎁 Hesap Gönderildi')
      .addFields(
        { name: '📦 Ürün', value: product.name, inline: true },
        { name: '🎮 Hesap', value: accountDetails }
      )
      .setFooter({ text: 'Zwozez Discord Botu' });
    
    userDM.send({ embeds: [embed] });
  }).catch(err => {
    console.log('DM gönderilemedi:', err);
  });
  
  res.json({ success: true, message: 'Hesap gönderildi' });
});

// Kullanıcıları Getir
app.get('/api/admin/users', (req, res) => {
  const db = getDatabase();
  res.json(db.users.map(u => ({
    id: u.id,
    name: u.name,
    discordId: u.discordId,
    email: u.email,
    credits: u.credits
  })));
});

// Ürün Satın Al - Geliştirilmiş Sistem
app.post('/api/buy-product', (req, res) => {
  const { userId, productId, quantity } = req.body;
  
  if (!userId || !productId || !quantity) {
    return res.status(400).json({ error: 'Tüm alanlar gerekli' });
  }
  
  const purchaseQuantity = parseInt(quantity);
  if (isNaN(purchaseQuantity) || purchaseQuantity <= 0) {
    return res.status(400).json({ error: 'Geçersiz adet' });
  }
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  const product = db.products.find(p => p.id === productId);
  
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  if (!product) {
    return res.status(404).json({ error: 'Ürün bulunamadı' });
  }
  
  if (!user.isActive) {
    return res.status(403).json({ error: 'Hesabınız devre dışı' });
  }
  
  const totalCost = product.credits * purchaseQuantity;
  
  if (user.credits < totalCost) {
    return res.status(400).json({ error: `Yetersiz kredi! Gereken: ${totalCost}, Mevcut: ${user.credits}` });
  }
  
  if (product.quantity < purchaseQuantity) {
    return res.status(400).json({ error: `Yetersiz stok! Mevcut: ${product.quantity}, İstenen: ${purchaseQuantity}` });
  }
  
  // Kullanılabilir hesap kontrolü
  const availableAccounts = product.accounts.filter(acc => !acc.used);
  if (availableAccounts.length < purchaseQuantity) {
    return res.status(400).json({ error: `Yeterli hesap yok! Mevcut: ${availableAccounts.length}` });
  }
  
  // Sipariş oluştur
  const orderId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const order = {
    id: orderId,
    userId: user.id,
    userName: user.name,
    userDiscordId: user.discordId,
    productId: product.id,
    productName: product.name,
    quantity: purchaseQuantity,
    unitPrice: product.credits,
    totalCost,
    status: 'pending',
    createdAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat
  };
  
  db.pendingOrders.push(order);
  
  // Kullanıcı istatistiklerini güncelle
  user.profile.joinedOrders = (user.profile.joinedOrders || 0) + 1;
  
  // Sistem kayıtları
  addSystemLog(db, 'ORDER_CREATED', `Yeni sipariş: ${user.name} - ${product.name} x${purchaseQuantity} (${totalCost} kredi)`, userId);
  
  saveDatabase(db);
  
  console.log(`📦 Yeni sipariş: ${user.name} - ${product.name} x${purchaseQuantity}`);
  
  res.json({ 
    success: true, 
    message: 'Sipariş oluşturuldu! Admin onayından sonra Discord DM ile hesaplar gönderilecek.',
    orderId: order.id,
    estimatedDelivery: order.estimatedDelivery
  });
});

// Admin: Siparişi Onayla
app.post('/api/admin/approve-order', (req, res) => {
  const { orderId } = req.body;
  
  const db = getDatabase();
  const orderIndex = db.pendingOrders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Sipariş bulunamadı' });
  }
  
  const order = db.pendingOrders[orderIndex];
  const user = db.users.find(u => u.id === order.userId);
  const product = db.products.find(p => p.id === order.productId);
  
  if (!user || !product) {
    return res.status(404).json({ error: 'Kullanıcı veya ürün bulunamadı' });
  }
  
  // Kullanılmamış hesapları al
  const availableAccounts = product.accounts.filter(acc => !acc.used);
  
  if (availableAccounts.length < order.quantity) {
    return res.status(400).json({ error: 'Yeterli hesap yok!' });
  }
  
  // Random hesap seç
  const selectedAccounts = [];
  for (let i = 0; i < order.quantity; i++) {
    const randomIndex = Math.floor(Math.random() * availableAccounts.length);
    const selectedAccount = availableAccounts.splice(randomIndex, 1)[0];
    selectedAccount.used = true;
    selectedAccounts.push(selectedAccount);
  }
  
  // Kredi düş ve istatistikleri güncelle
  const oldCredits = user.credits;
  user.credits -= order.totalCost;
  user.totalSpent = (user.totalSpent || 0) + order.totalCost;
  user.profile.completedOrders = (user.profile.completedOrders || 0) + 1;
  
  // Stok azalt
  product.quantity -= order.quantity;
  
  // ✅ YENİ: Kategorinin stok miktarını da azalt
  if (product.categoryId) {
    const category = db.categories.find(c => c.id === product.categoryId);
    if (category) {
      category.quantity -= order.quantity;
    }
  }
  
  // Siparişi tamamlananlara taşı
  order.status = 'completed';
  order.selectedAccounts = selectedAccounts;
  order.completedAt = new Date().toISOString();
  order.approvedBy = 'admin';
  
  db.completedOrders.push(order);
  db.pendingOrders.splice(orderIndex, 1);
  
  // Kredi geçmişine ekle
  addCreditHistory(db, user.id, -order.totalCost, 'spent', `Sipariş: ${order.productName} x${order.quantity}`);
  
  // Sistem logları
  addSystemLog(db, 'ORDER_APPROVED', `Sipariş onaylandı: ${user.name} - ${order.productName} x${order.quantity} (${order.totalCost} kredi)`, user.id);
  
  saveDatabase(db);
  
  console.log(`✅ Sipariş onaylandı: ${user.name} - ${order.productName} x${order.quantity} (${oldCredits} → ${user.credits})`);
  
  // Bot'a DM gönder
  client.users.fetch(order.userDiscordId).then(userDM => {
    const accountDetails = selectedAccounts.map(acc => acc.details).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🛍️ Satın Alma Başarılı!')
      .setDescription(`**${user.name}** mağazasından satın aldığınız ürün aşağıda:`)
      .addFields(
        { name: 'Ürün', value: order.productName, inline: true },
        { name: 'Kategori', value: 'Oyun', inline: true },
        { name: 'Ödenen Miktar', value: `💰 ${order.totalCost} Kredi`, inline: true }
      )
      .addFields(
        { name: 'İçerik', value: `\`\`\`\n${accountDetails}\n\`\`\``, inline: false }
      )
      .addFields(
        { 
          name: 'Değerlendirme', 
          value: `Ürünü **/değerlendirme** komutu ile değerlendirebilirsiniz!`, 
          inline: false 
        }
      )
      .setFooter({ 
        text: `Teşekkürler! • ${user.name} • bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` 
      })
      .setTimestamp();
    
    // Not mesajı ayrı olarak gönder
    const noteEmbed = new EmbedBuilder()
      .setColor(0xff9900)
      .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!')
      .setTimestamp();
    
    userDM.send({ embeds: [embed] });
    setTimeout(() => {
      userDM.send({ embeds: [noteEmbed] });
    }, 1000);
  }).catch(err => {
    console.log('DM gönderilemedi:', err);
  });
  
  res.json({ 
    success: true, 
    message: 'Sipariş onaylandı ve hesaplar gönderildi',
    userNewCredits: user.credits,
    productNewQuantity: product.quantity
  });
});

// Kullanıcı Bilgilerini Güncelle - Geliştirilmiş (Her Zaman En Güncel Veriyi Döndür)
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  // Kullanıcının kredi geçmişi
  const creditHistory = db.creditHistory.filter(h => h.userId === userId).slice(-10);
  
  // Kullanıcının sipariş geçmişi
  const orders = db.completedOrders.filter(o => o.userId === userId).slice(-5);
  
  // Kullanıcı hakkı bilgileri (varsa)
  const userRights = db.userRights[userId] || { 
    boostRights: 0, 
    boostLastUsed: null,
    freeRights: 1,
    freeLastUsed: null
  };
  
  res.json({
    id: user.id,
    name: user.name,
    discordId: user.discordId,
    credits: user.credits,
    totalSpent: user.totalSpent || 0,
    totalEarned: user.totalEarned || 0,
    registrationDate: user.registrationDate,
    lastLogin: user.lastLogin,
    loginCount: user.loginCount,
    profile: user.profile,
    recentCreditHistory: creditHistory,
    recentOrders: orders,
    userRights: userRights,
    email: user.email,
    isActive: user.isActive
  });
});

// Admin: Kullanıcı İstatistikleri
app.get('/api/admin/stats', (req, res) => {
  const db = getDatabase();
  
  const stats = {
    totalUsers: db.users.length,
    activeUsers: db.users.filter(u => u.isActive).length,
    totalProducts: db.products.length,
    pendingOrders: db.pendingOrders.length,
    completedOrders: db.completedOrders.length,
    totalCreditsDistributed: db.users.reduce((sum, u) => sum + (u.totalEarned || 0), 0),
    totalCreditsSpent: db.users.reduce((sum, u) => sum + (u.totalSpent || 0), 0),
    recentRegistrations: db.users.filter(u => {
      const regDate = new Date(u.registrationDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return regDate > weekAgo;
    }).length,
    database: db.metadata
  };
  
  res.json(stats);
});

// Admin: Sistem Logları
app.get('/api/admin/logs', (req, res) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit) || 50;
  
  const logs = db.systemLogs.slice(-limit).reverse();
  
  res.json(logs);
});

// Admin: Son Kredi İşlemleri
app.get('/api/admin/recent-credits', (req, res) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit) || 20;
  
  // Kredi geçmişini kullanıcı isimleriyle birleştir
  const recentCredits = db.creditHistory
    .slice(-limit)
    .reverse()
    .map(credit => {
      const user = db.users.find(u => u.id === credit.userId);
      return {
        ...credit,
        userName: user ? user.name : 'Bilinmeyen Kullanıcı',
        userDiscordId: user ? user.discordId : 'Bilinmiyor'
      };
    });
  
  res.json(recentCredits);
});

// Bekleyen Siparişleri Getir
app.get('/api/admin/pending-orders', (req, res) => {
  const db = getDatabase();
  res.json(db.pendingOrders);
});

// ============ DISCORD BOT ============

client.on('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  registerSlashCommands();
});

// ✅ OWO ÖDEME OTOMATİK ALGILAMA
client.on('messageCreate', async (message) => {
  // Bot kendi mesajlarını yoksay
  if (message.author.id === client.user.id) return;
  
  try {
    // OWO botunun mesajlarını dinle (embed içinde OWO miktarını arayacağız)
    if (message.embeds && message.embeds.length > 0) {
      const embed = message.embeds[0];
      
      // OWO bot genellikle "send" işlemlerini embed ile gösterir
      // Burada pattern matching yapacağız
      const embedText = `${embed.title || ''} ${embed.description || ''}`.toLowerCase();
      
      if (embedText.includes('send') || embedText.includes('gönder')) {
        // OWO işlemi gerçekleşti
        const db = getDatabase();
        if (!db.owoPendingPayments) db.owoPendingPayments = [];
        
        // Pending payment bulup tamamla
        const pendingPayment = db.owoPendingPayments.find(p => p.status === 'awaiting_payment');
        
        if (pendingPayment) {
          // Ürün bulup random hesap seç
          const product = db.products.find(p => p.id === pendingPayment.productId);
          
          if (product) {
            const availableAccounts = product.accounts.filter(acc => !acc.used);
            
            if (availableAccounts.length > 0) {
              // Random hesap seç
              const randomIndex = Math.floor(Math.random() * availableAccounts.length);
              const selectedAccount = availableAccounts[randomIndex];
              selectedAccount.used = true;
              product.quantity -= 1;
              
              // Status güncelle ve history'ye ekle
              pendingPayment.status = 'completed';
              pendingPayment.completedAt = new Date().toISOString();
              pendingPayment.accountDetails = selectedAccount.details;
              
              // History'ye ekle
              if (!db.owoHistory) db.owoHistory = [];
              db.owoHistory.push({
                id: Date.now().toString(),
                userId: pendingPayment.userId,
                userName: pendingPayment.userName,
                productId: pendingPayment.productId,
                productName: pendingPayment.productName,
                owoAmount: pendingPayment.owoAmount,
                completedAt: new Date().toISOString()
              });
              
              saveDatabase(db);
              
              // Kullanıcıya DM gönder
              const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Ödeme Alındı! Hesap Geliyor!')
                .setDescription(`Satın aldığınız ürün aşağıda:`)
                .addFields(
                  { name: '🎮 Ürün', value: product.name, inline: true },
                  { name: '💜 Ödenen Tutar', value: `${pendingPayment.owoAmount} OWO`, inline: true },
                  { name: '📦 Steam Hesabı', value: `\`\`\`\n${selectedAccount.details}\n\`\`\``, inline: false },
                  { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: false }
                )
                .setFooter({ text: 'Teşekkür ederiz! - Zwozez' })
                .setTimestamp();
              
              const noteEmbed = new EmbedBuilder()
                .setColor(0xff9900)
                .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!')
                .setTimestamp();
              
              try {
                const targetUser = await client.users.fetch(pendingPayment.userId);
                await targetUser.send({ embeds: [successEmbed] });
                setTimeout(async () => {
                  await targetUser.send({ embeds: [noteEmbed] });
                }, 1000);
              } catch (e) {
                console.log('DM gönderilemedi:', pendingPayment.userId);
              }
              
              console.log(`✅ OWO ÖDEME TAMAMLANDI: ${pendingPayment.userName} → ${product.name}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('OWO algılama hatası:', error);
  }
});

async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('boosthesap')
      .setDescription('Boost yapanlar için ücretsiz hesap'),
    
    new SlashCommandBuilder()
      .setName('bedavahesap')
      .setDescription('Bedava hesap al (hakkın varsa)'),
    
    new SlashCommandBuilder()
      .setName('hakver')
      .setDescription('Kullanıcıya hak ver (Owner Only)')
      .addStringOption(option =>
        option.setName('tip')
          .setDescription('Hak tipi')
          .addChoices(
            { name: 'Boost Hesap', value: 'boost' },
            { name: 'Bedava Hesap', value: 'free' }
          )
          .setRequired(true))
      .addUserOption(option =>
        option.setName('kullanici')
          .setDescription('Kullanıcı seç')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('adet')
          .setDescription('Kaç hak')
          .setRequired(true)),
    
    // TICKET KOMUTLARı
    new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Ticket aç - Destek için'),
    
    new SlashCommandBuilder()
      .setName('destekkur')
      .setDescription('Destek talebi oluştur'),
    
    new SlashCommandBuilder()
      .setName('sorumlu')
      .setDescription('Sorumlu ekle (Owner Only)')
      .addUserOption(option =>
        option.setName('kullanici')
          .setDescription('Sorumlu kullanıcı')
          .setRequired(true)),
    
    // ÇEKİLİŞ KOMUTLARı
    new SlashCommandBuilder()
      .setName('çekiliş')
      .setDescription('Çekiliş başlat')
      .addIntegerOption(option =>
        option.setName('süre')
          .setDescription('Çekiliş süresi (saniye)')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('kazanan')
          .setDescription('Kaç kişi kazanacak')
          .setRequired(true)),
    
    // LOG KOMUTU
    new SlashCommandBuilder()
      .setName('log')
      .setDescription('Sohbet logları ve ses aktivitesi'),
    
    // SUNUCU BILGISI
    new SlashCommandBuilder()
      .setName('sunucu')
      .setDescription('Sunucu bilgilerini göster'),

    // ✅ YENİ KOMUTLAR
    new SlashCommandBuilder()
      .setName('ürünekle')
      .setDescription('Stok ekle (Admin Only)')
      .addStringOption(option =>
        option.setName('stok_ismi')
          .setDescription('Stok adı (örn: Steam, Epic)')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('adet')
          .setDescription('Kaç adet stok var')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('kredial')
      .setDescription('Kredi satın al (OWO ile)')
      .addIntegerOption(option =>
        option.setName('kredi')
          .setDescription('Kaç OWO göndermek istiyorsun')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('owoileode')
      .setDescription('OWO ile ürün satın al'),

    new SlashCommandBuilder()
      .setName('owoçek')
      .setDescription('OWO satın alma taleplerini kontrol et ve onayla (Admin Only)'),

    new SlashCommandBuilder()
      .setName('owogeçmişi')
      .setDescription('Bana gönderilen tüm OWO\'ları göster'),

    new SlashCommandBuilder()
      .setName('owoödemealdı')
      .setDescription('OWO ödeme aldıktan sonra hesapı al (Test/Manual)')
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    
    console.log('✅ Slash komutları kaydedildi');
  } catch (error) {
    console.error('Slash komutları kaydedilirken hata:', error);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    const { commandName, options, user, guild } = interaction;
    const db = getDatabase();

    if (commandName === 'boosthesap') {
      try {
        const member = await guild.members.fetch(user.id);
        
        if (!member.premiumSince) {
          return interaction.reply({ content: '❌ Bu komutu kullanmak için sunucuya boost yapman gerekiyor!', ephemeral: true });
        }
        
        const userId = user.id;
        
        if (!db.userRights[userId]) {
          db.userRights[userId] = { 
            boostRights: 1, // İlk hak (ilk kullanımda 4, sonra 1 1)
            boostUsageCount: 0, // Kaçıncı kez kullandığını takip et
            boostLastUsed: null,
            freeRights: 1,
            freeLastUsed: null
          };
        }

        // Boost hakkı kontrolü
        if (db.userRights[userId].boostRights <= 0) {
          return interaction.reply({ content: '❌ Boost hesap hakkın kalmamış! Daha sonra tekrar dene.', ephemeral: true });
        }

        // İlk kullanım mı? (usageCount 0 ise ilk kez)
        const isFirstUsage = db.userRights[userId].boostUsageCount === 0;
        const accountCount = isFirstUsage ? 4 : 1; // İlk kez 4, sonra 1

        // Stokta ürün var mı kontrol et
        const availableProducts = db.products.filter(p => {
          const acc = p.accounts.filter(a => !a.used);
          return p.quantity > 0 && acc.length >= accountCount;
        });

        if (availableProducts.length === 0) {
          return interaction.reply({ content: `❌ Stokta yeterli hesap yok! (${accountCount} adet gerekli)`, ephemeral: true });
        }

        // Stok kontrol et ve hesap gönder
        const selectedProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        const availableAccounts = selectedProduct.accounts.filter(acc => !acc.used);
        
        if (availableAccounts.length < accountCount) {
          return interaction.reply({ content: `❌ Stokta yeterli hesap yok! (${accountCount} adet gerekli)`, ephemeral: true });
        }

        // Random hesap seç (sayısı: ilk kez 4, sonra 1)
        const selectedAccounts = [];
        for (let i = 0; i < accountCount; i++) {
          const randomIndex = Math.floor(Math.random() * availableAccounts.length);
          const account = availableAccounts.splice(randomIndex, 1)[0];
          account.used = true;
          selectedAccounts.push(account);
        }

        // Stok azalt ve hakkı güncelleştir
        selectedProduct.quantity -= accountCount;
        db.userRights[userId].boostRights--; // Her kullanımda bir hak azal
        db.userRights[userId].boostUsageCount++; // Kullanım sayısını artır
        db.userRights[userId].boostLastUsed = new Date().toISOString();

        // Sistem logları
        const logMessage = isFirstUsage 
          ? `${user.username} ilk boost'unu kullandı (4 hesap aldı, ${db.userRights[userId].boostRights} hak kaldı)`
          : `${user.username} boost kullandı (1 hesap aldı, ${db.userRights[userId].boostRights} hak kaldı)`;
        addSystemLog(db, 'BOOST_USED', logMessage, userId);
        
        saveDatabase(db);

        // DM gönder
        const accountDetails = selectedAccounts.map(acc => acc.details).join('\n');
        
        const boostEmbed = new EmbedBuilder()
          .setColor(0xf39c12)
          .setTitle('🚀 Boost Hediye!')
          .setDescription(`**Zwozez** mağazasından boost hediyeniz aşağıda:`)
          .addFields(
            { name: 'Ürün', value: selectedProduct.name, inline: true },
            { name: 'Adet', value: accountCount.toString(), inline: true },
            { name: 'Değeri', value: `💰 ${selectedProduct.credits * accountCount} Kredi`, inline: true },
            { name: 'Hesap Bilgileri', value: `\`\`\`\n${accountDetails}\n\`\`\``, inline: false },
            { name: 'Kalan Hakkın', value: `${db.userRights[userId].boostRights}`, inline: true }
          )
          .setFooter({ text: `Teşekkürler! • Zwozez • bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` })
          .setTimestamp();

        const noteEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!')
          .setTimestamp();

        try {
          await user.send({ embeds: [boostEmbed] });
          setTimeout(async () => {
            await user.send({ embeds: [noteEmbed] });
          }, 1000);
        } catch (e) {
          console.log('DM gönderilemedi');
        }

        const replyMessage = isFirstUsage
          ? `✅ İlk boost'unu kullansın! 4 hesap gönderildi! Kalan hakkın: ${db.userRights[userId].boostRights}`
          : `✅ 1 boost hesap gönderildi! Kalan hakkın: ${db.userRights[userId].boostRights}`;
        
        interaction.reply({ content: replyMessage, ephemeral: true });
        
      } catch (error) {
        console.log('Boost hatası:', error);
        interaction.reply({ content: '❌ Bir hata oluştu!', ephemeral: true });
      }
    }

    if (commandName === 'bedavahesap') {
      const userId = user.id;

      // Stokta ürün var mı kontrol et
      const availableProducts = db.products.filter(p => {
        const acc = p.accounts.filter(a => !a.used);
        return p.quantity > 0 && acc.length >= 1;
      });

      if (availableProducts.length === 0) {
        return interaction.reply({ content: '❌ Stokta yeterli hesap yok!', ephemeral: true });
      }

      if (!db.userRights[userId]) {
        db.userRights[userId] = { 
          boostRights: 0,
          boostLastUsed: null,
          freeRights: 1,
          freeLastUsed: null
        };
      }

      // Bedava hesap hakkı kontrolü
      if (db.userRights[userId].freeRights <= 0) {
        return interaction.reply({ content: '❌ Bedava hesap hakkın kalmamış!', ephemeral: true });
      }

      // 4 saatlik cooldown kontrolü
      const lastUsed = db.userRights[userId].freeLastUsed;
      if (lastUsed) {
        const lastUsedTime = new Date(lastUsed).getTime();
        const now = Date.now();
        const cooldownMs = 4 * 60 * 60 * 1000; // 4 saat
        const remainingMs = cooldownMs - (now - lastUsedTime);

        if (remainingMs > 0) {
          const hours = Math.floor(remainingMs / (60 * 60 * 1000));
          const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          return interaction.reply({ content: `⏳ Cooldown! ${hours}s ${minutes}d sonra tekrar deneyebilirsin.`, ephemeral: true });
        }
      }

      // Stok kontrol et ve 1 hesap gönder
      const selectedProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
      const availableAccounts = selectedProduct.accounts.filter(acc => !acc.used);
      
      if (availableAccounts.length < 1) {
        return interaction.reply({ content: '❌ Stokta yeterli hesap yok!', ephemeral: true });
      }

      const randomIndex = Math.floor(Math.random() * availableAccounts.length);
      const selectedAccount = availableAccounts[randomIndex];
      selectedAccount.used = true;

      selectedProduct.quantity -= 1;
      db.userRights[userId].freeRights--;
      db.userRights[userId].freeLastUsed = new Date().toISOString();

      // Sistem logları
      addSystemLog(db, 'FREE_ACCOUNT_USED', `${user.username} bedava hesap kullandı (${db.userRights[userId].freeRights} kaldı)`, userId);
      
      saveDatabase(db);

      // DM gönder
      const freeEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎁 Bedava Hesap!')
        .setDescription(`**Zwozez** mağazasından bedava hediyeniz aşağıda:`)
        .addFields(
          { name: 'Ürün', value: selectedProduct.name, inline: true },
          { name: 'Değeri', value: `💰 ${selectedProduct.credits} Kredi`, inline: true },
          { name: 'Hesap Bilgileri', value: `\`\`\`\n${selectedAccount.details}\n\`\`\``, inline: false },
          { name: 'Kalan Hakkın', value: `${db.userRights[userId].freeRights}`, inline: true }
        )
        .setFooter({ text: `Teşekkürler! • Zwozez • bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` })
        .setTimestamp();

      const noteEmbed = new EmbedBuilder()
        .setColor(0xff9900)
        .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!\n⏳ Bir sonraki bedava hesap için 4 saat beklemelisin.')
        .setTimestamp();

      try {
        await user.send({ embeds: [freeEmbed] });
        setTimeout(async () => {
          await user.send({ embeds: [noteEmbed] });
        }, 1000);
      } catch (e) {
        console.log('DM gönderilemedi');
      }

      const nextAvailableTime = new Date(Date.now() + (4 * 60 * 60 * 1000)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      interaction.reply({ content: `✅ Bedava hesap gönderildi! Bir sonraki hesap için ${nextAvailableTime}'de tekrar deneyebilirsin.`, ephemeral: true });
    }

    if (commandName === 'hakver') {
      if (user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bu komutu sadece owner kullanabilir!', ephemeral: true });
      }
      
      const tip = options.getString('tip');
      const targetUser = options.getUser('kullanici');
      const adet = options.getInteger('adet');
      
      if (!db.userRights[targetUser.id]) {
        db.userRights[targetUser.id] = { 
          boostRights: 0, 
          boostUsageCount: 0,
          boostLastUsed: null,
          freeRights: 0,
          freeLastUsed: null
        };
      }
      
      if (tip === 'boost') {
        db.userRights[targetUser.id].boostRights += adet;
        // Eğer boostUsageCount yoksa 0'la initialize et
        if (!db.userRights[targetUser.id].boostUsageCount) {
          db.userRights[targetUser.id].boostUsageCount = 0;
        }
      } else {
        db.userRights[targetUser.id].freeRights += adet;
      }
      
      saveDatabase(db);
      
      const tipText = tip === 'boost' ? 'Boost Hesap' : 'Bedava Hesap';
      interaction.reply({ content: `✅ ${targetUser.username} kullanıcısına ${adet} adet ${tipText} hakkı verildi!`, ephemeral: true });
    }

    // TICKET KOMUTU - Herkes Kullansın
    if (commandName === 'ticket') {
      const ticketEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎫 Ticket Sistemi')
        .setDescription('Destek talebiniz için bir ticket oluşturun.')
        .setFooter({ text: 'Butona tıklayarak başlayın' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Ticket Aç')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

      await interaction.reply({ embeds: [ticketEmbed], components: [row] });
    }

    // DESTEK KUR KOMUTU - Herkes Kullansın
    if (commandName === 'destekkur') {
      const supportEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💬 Destek Talebi')
        .setDescription('Destek talebinizi oluşturmak için butona tıklayın.')
        .setFooter({ text: 'Ekibimiz kısa sürede yanıt verecektir' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_support')
            .setLabel('Destek Talebi Aç')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💬')
        );

      await interaction.reply({ embeds: [supportEmbed], components: [row] });
    }

    // SORUMLU EKLE KOMUTU
    if (commandName === 'sorumlu') {
      if (user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bu komutu sadece owner kullanabilir!', ephemeral: true });
      }

      const targetUser = options.getUser('kullanici');
      
      if (!db.staff) db.staff = {};
      if (!db.staff.supportStaff) db.staff.supportStaff = [];
      
      if (db.staff.supportStaff.includes(targetUser.id)) {
        return interaction.reply({ content: `⚠️ ${targetUser.username} zaten sorumlu listesinde!`, ephemeral: true });
      }

      db.staff.supportStaff.push(targetUser.id);
      saveDatabase(db);

      interaction.reply({ content: `✅ ${targetUser.username} sorumlu listesine eklendi!`, ephemeral: true });
    }

    // ÇEKİLİŞ KOMUTU
    if (commandName === 'çekiliş') {
      if (user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bu komutu sadece owner kullanabilir!', ephemeral: true });
      }

      try {
        const duration = options.getInteger('süre');
        const winnerCount = options.getInteger('kazanan');

        // Stokta olan ürünleri al
        const availableProducts = db.products.filter(p => {
          const acc = p.accounts.filter(a => !a.used);
          return p.quantity > 0 && acc.length > 0;
        });

        if (availableProducts.length === 0) {
          return interaction.reply({ content: '❌ Stokta ürün yok! Çekiliş başlatılamıyor.', ephemeral: true });
        }

        const selectedProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];

        const giveawayEmbed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('🎉 Çekiliş!')
          .setDescription(`**Ödül:** ${selectedProduct.name}\n**Kazanan Sayısı:** ${winnerCount}\n**Süre:** ${duration} saniye`)
          .addFields(
            { name: 'Katılmak İçin', value: 'Aşağıdaki butona tıklayın!', inline: false }
          )
          .setFooter({ text: `Çekiliş ${duration} saniye sonra sona erecek` });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('join_giveaway')
              .setLabel('Çekilişe Katıl')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🎁')
          );

        const msg = await interaction.reply({ embeds: [giveawayEmbed], components: [row], fetchReply: true });

        // Çekiliş veritabanı
        if (!db.giveaways) db.giveaways = {};
        db.giveaways[msg.id] = {
          id: msg.id,
          product: selectedProduct,
          winners: winnerCount,
          participants: [],
          endTime: Date.now() + (duration * 1000),
          channelId: interaction.channelId,
          messageId: msg.id
        };
        saveDatabase(db);

        // Süre bitince çekiliş sonuçlandır
        setTimeout(() => {
          endGiveaway(msg.id, db);
        }, duration * 1000);
      } catch (error) {
        console.error('Çekiliş hatası:', error);
        interaction.reply({ content: `❌ Çekiliş başlatılamadı: ${error.message}`, ephemeral: true });
      }
    }

    // LOG KOMUTU
    if (commandName === 'log') {
      if (user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bu komutu sadece owner kullanabilir!', ephemeral: true });
      }

      try {
        // Log kanalı oluştur veya bul
        let logChannel = guild.channels.cache.find(ch => ch.name === 'bot-logları');
        
        if (!logChannel) {
          logChannel = await guild.channels.create({
            name: 'bot-logları',
            type: 0, // Text channel
            permissionOverwrites: [
              {
                id: guild.id,
                deny: ['ViewChannel']
              },
              {
                id: client.user.id,
                allow: ['ViewChannel', 'SendMessages']
              },
              {
                id: OWNER_ID,
                allow: ['ViewChannel', 'ReadMessageHistory']
              }
            ]
          });
        }

        // Ses kanallarındaki aktiviteyi kontrol et
        const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2); // Voice channels
        let voiceActivityLog = '📊 **Ses Kanal Aktivitesi:**\n\n';

        let hasVoiceActivity = false;
        for (const [, channel] of voiceChannels) {
          const members = channel.members.filter(m => !m.user.bot);
          if (members.size > 0) {
            hasVoiceActivity = true;
            voiceActivityLog += `🔊 ${channel.name}: ${members.size} kişi\n`;
            members.forEach(m => {
              const voiceState = m.voice;
              voiceActivityLog += `  • ${m.user.username} (${voiceState.streaming ? '📡 Yayın' : 'Dinliyor'})\n`;
            });
          }
        }

        const logEmbed = new EmbedBuilder()
          .setColor(0x34495e)
          .setTitle('📋 Bot Logları')
          .setDescription(hasVoiceActivity ? voiceActivityLog : '📭 Şu anda hiç kimse ses kanalında değil.')
          .addFields(
            { name: '👥 Sunucu Üye Sayısı', value: `${guild.memberCount}`, inline: true },
            { name: '📅 Tarih', value: `${new Date().toLocaleString('tr-TR')}`, inline: true },
            { name: '🎙️ Ses Kanalları', value: `${voiceChannels.size}`, inline: true }
          )
          .setFooter({ text: 'Log sistemi aktif' });

        await logChannel.send({ embeds: [logEmbed] });
        await interaction.reply({ content: `✅ Loglar **#${logChannel.name}** kanalına gönderildi!`, ephemeral: true });
      } catch (error) {
        console.error('Log komutu hatası:', error);
        await interaction.reply({ content: `❌ Log kanalı oluşturulamadı: ${error.message}`, ephemeral: true });
      }
    }

    // SUNUCU BİLGİ KOMUTU
    if (commandName === 'sunucu') {
      if (user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bu komutu sadece owner (umutpapa123) kullanabilir!', ephemeral: true });
      }

      const serverEmbed = new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`🏠 ${guild.name} - Sunucu Bilgileri`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: '🆔 Sunucu ID', value: guild.id, inline: true },
          { name: '👑 Kurucu', value: guild.ownerId === OWNER_ID ? '<@' + OWNER_ID + '>' : 'Bilinmiyor', inline: true },
          { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true },
          { name: '📅 Oluşturulma Tarihi', value: `${guild.createdAt.toLocaleDateString('tr-TR')}`, inline: true },
          { name: '⭐ Boost Sayısı', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
          { name: '🎭 Rol Sayısı', value: `${guild.roles.cache.size}`, inline: true }
        )
        .setFooter({ text: `Kurucunuz: ${guild.ownerId === OWNER_ID ? 'umutpapa123' : 'Başkası'}` });

      interaction.reply({ embeds: [serverEmbed], ephemeral: true });
    }

    // ✅ YENİ: ÜRÜN EKLE KOMUTU (Admin)
    if (commandName === 'ürünekle') {
      if (user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Bu komutu sadece admin kullanabilir!', ephemeral: true });
      }

      try {
        const stokIsmi = options.getString('stok_ismi');
        const adet = options.getInteger('adet');

        // Stok ismi benzersiz mi kontrol et
        if (db.categories.some(c => c.name === stokIsmi)) {
          return interaction.reply({ content: `⚠️ **${stokIsmi}** isimli stok zaten var!`, ephemeral: true });
        }

        // Yeni stok oluştur
        const newCategory = {
          id: Date.now().toString(),
          name: stokIsmi,
          quantity: adet,
          createdAt: new Date().toISOString(),
          products: []
        };

        db.categories.push(newCategory);
        addSystemLog(db, 'STOCK_CREATED', `Yeni stok oluşturuldu: ${stokIsmi} (${adet} adet)`, user.id);
        saveDatabase(db);

        const successEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Stok Eklendi')
          .addFields(
            { name: '📦 Stok Adı', value: stokIsmi, inline: true },
            { name: '📊 Adet', value: adet.toString(), inline: true },
            { name: '🆔 Stok ID', value: newCategory.id, inline: false }
          )
          .setFooter({ text: 'Stok sistemi' });

        interaction.reply({ embeds: [successEmbed], ephemeral: true });
        console.log(`✅ Yeni stok eklendi: ${stokIsmi} (${adet})`);
      } catch (error) {
        console.error('Stok ekleme hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // ✅ YENİ: KREDİ AL KOMUTU
    if (commandName === 'kredial') {
      try {
        const owoAmount = options.getInteger('kredi');

        if (owoAmount <= 0) {
          return interaction.reply({ content: '❌ OWO miktarı 0\'dan büyük olmalı!', ephemeral: true });
        }

        // Kullanıcı DB'de var mı kontrol et
        let dbUser = db.users.find(u => u.discordId === user.id);
        if (!dbUser) {
          dbUser = {
            id: Date.now().toString() + Math.random(),
            name: user.username,
            discordId: user.id,
            credits: 0,
            totalSpent: 0,
            totalEarned: 0,
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            loginCount: 0,
            isActive: true,
            profile: {
              joinedOrders: 0,
              completedOrders: 0,
              favoriteProducts: []
            }
          };
          db.users.push(dbUser);
        }

        // OWO transfer request embed'i
        const transferEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('💜 OWO Kredi Transfer Talebi')
          .setDescription(`Kredi satın almak için OWO gönderme talebiniz kaydedildi.`)
          .addFields(
            { name: '👤 Kullanıcı', value: user.username, inline: true },
            { name: '💜 İstenen Miktar', value: `**${owoAmount} OWO**`, inline: true },
            { name: '📝 Talimat', value: `OWO botuna şu komutu yazın:\n\`/w send @umutpapa123 ${owoAmount}\`\n\nAdmin tarafından onaylandıktan sonra krediler hesabınıza eklenecektir.`, inline: false },
            { name: '⏳ Durum', value: 'Admin Onayı Bekleniyor...', inline: false }
          )
          .setFooter({ text: 'OWO Kredi Sistemi' })
          .setTimestamp();

        // Admin'a bildir - DM'ye gönder
        const ownerUser = await client.users.fetch(OWNER_ID);
        
        const adminNotificationEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('💜 Yeni OWO Kredi Talebi')
          .setDescription(`**${user.username}** kredi satın almak için OWO göndereceğini söyledi.`)
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${user.id}>`, inline: true },
            { name: '💜 Tutar', value: `${owoAmount} OWO`, inline: true },
            { name: '📧 Discord ID', value: user.id, inline: true },
            { name: '⏰ Talep Zamanı', value: new Date().toLocaleString('tr-TR'), inline: false }
          )
          .setFooter({ text: 'Kredi Satın Alma Talebi' })
          .setTimestamp();

        await ownerUser.send({ embeds: [adminNotificationEmbed] });

        // Kullanıcıya sunucuda ephemeral mesaj gönder (sadece kendisi görsün)
        interaction.reply({ embeds: [transferEmbed], ephemeral: true });

        // Sistem logları
        addSystemLog(db, 'CREDIT_REQUEST', `Kredi satın alma talebinin: ${user.username} (${owoAmount} OWO)`, user.id);
        saveDatabase(db);

        console.log(`💜 Kredi transfer talebi: ${user.username} → ${owoAmount} OWO`);
      } catch (error) {
        console.error('Kredi alma hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // ✅ YENİ: OWO İLE ÜRÜN SATINA AL (RANDOM ÜRÜN)
    if (commandName === 'owoileode') {
      try {
        // Stokta ürün var mı kontrol et
        const availableProducts = db.products.filter(p => {
          const acc = p.accounts.filter(a => !a.used);
          return p.quantity > 0 && acc.length > 0;
        });

        if (availableProducts.length === 0) {
          return interaction.reply({ content: '❌ Şu anda stokta ürün yok!', ephemeral: true });
        }

        // Random ürün seç
        const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        
        const owoPrice = (db.settings && db.settings.owoPrice) || 7650; // Default 7650

        // Initialize pending payments array
        if (!db.owoPendingPayments) db.owoPendingPayments = [];

        // Pending payment'a ekle (henüz ödeme alınmadı ama sipariş onaylandı)
        const pendingPayment = {
          id: Date.now().toString() + Math.random(),
          userId: user.id,
          userName: user.username,
          productId: randomProduct.id,
          productName: randomProduct.name,
          owoAmount: owoPrice,
          status: 'awaiting_payment', // ödeme bekleniyor
          createdAt: new Date().toISOString(),
          accountDetails: null // Henüz hesap seçilmedi
        };

        db.owoPendingPayments.push(pendingPayment);
        saveDatabase(db);

        // ADIM 1: Sipariş Onaylandı mesajı
        const orderConfirmEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Sipariş Onaylandı!')
          .setDescription('Steam Random Hesap seçildi ve ödeme bekleniyor.')
          .addFields(
            { name: '🎮 Ürün', value: randomProduct.name, inline: true },
            { name: '💜 Tutar', value: `**${owoPrice} OWO**`, inline: true },
            { name: '⏳ Durum', value: '⏳ Ödeme Bekleniyor...', inline: false }
          )
          .setFooter({ text: 'Sipariş Onaylandı' })
          .setTimestamp();

        // ADIM 2: OWO Gönderme Talimatı
        const paymentInstructionEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('💜 OWO Gönderme Talimatı')
          .setDescription('Aşağıdaki komutu OWO botuna yazın:')
          .addFields(
            { name: '📝 Komut', value: `\`\`\`\n/w send @umutpapa123 ${owoPrice}\n\`\`\``, inline: false },
            { name: '⏰ Bekleme Süresi', value: 'OWO gönderildikten sonra 1-2 dakika içinde hesap DM\'den gönderilecektir.', inline: false }
          )
          .setFooter({ text: 'OWO Sistemi' })
          .setTimestamp();

        interaction.reply({ embeds: [orderConfirmEmbed, paymentInstructionEmbed], ephemeral: true });

        console.log(`🎮 Sipariş Onaylandı (OWO Bekleniyor): ${user.username} → ${randomProduct.name}`);
      } catch (error) {
        console.error('OWO satın alma hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // ✅ YENİ: OWO GEÇMİŞİ - BANA GÖNDERILEN TÜM OWOLAR
    if (commandName === 'owogeçmişi') {
      try {
        if (!db.owoHistory) db.owoHistory = [];

        if (db.owoHistory.length === 0) {
          return interaction.reply({ content: '❌ Henüz OWO geçmişi yok!', ephemeral: true });
        }

        // OWO geçmişini göster (son 10)
        const recentHistory = db.owoHistory.slice(-10).reverse();
        
        const historyList = recentHistory.map((payment, index) => {
          const date = new Date(payment.completedAt).toLocaleString('tr-TR');
          return `**${index + 1}.** ${payment.userName} → **${payment.productName}** (${payment.owoAmount} OWO) - *${date}*`;
        }).join('\n');

        const historyEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('💜 OWO Ödeme Geçmişi')
          .setDescription(historyList || 'Geçmiş bulunamadı')
          .addFields(
            { name: '📊 Toplam OWO', value: `${db.owoHistory.reduce((sum, p) => sum + p.owoAmount, 0)} OWO`, inline: true },
            { name: '🔢 Toplam İşlem', value: `${db.owoHistory.length}`, inline: true }
          )
          .setFooter({ text: 'Son 10 işlem gösterilmektedir' })
          .setTimestamp();

        interaction.reply({ embeds: [historyEmbed], ephemeral: true });
      } catch (error) {
        console.error('OWO geçmişi hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // ✅ YENİ: OWO ÖDEMESİ ALINDI - HESAP GÖNDERİ
    if (commandName === 'owoödemealdı') {
      try {
        const db = getDatabase();
        if (!db.owoPendingPayments) db.owoPendingPayments = [];

        // Kullanıcının pending payment'ını bul
        const userPendingIndex = db.owoPendingPayments.findIndex(p => p.userId === user.id && p.status === 'awaiting_payment');

        if (userPendingIndex === -1) {
          return interaction.reply({ content: '❌ Bekleyen ödeme bulunamadı! Önce `/owoileode` yazın.', ephemeral: true });
        }

        const pendingPayment = db.owoPendingPayments[userPendingIndex];
        const product = db.products.find(p => p.id === pendingPayment.productId);

        if (!product) {
          return interaction.reply({ content: '❌ Ürün bulunamadı!', ephemeral: true });
        }

        const availableAccounts = product.accounts.filter(acc => !acc.used);
        
        if (availableAccounts.length === 0) {
          return interaction.reply({ content: '❌ Stokta hesap kalmadı!', ephemeral: true });
        }

        // Random hesap seç
        const randomIndex = Math.floor(Math.random() * availableAccounts.length);
        const selectedAccount = availableAccounts[randomIndex];
        selectedAccount.used = true;
        product.quantity -= 1;

        // Status güncelle
        pendingPayment.status = 'completed';
        pendingPayment.completedAt = new Date().toISOString();
        pendingPayment.accountDetails = selectedAccount.details;

        // History'ye ekle
        if (!db.owoHistory) db.owoHistory = [];
        db.owoHistory.push({
          id: Date.now().toString(),
          userId: pendingPayment.userId,
          userName: pendingPayment.userName,
          productId: pendingPayment.productId,
          productName: pendingPayment.productName,
          owoAmount: pendingPayment.owoAmount,
          completedAt: new Date().toISOString()
        });

        saveDatabase(db);

        // Sunucuda onay mesajı
        const confirmEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Ödeme Alındı!')
          .setDescription('Hesap DM\'den geliyor...')
          .addFields(
            { name: '🎮 Ürün', value: product.name, inline: true },
            { name: '💜 Tutar', value: `${pendingPayment.owoAmount} OWO`, inline: true }
          )
          .setFooter({ text: 'Hesap DM\'de' })
          .setTimestamp();

        interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        // Kullanıcıya DM gönder
        const successEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Ödeme Alındı! Hesap Geliyor!')
          .setDescription(`Satın aldığınız ürün aşağıda:`)
          .addFields(
            { name: '🎮 Ürün', value: product.name, inline: true },
            { name: '💜 Ödenen Tutar', value: `${pendingPayment.owoAmount} OWO`, inline: true },
            { name: '📦 Steam Hesabı', value: `\`\`\`\n${selectedAccount.details}\n\`\`\``, inline: false },
            { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: false }
          )
          .setFooter({ text: 'Teşekkür ederiz! - Zwozez' })
          .setTimestamp();

        const noteEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!')
          .setTimestamp();

        try {
          await user.send({ embeds: [successEmbed] });
          setTimeout(async () => {
            await user.send({ embeds: [noteEmbed] });
          }, 1000);
        } catch (e) {
          console.log('DM gönderilemedi:', user.id);
        }

        console.log(`✅ OWO ÖDEME TAMAMLANDI: ${user.username} → ${product.name}`);
      } catch (error) {
        console.error('OWO ödeme hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }
  }

  // BUTTON INTERACTIONS
  if (interaction.isButton()) {
    const db = getDatabase();
    const { customId, user, guild, channel } = interaction;

    // TICKET BUTTONS
    if (customId === 'create_ticket') {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['ViewChannel']
          },
          {
            id: user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎫 Ticket Açıldı')
        .setDescription(`Merhaba ${user}! Destek ekibimiz kısa sürede yanıt verecektir.`)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Ticketi Kapat')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
      
      // Sorumlulara bildirim
      if (db.staff && db.staff.supportStaff) {
        for (const staffId of db.staff.supportStaff) {
          try {
            const staffUser = await client.users.fetch(staffId);
            await staffUser.send(`📝 Yeni ticket: <#${ticketChannel.id}> - ${user.username}`);
          } catch (e) {
            console.log('Staff bildirim gönderilemedi');
          }
        }
      }

      interaction.reply({ content: `✅ Ticket oluşturuldu: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (customId === 'close_ticket') {
      if (channel.name.startsWith('ticket-')) {
        await channel.delete();
      }
    }

    // DESTEK BUTTONS
    if (customId === 'create_support') {
      const supportChannel = await guild.channels.create({
        name: `destek-${user.username}`,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['ViewChannel']
          },
          {
            id: user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          }
        ]
      });

      const supportEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💬 Destek Talebi Oluşturuldu')
        .setDescription(`${user} tarafından destek talebi açıldı.`)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('support_ustlen')
            .setLabel('Talebi Üstlen')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('support_kapat')
            .setLabel('Talebi Kapat')
            .setStyle(ButtonStyle.Danger)
        );

      await supportChannel.send({ embeds: [supportEmbed], components: [row] });
      interaction.reply({ content: `✅ Destek talebi oluşturuldu: <#${supportChannel.id}>`, ephemeral: true });
    }

    if (customId === 'support_ustlen') {
      if (!db.staff || !db.staff.supportStaff.includes(user.id)) {
        return interaction.reply({ content: '❌ Yalnızca sorumlular bu işlemi yapabilir!', ephemeral: true });
      }

      const msg = await channel.messages.fetch(interaction.message.id);
      const embed = msg.embeds[0];
      embed.data.fields = embed.data.fields || [];
      embed.data.fields.push({ name: '👤 Sorumlu', value: `${user}`, inline: false });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('support_kapat')
            .setLabel('Talebi Kapat')
            .setStyle(ButtonStyle.Danger)
        );

      await msg.edit({ embeds: [embed], components: [row] });
      interaction.reply({ content: `✅ Destek talebini üstlendin!`, ephemeral: true });
    }

    if (customId === 'support_kapat' || customId === 'close_ticket') {
      if (channel.name.startsWith('destek-') || channel.name.startsWith('ticket-')) {
        await channel.delete();
      }
    }

    // ÇEKİLİŞ BUTTONS
    if (customId === 'join_giveaway') {
      const msg = interaction.message;
      if (db.giveaways && db.giveaways[msg.id]) {
        const giveaway = db.giveaways[msg.id];
        
        if (!giveaway.participants.includes(user.id)) {
          giveaway.participants.push(user.id);
          saveDatabase(db);
          interaction.reply({ content: '✅ Çekilişe katıldın!', ephemeral: true });
        } else {
          interaction.reply({ content: '⚠️ Zaten çekilişte varsın!', ephemeral: true });
        }
      }
    }
  }

  // ✅ YENİ: STRING SELECT HANDLER (STOK SEÇİMİ) - Şu an kullanılmıyor, random sistem kullanılıyor
  // Eski kod burada duruyordu ama artık gerek yok
  if (interaction.isStringSelectMenu()) {
    const db = getDatabase();
    const { customId, values, user, guild } = interaction;

    if (customId === 'select_stock') {
      try {
        interaction.reply({ content: '⚠️ Stok seçim sistemi kapatıldı. Lütfen `/owoileode` komutu kullanın!', ephemeral: true });
      } catch (error) {
        console.error('Stok seçim hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }
  }

  // ✅ YENİ: BUTTON HANDLER - OWO ÖDEMESİ
  if (interaction.isButton()) {
    const db = getDatabase();
    const { customId, user, guild, channel } = interaction;

    // OWO ÖDEME CONFIRM BUTTON
    if (customId.startsWith('confirm_owo_')) {
      try {
        const parts = customId.split('_');
        const productId = parts[2];
        const userId = parts[3];

        if (user.id !== userId) {
          return interaction.reply({ content: '❌ Bu ödemeyi yapabilecek kişi değilsiniz!', ephemeral: true });
        }

        const product = db.products.find(p => p.id === productId);
        if (!product) {
          return interaction.reply({ content: '❌ Ürün bulunamadı!', ephemeral: true });
        }

        // Initialize pending payments array
        if (!db.owoPendingPayments) db.owoPendingPayments = [];

        // OWO fiyatını al (default 7650)
        const owoPrice = (db.settings && db.settings.owoPrice) || 7650;

        // Pending payment'a ekle
        const pendingPayment = {
          id: Date.now().toString() + Math.random(),
          userId: user.id,
          userName: user.username,
          productId: productId,
          productName: product.name,
          owoAmount: owoPrice,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        db.owoPendingPayments.push(pendingPayment);
        saveDatabase(db);

        // OWO transfer talimatı embed'i
        const instructionEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Ödeme Talebiniz Kaydedildi')
          .setDescription('Aşağıdaki komutu OWO botuna yazın:')
          .addFields(
            { name: '🎮 Ürün', value: product.name, inline: true },
            { name: '💜 Tutar', value: `**${owoPrice} OWO**`, inline: true },
            { name: '📝 OWO Bot Komutu', value: `\`\`\`\n/w send @umutpapa123 ${owoPrice}\n\`\`\``, inline: false },
            { name: '⏳ Sonraki Adım', value: 'Admin `/owoçek` yazıp ödemenizi onayladığında hesaplar gönderilecek!', inline: false }
          )
          .setFooter({ text: 'OWO Ödeme Sistemi' })
          .setTimestamp();

        interaction.reply({ embeds: [instructionEmbed], ephemeral: true });

        // Admin'e bildir
        const ownerUser = await client.users.fetch(OWNER_ID);
        const notificationEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('💜 Yeni OWO Ödeme Talebi')
          .setDescription(`**${user.username}** ödeme talebinde bulundu.`)
          .addFields(
            { name: '🎮 Ürün', value: product.name, inline: true },
            { name: '💜 Tutar', value: `${owoPrice} OWO`, inline: true },
            { name: '👤 Kullanıcı', value: `<@${user.id}>`, inline: true },
            { name: '📧 ID', value: user.id, inline: true },
            { name: '⏰ Talep Zamanı', value: new Date().toLocaleString('tr-TR'), inline: false },
            { name: '📝 Sonraki Adım', value: '`/owoçek` yazıp ödemeleri kontrol edin!', inline: false }
          )
          .setFooter({ text: 'OWO ödeme talebiniz alındı' })
          .setTimestamp();

        await ownerUser.send({ embeds: [notificationEmbed] });

        // Sistem logları
        addSystemLog(db, 'OWO_PAYMENT_INITIATED', `OWO ödeme talebinin başlatıldı: ${user.username} - ${product.name} (${owoPrice} OWO)`, user.id);

        console.log(`💜 OWO ödeme talebi kaydedildi: ${user.username} → ${product.name}`);
      } catch (error) {
        console.error('OWO ödeme hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // ✅ ADMIN ONAY BUTTON - OWO ÖDEMESİNİ ONAYLA (Pending'den)
    if (customId.startsWith('approve_pending_owo_')) {
      try {
        if (user.id !== OWNER_ID) {
          return interaction.reply({ content: '❌ Sadece admin bu işlemi yapabilir!', ephemeral: true });
        }

        if (!db.owoPendingPayments) db.owoPendingPayments = [];

        const index = parseInt(customId.split('_')[3]);
        const payment = db.owoPendingPayments[index];

        if (!payment) {
          return interaction.reply({ content: '❌ Ödeme bulunamadı!', ephemeral: true });
        }

        const product = db.products.find(p => p.id === payment.productId);
        if (!product) {
          return interaction.reply({ content: '❌ Ürün bulunamadı!', ephemeral: true });
        }

        // Kullanılabilir hesapları kontrol et
        const availableAccounts = product.accounts.filter(acc => !acc.used);
        if (availableAccounts.length === 0) {
          return interaction.reply({ content: '❌ Stokta hesap kalmadı!', ephemeral: true });
        }

        // Random hesap seç
        const randomIndex = Math.floor(Math.random() * availableAccounts.length);
        const selectedAccount = availableAccounts[randomIndex];
        selectedAccount.used = true;
        product.quantity -= 1;

        // Pending payment'ı sil
        db.owoPendingPayments.splice(index, 1);
        saveDatabase(db);

        // Kullanıcıya DM gönder
        const purchaseEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ Ödeme Onaylandı!')
          .setDescription(`Satın aldığınız ürün aşağıda:`)
          .addFields(
            { name: '🎮 Ürün', value: product.name, inline: true },
            { name: '💜 Ödenen Tutar', value: '7650 OWO', inline: true },
            { name: '📦 Hesap Bilgisi', value: `\`\`\`\n${selectedAccount.details}\n\`\`\``, inline: false },
            { name: '⏰ Tarih', value: new Date().toLocaleString('tr-TR'), inline: false }
          )
          .setFooter({ text: 'Teşekkür ederiz! - Zwozez' })
          .setTimestamp();

        const noteEmbed = new EmbedBuilder()
          .setColor(0xff9900)
          .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!')
          .setTimestamp();

        try {
          const targetUser = await client.users.fetch(payment.userId);
          await targetUser.send({ embeds: [purchaseEmbed] });
          setTimeout(async () => {
            await targetUser.send({ embeds: [noteEmbed] });
          }, 1000);
        } catch (e) {
          console.log('DM gönderilemedi:', payment.userId);
        }

        // Admin'e onay mesajı
        interaction.reply({ content: `✅ **${payment.userName}** kullanıcısının ödeme onaylandı!\n\n🎮 Ürün: ${product.name}\n💜 Tutar: 7650 OWO\n📦 Random hesap gönderildi!`, ephemeral: true });

        // Sistem logları
        addSystemLog(db, 'OWO_PAYMENT_APPROVED', `OWO ödeme onaylandı: ${payment.userName} - ${product.name}`, OWNER_ID);

        console.log(`✅ OWO ödeme onaylandı: ${payment.userName} → ${product.name}`);
      } catch (error) {
        console.error('OWO onay hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // ❌ ADMIN RED BUTTON
    if (customId.startsWith('reject_owo_')) {
      try {
        if (user.id !== OWNER_ID) {
          return interaction.reply({ content: '❌ Sadece admin bu işlemi yapabilir!', ephemeral: true });
        }

        const userId = customId.split('_')[2];

        // Kullanıcıya DM gönder
        const rejectEmbed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('❌ Ödeme Reddedildi')
          .setDescription('Maalesef OWO ödemeniz admin tarafından reddedildi.')
          .addFields(
            { name: '📧 İletişim', value: 'Sorularınız için admin ile iletişime geçin.', inline: false }
          )
          .setFooter({ text: 'Zwozez - OWO Ödeme Sistemi' })
          .setTimestamp();

        try {
          const targetUser = await client.users.fetch(userId);
          await targetUser.send({ embeds: [rejectEmbed] });
        } catch (e) {
          console.log('DM gönderilemedi:', userId);
        }

        // Admin'e mesaj
        interaction.reply({ content: `❌ Ödeme reddedildi. Kullanıcıya bildirim gönderildi.`, ephemeral: true });

        console.log(`❌ OWO ödeme reddedildi: ${userId}`);
      } catch (error) {
        console.error('OWO red hatası:', error);
        interaction.reply({ content: `❌ Hata: ${error.message}`, ephemeral: true });
      }
    }

    // İPTAL BUTTON
    if (customId === 'cancel_owo') {
      interaction.reply({ content: '❌ İşlem iptal edildi.', ephemeral: true });
    }

    // TICKET BUTTONS
    if (customId === 'create_ticket') {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['ViewChannel']
          },
          {
            id: user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎫 Ticket Açıldı')
        .setDescription(`Merhaba ${user}! Destek ekibimiz kısa sürede yanıt verecektir.`)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Ticketi Kapat')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
      
      // Sorumlulara bildirim
      if (db.staff && db.staff.supportStaff) {
        for (const staffId of db.staff.supportStaff) {
          try {
            const staffUser = await client.users.fetch(staffId);
            await staffUser.send(`📝 Yeni ticket: <#${ticketChannel.id}> - ${user.username}`);
          } catch (e) {
            console.log('Staff bildirim gönderilemedi');
          }
        }
      }

      interaction.reply({ content: `✅ Ticket oluşturuldu: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (customId === 'close_ticket') {
      if (channel.name.startsWith('ticket-')) {
        await channel.delete();
      }
    }

    // DESTEK BUTTONS
    if (customId === 'create_support') {
      const supportChannel = await guild.channels.create({
        name: `destek-${user.username}`,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['ViewChannel']
          },
          {
            id: user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          }
        ]
      });

      const supportEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💬 Destek Talebi Oluşturuldu')
        .setDescription(`${user} tarafından destek talebi açıldı.`)
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('support_ustlen')
            .setLabel('Talebi Üstlen')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('support_kapat')
            .setLabel('Talebi Kapat')
            .setStyle(ButtonStyle.Danger)
        );

      await supportChannel.send({ embeds: [supportEmbed], components: [row] });
      interaction.reply({ content: `✅ Destek talebi oluşturuldu: <#${supportChannel.id}>`, ephemeral: true });
    }

    if (customId === 'support_ustlen') {
      if (!db.staff || !db.staff.supportStaff.includes(user.id)) {
        return interaction.reply({ content: '❌ Yalnızca sorumlular bu işlemi yapabilir!', ephemeral: true });
      }

      const msg = await channel.messages.fetch(interaction.message.id);
      const embed = msg.embeds[0];
      embed.data.fields = embed.data.fields || [];
      embed.data.fields.push({ name: '👤 Sorumlu', value: `${user}`, inline: false });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('support_kapat')
            .setLabel('Talebi Kapat')
            .setStyle(ButtonStyle.Danger)
        );

      await channel.send({ embeds: [embed], components: [row] });
      interaction.reply({ content: '✅ Talebi üstlendi!', ephemeral: true });
    }

    if (customId === 'support_kapat' || customId === 'support_close') {
      await channel.delete();
    }

    // ÇEKİLİŞ BUTTONS
    if (customId === 'join_giveaway') {
      const msg = interaction.message;
      if (db.giveaways && db.giveaways[msg.id]) {
        const giveaway = db.giveaways[msg.id];
        
        if (!giveaway.participants.includes(user.id)) {
          giveaway.participants.push(user.id);
          saveDatabase(db);
          interaction.reply({ content: '✅ Çekilişe katıldın!', ephemeral: true });
        } else {
          interaction.reply({ content: '⚠️ Zaten çekilişte varsın!', ephemeral: true });
        }
      }
    }
  }
});

async function endGiveaway(messageId, db) {
  if (!db.giveaways || !db.giveaways[messageId]) return;

  const giveaway = db.giveaways[messageId];
  const { participants, product, winners, channelId, messageId: msgId } = giveaway;

  if (participants.length === 0) {
    const channel = await client.channels.fetch(channelId);
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Çekiliş Sona Erdi')
      .setDescription('Hiç katılımcı olmadığı için çekiliş iptal edildi.')
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    delete db.giveaways[messageId];
    saveDatabase(db);
    return;
  }

  // Kazananları seç
  const selectedWinners = [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(winners, shuffled.length); i++) {
    selectedWinners.push(shuffled[i]);
  }

  const channel = await client.channels.fetch(channelId);
  let winnersText = selectedWinners.map(id => `<@${id}>`).join(', ');

  const resultEmbed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🎉 Çekiliş Sona Erdi!')
    .addFields(
      { name: '🎁 Ödül', value: product.name, inline: true },
      { name: '👑 Kazananlar', value: winnersText, inline: false },
      { name: '📊 Katılımcı Sayısı', value: `${participants.length}`, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [resultEmbed] });

  // Kazananlara DM gönder
  for (const winnerId of selectedWinners) {
    try {
      const winnerUser = await client.users.fetch(winnerId);
      const availableAccounts = product.accounts.filter(acc => !acc.used);
      
      if (availableAccounts.length > 0) {
        const selectedAccount = availableAccounts[0];
        selectedAccount.used = true;
        product.quantity -= 1;

        const winEmbed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('🏆 Çekiliş Kazandınız!')
          .setDescription('Tebrikler! Çekilişi kazandınız!')
          .addFields(
            { name: '🎁 Ödül', value: product.name, inline: true },
            { name: '💰 Değeri', value: `${product.credits} kredi`, inline: true },
            { name: '🎮 Hesap', value: `\`\`\`\n${selectedAccount.details}\n\`\`\``, inline: false }
          )
          .setTimestamp();

        await winnerUser.send({ embeds: [winEmbed] });
      }
    } catch (e) {
      console.log('DM gönderilemedi:', winnerId);
    }
  }

  delete db.giveaways[messageId];
  saveDatabase(db);
}

async function sendRandomProduct(user, type) {
  const db = getDatabase();
  
  if (db.products.length === 0) {
    try {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Stok Bulunamadı')
        .setDescription('Şu anda stokta ürün yok.')
        .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {
      console.log('DM gönderilemedi');
    }
    return;
  }
  
  // Stokta olan ürünleri filtrele
  const availableProducts = db.products.filter(p => {
    const availableAccounts = p.accounts.filter(acc => !acc.used);
    return p.quantity > 0 && availableAccounts.length > 0;
  });
  
  if (availableProducts.length === 0) {
    try {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Stok Bulunamadı')
        .setDescription('Şu anda stokta mevcut hesap yok.')
        .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {
      console.log('DM gönderilemedi');
    }
    return;
  }
  
  const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
  
  // Random hesap seç
  const availableAccounts = randomProduct.accounts.filter(acc => !acc.used);
  const selectedAccount = availableAccounts[Math.floor(Math.random() * availableAccounts.length)];
  
  // Hesabı kullanılmış olarak işaretle
  selectedAccount.used = true;
  randomProduct.quantity -= 1;
  
  // Sistem logları
  addSystemLog(db, type === 'boost' ? 'BOOST_ACCOUNT_GIVEN' : 'FREE_ACCOUNT_GIVEN', 
    `${type} hesap verildi: ${user.username} - ${randomProduct.name}`, user.id);
  
  saveDatabase(db);
  
  const embed = new EmbedBuilder()
    .setColor(type === 'boost' ? 0xf39c12 : 0x2ecc71)
    .setTitle(type === 'boost' ? '🚀 Boost Hediyesi!' : '🎁 Bedava Hediye!')
    .setDescription(`**Zwozez** mağazasından ${type === 'boost' ? 'boost hediyeniz' : 'bedava hediyeniz'} aşağıda:`)
    .addFields(
      { name: 'Ürün', value: randomProduct.name, inline: true },
      { name: 'Kategori', value: 'Oyun', inline: true },
      { name: 'Değer', value: `💰 ${randomProduct.credits} Kredi`, inline: true }
    )
    .addFields(
      { name: 'İçerik', value: `\`\`\`\n${selectedAccount.details}\n\`\`\``, inline: false }
    )
    .setFooter({ 
      text: `Teşekkürler! • Zwozez • bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` 
    })
    .setTimestamp();
  
  // Not mesajı ayrı olarak gönder
  const noteEmbed = new EmbedBuilder()
    .setColor(0xff9900)
    .setDescription('⚠️ **Önemli Not:** Hesaplar net giriş değildir, çalışmayabilir. Bizi tercih ettiğiniz için teşekkürler!')
    .setTimestamp();
  
  try {
    await user.send({ embeds: [embed] });
    setTimeout(async () => {
      await user.send({ embeds: [noteEmbed] });
    }, 1000);
    console.log(`🎮 ${type} hesap verildi: ${user.username} - ${randomProduct.name}`);
  } catch (e) {
    console.log('DM gönderilemedi');
  }
}

// ============ SUNUCU ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);