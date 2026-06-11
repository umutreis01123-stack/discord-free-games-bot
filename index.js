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
    users: [],
    products: [],
    userRights: {}, // userId -> { boostRights: 0, freeRights: 0 }
    pendingOrders: [],
    completedOrders: []
  };
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB kaydedilemedi:', e.message);
  }
}

const ADMIN_USER = 'umut';
const ADMIN_PASS = 'umutpapa001122u';
const OWNER_ID = 'umutpapa123';

// ============ WEB SİTESİ ============

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
  
  if (db.users.some(u => u.discordId === discordId || u.email === email)) {
    return res.status(400).json({ error: 'Bu Discord ID veya E-posta zaten kayıtlı' });
  }
  
  const user = {
    id: Date.now().toString(),
    name,
    discordId,
    email,
    password,
    credits: 0,
    createdAt: new Date()
  };
  
  db.users.push(user);
  db.userRights[user.id] = { boostRights: 0, freeRights: 0 };
  saveDatabase(db);
  
  res.json({ success: true, message: 'Kayıt başarılı' });
});

// Giriş Yap
app.post('/api/login', (req, res) => {
  const { discordId, password } = req.body;
  
  const db = getDatabase();
  const user = db.users.find(u => u.discordId === discordId && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Hatalı Discord ID veya Şifre' });
  }
  
  res.json({ 
    success: true, 
    user: {
      id: user.id,
      name: user.name,
      credits: user.credits
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

// Admin: Kredi Ver
app.post('/api/admin/give-credits', (req, res) => {
  const { userId, amount } = req.body;
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  user.credits += parseInt(amount);
  saveDatabase(db);
  
  res.json({ success: true, newCredits: user.credits });
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

// Ürün Satın Al
app.post('/api/buy-product', (req, res) => {
  const { userId, productId, quantity } = req.body;
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  const product = db.products.find(p => p.id === productId);
  
  if (!user || !product) {
    return res.status(404).json({ error: 'Kullanıcı veya ürün bulunamadı' });
  }
  
  const totalCost = product.credits * quantity;
  
  if (user.credits < totalCost) {
    return res.status(400).json({ error: 'Yetersiz kredi' });
  }
  
  if (product.quantity < quantity) {
    return res.status(400).json({ error: 'Yetersiz stok' });
  }
  
  // Onay bekleyenler listesine ekle
  const order = {
    id: Date.now().toString(),
    userId: user.id,
    userName: user.name,
    userDiscordId: user.discordId,
    productId: product.id,
    productName: product.name,
    quantity,
    totalCost,
    status: 'pending',
    createdAt: new Date()
  };
  
  db.pendingOrders.push(order);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Sipariş onay bekliyor', orderId: order.id });
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
  
  // Kredi düş
  user.credits -= order.totalCost;
  
  // Stok azalt
  product.quantity -= order.quantity;
  
  // Siparişi tamamlananlara taşı
  order.status = 'completed';
  order.selectedAccounts = selectedAccounts;
  order.completedAt = new Date();
  
  db.completedOrders.push(order);
  db.pendingOrders.splice(orderIndex, 1);
  
  saveDatabase(db);
  
  // Bot'a DM gönder
  client.users.fetch(order.userDiscordId).then(userDM => {
    const accountDetails = selectedAccounts.map((acc, i) => `**${i + 1}.** ${acc.details}`).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Sipariş Onaylandı!')
      .addFields(
        { name: '📦 Ürün', value: order.productName, inline: true },
        { name: '🔢 Adet', value: order.quantity.toString(), inline: true },
        { name: '💰 Harcanan Kredi', value: order.totalCost.toString(), inline: true }
      )
      .setDescription(`🎮 **Hesap Bilgileri:**\n${accountDetails}`)
      .setFooter({ text: 'Zwozez Discord Botu' });
    
    userDM.send({ embeds: [embed] });
  }).catch(err => {
    console.log('DM gönderilemedi:', err);
  });
  
  res.json({ success: true, message: 'Sipariş onaylandı ve hesaplar gönderildi' });
});

// Kullanıcı Bilgilerini Güncelle
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  const db = getDatabase();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    credits: user.credits
  });
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
      await user.send('❌ Şu anda stokta ürün yok.');
    } catch (e) {
      console.log('DM gönderilemedi');
    }
    return;
  }
  
  const randomProduct = db.products[Math.floor(Math.random() * db.products.length)];
  
  const embed = new EmbedBuilder()
    .setColor(type === 'boost' ? 0xf39c12 : 0x2ecc71)
    .setTitle(type === 'boost' ? '🚀 Boost Hesap!' : '🎁 Bedava Hesap!')
    .addFields(
      { name: '📦 Ürün', value: randomProduct.name, inline: true },
      { name: '💰 Değeri', value: `${randomProduct.credits} kredi`, inline: true }
    )
    .setDescription('Hesap bilgileri yakında admin tarafından gönderilecek.')
    .setFooter({ text: 'Zwozez Discord Botu' });
  
  try {
    await user.send({ embeds: [embed] });
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