require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
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
    products: [],
    userRights: {},
    pendingOrders: [],
    completedOrders: [],
    creditHistory: [], // Kredi işlem geçmişi
    loginHistory: [], // Giriş geçmişi
    systemLogs: [] // Sistem logları
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
const OWNER_ID = 'umutpapa123';

// ============ WEB SİTESİ ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Kayıt Ol - Geliştirilmiş Sistem
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
  
  // Yeni kullanıcı oluştur
  const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const user = {
    id: userId,
    name: name.trim(),
    discordId: discordId.trim(),
    email: email.trim().toLowerCase(),
    password: password, // Gerçek projede hash'lenmelidir
    credits: 10, // Hoş geldin bonusu
    totalSpent: 0,
    totalEarned: 10,
    registrationDate: new Date().toISOString(),
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
  db.userRights[userId] = { 
    boostRights: 0, 
    freeRights: 1 // İlk kayıt bonusu
  };
  
  // Sistem logları
  addSystemLog(db, 'USER_REGISTERED', `Yeni kullanıcı kaydı: ${user.name} (${user.discordId})`, userId);
  addCreditHistory(db, userId, 10, 'earned', 'Hoş geldin bonusu');
  
  saveDatabase(db);
  
  console.log(`✅ Yeni kullanıcı kaydı: ${user.name} (${user.discordId})`);
  
  res.json({ 
    success: true, 
    message: 'Kayıt başarılı! 10 kredi ve 1 bedava hesap hakkı kazandınız!',
    user: {
      id: userId,
      name: user.name,
      credits: user.credits
    }
  });
});

// Giriş Yap - Geliştirilmiş Sistem
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
      totalSpent: user.totalSpent || 0,
      totalEarned: user.totalEarned || 0,
      loginCount: user.loginCount,
      registrationDate: user.registrationDate
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

// Admin: Ürün Ekle
app.post('/api/admin/products', (req, res) => {
  const { name, quantity, credits, accounts } = req.body;
  
  const db = getDatabase();
  
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
    name,
    quantity: parseInt(quantity),
    credits: parseInt(credits),
    accounts: accountList,
    createdAt: new Date()
  };
  
  db.products.push(product);
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

// Kullanıcı Bilgilerini Güncelle - Geliştirilmiş
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
    recentOrders: orders
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
          .setRequired(true))
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
  if (!interaction.isCommand()) return;

  const { commandName, options, user, guild } = interaction;
  const db = getDatabase();

  if (commandName === 'boosthesap') {
    // Boost kontrolü
    try {
      const member = await guild.members.fetch(user.id);
      
      if (!member.premiumSince) {
        return interaction.reply({ content: '❌ Bu komutu kullanmak için sunucuya boost yapman gerekiyor!', ephemeral: true });
      }
      
      const userId = user.id;
      
      if (!db.userRights[userId]) {
        db.userRights[userId] = { boostRights: 4, freeRights: 0 };
        saveDatabase(db);
        
        await sendRandomProduct(user, 'boost');
        return interaction.reply({ content: '🎉 İlk boost hesabın! 4 hakkın var, şimdi 3 kaldı.', ephemeral: true });
      }
      
      if (db.userRights[userId].boostRights <= 0) {
        return interaction.reply({ content: '❌ Boost hesap hakkın kalmamış!', ephemeral: true });
      }
      
      db.userRights[userId].boostRights--;
      saveDatabase(db);
      
      await sendRandomProduct(user, 'boost');
      interaction.reply({ content: `✅ Boost hesap gönderildi! Kalan hakkın: ${db.userRights[userId].boostRights}`, ephemeral: true });
      
    } catch (error) {
      interaction.reply({ content: '❌ Boost durumun kontrol edilemedi!', ephemeral: true });
    }
  }

  if (commandName === 'bedavahesap') {
    const userId = user.id;
    
    if (!db.userRights[userId] || db.userRights[userId].freeRights <= 0) {
      return interaction.reply({ content: '❌ Bedava hesap hakkın yok!', ephemeral: true });
    }
    
    db.userRights[userId].freeRights--;
    saveDatabase(db);
    
    await sendRandomProduct(user, 'free');
    interaction.reply({ content: `✅ Bedava hesap gönderildi! Kalan hakkın: ${db.userRights[userId].freeRights}`, ephemeral: true });
  }

  if (commandName === 'hakver') {
    if (user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ Bu komutu sadece owner kullanabilir!', ephemeral: true });
    }
    
    const tip = options.getString('tip');
    const targetUser = options.getUser('kullanici');
    const adet = options.getInteger('adet');
    
    if (!db.userRights[targetUser.id]) {
      db.userRights[targetUser.id] = { boostRights: 0, freeRights: 0 };
    }
    
    if (tip === 'boost') {
      db.userRights[targetUser.id].boostRights += adet;
    } else {
      db.userRights[targetUser.id].freeRights += adet;
    }
    
    saveDatabase(db);
    
    const tipText = tip === 'boost' ? 'Boost Hesap' : 'Bedava Hesap';
    interaction.reply({ content: `✅ ${targetUser.username} kullanıcısına ${adet} adet ${tipText} hakkı verildi!`, ephemeral: true });
  }
});

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