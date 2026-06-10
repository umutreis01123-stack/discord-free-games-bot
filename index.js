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
    supportTickets: [],
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

const OWNER_ID = 'umutpapa123';

// ============ WEB SİTESİ ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Stokları Getir
app.get('/api/stocks', (req, res) => {
  const db = getDatabase();
  res.json(db.stocks);
});

// API: Stok Ekle
app.post('/api/stocks', (req, res) => {
  const { name, quantity } = req.body;
  
  if (!name || quantity === undefined) {
    return res.status(400).json({ error: 'Stok adı ve miktarı gerekli' });
  }
  
  const db = getDatabase();
  
  if (db.stocks.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Bu stok zaten var' });
  }
  
  const stock = {
    id: Date.now().toString(),
    name,
    quantity: parseInt(quantity),
    products: Array(parseInt(quantity)).fill(null).map((_, i) => ({
      id: i.toString(),
      name: '',
      createdAt: new Date()
    })),
    createdAt: new Date()
  };
  
  db.stocks.push(stock);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Stok eklendi', stock });
});

// API: Ürün Ekle (Slot'a)
app.post('/api/products', (req, res) => {
  const { stockId, productIndex, productName } = req.body;
  
  if (!stockId || productIndex === undefined || !productName) {
    return res.status(400).json({ error: 'Parametreler eksik' });
  }
  
  const db = getDatabase();
  const stock = db.stocks.find(s => s.id === stockId);
  
  if (!stock) {
    return res.status(400).json({ error: 'Stok bulunamadı' });
  }
  
  if (productIndex < 0 || productIndex >= stock.products.length) {
    return res.status(400).json({ error: 'Geçersiz ürün indeksi' });
  }
  
  stock.products[productIndex].name = productName;
  saveDatabase(db);
  
  res.json({ success: true, message: 'Ürün eklendi', product: stock.products[productIndex] });
});

// API: Stok Sil
app.delete('/api/stocks/:id', (req, res) => {
  const { id } = req.params;
  
  const db = getDatabase();
  db.stocks = db.stocks.filter(s => s.id !== id);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Stok silindi' });
});

// ============ DISCORD BOT ============

client.on('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  registerSlashCommands();
});

async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('stokekle')
      .setDescription('Yeni stok ekle')
      .addStringOption(option =>
        option.setName('isim')
          .setDescription('Stok adı')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('miktar')
          .setDescription('Stok miktarı')
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName('stoklar')
      .setDescription('Tüm stokları göster'),
    
    new SlashCommandBuilder()
      .setName('urunekle')
      .setDescription('Stoka ürün ekle')
      .addStringOption(option =>
        option.setName('stok')
          .setDescription('Stok adı')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('urun')
          .setDescription('Ürün adı')
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName('komutlarıkapat')
      .setDescription('Komutları kapat (Admin Only)'),
    
    new SlashCommandBuilder()
      .setName('komutlarıaç')
      .setDescription('Komutları aç (Admin Only)'),
    
    new SlashCommandBuilder()
      .setName('destek')
      .setDescription('Destek talebi oluştur')
      .addStringOption(option =>
        option.setName('konu')
          .setDescription('Konu')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('mesaj')
          .setDescription('Mesaj')
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Ticket oluştur / kapat')
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

  const { commandName, options, user } = interaction;
  const db = getDatabase();

  // Komut kontrolü
  if (!db.commandsEnabled && user.id !== OWNER_ID) {
    if (commandName !== 'komutlarıaç') {
      return interaction.reply('❌ Komutlar şu anda kapalı!');
    }
  }

  if (commandName === 'stokekle') {
    const name = options.getString('isim');
    const quantity = options.getInteger('miktar');

    if (db.stocks.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      return interaction.reply('❌ Bu stok zaten var!');
    }

    const stock = {
      id: Date.now().toString(),
      name,
      quantity,
      products: Array(quantity).fill(null).map((_, i) => ({
        id: i.toString(),
        name: '',
        createdAt: new Date()
      })),
      createdAt: new Date()
    };

    db.stocks.push(stock);
    saveDatabase(db);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Stok Eklendi')
      .addFields(
        { name: '📦 Stok Adı', value: name, inline: true },
        { name: '📊 Miktar', value: quantity.toString(), inline: true }
      )
      .setFooter({ text: 'Zwozez Discord Botu' });

    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'stoklar') {
    if (db.stocks.length === 0) {
      return interaction.reply('❌ Henüz stok eklenmemiş');
    }

    const embed = new EmbedBuilder()
      .setColor(0xe94560)
      .setTitle('📦 Canlı Stoklar');

    db.stocks.forEach(stock => {
      const filledCount = stock.products.filter(p => p.name).length;
      embed.addFields({
        name: `${stock.name}`,
        value: `📊 Kapasite: **${filledCount}/${stock.quantity}**\n${
          stock.products.filter(p => p.name).length > 0 
            ? stock.products.filter(p => p.name).map(p => `✅ ${p.name}`).join('\n')
            : '(Ürün yok)'
        }`,
        inline: false
      });
    });

    embed.setFooter({ text: 'Zwozez Discord Botu' });
    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'urunekle') {
    const stockName = options.getString('stok');
    const productName = options.getString('urun');

    const stock = db.stocks.find(s => s.name.toLowerCase() === stockName.toLowerCase());

    if (!stock) {
      return interaction.reply('❌ Stok bulunamadı!');
    }

    const emptySlot = stock.products.find(p => !p.name);
    
    if (!emptySlot) {
      return interaction.reply('❌ Stokta boş yer yok!');
    }

    emptySlot.name = productName;
    saveDatabase(db);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Ürün Eklendi')
      .addFields(
        { name: '📦 Stok', value: stock.name, inline: true },
        { name: '🎮 Ürün', value: productName, inline: true }
      )
      .setFooter({ text: 'Zwozez Discord Botu' });

    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'komutlarıkapat') {
    if (user.id !== OWNER_ID) {
      return interaction.reply('❌ Buna yetkiniz yok!');
    }

    db.commandsEnabled = false;
    saveDatabase(db);

    interaction.reply('🔒 Komutlar kapatıldı!');
  }

  if (commandName === 'komutlarıaç') {
    if (user.id !== OWNER_ID) {
      return interaction.reply('❌ Buna yetkiniz yok!');
    }

    db.commandsEnabled = true;
    saveDatabase(db);

    interaction.reply('🔓 Komutlar açıldı!');
  }

  if (commandName === 'destek') {
    const konu = options.getString('konu');
    const mesaj = options.getString('mesaj');

    const ticket = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      konu,
      mesaj,
      createdAt: new Date(),
      status: 'açık'
    };

    if (!db.supportTickets) db.supportTickets = [];
    db.supportTickets.push(ticket);
    saveDatabase(db);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎫 Destek Talebi Oluşturuldu')
      .addFields(
        { name: 'Konu', value: konu, inline: true },
        { name: 'Ticket ID', value: ticket.id, inline: true },
        { name: 'Mesaj', value: mesaj }
      )
      .setFooter({ text: 'Zwozez Discord Botu' });

    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ticket') {
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎫 Ticket Sistemi')
      .setDescription('`/destek konu mesaj` komutu ile destek talebi oluştur')
      .setFooter({ text: 'Zwozez Discord Botu' });

    interaction.reply({ embeds: [embed] });
  }
});

// ============ SUNUCU ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
