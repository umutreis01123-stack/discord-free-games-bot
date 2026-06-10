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
    stocks: [] // { id, name, quantity, products: [] }
  };
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB kaydedilemedi:', e.message);
  }
}

// ============ WEB SİTESİ ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Stokları Getir
app.get('/api/stocks', (req, res) => {
  const db = getDatabase();
  res.json(db.stocks);
});

// API: Stok Ekle (Site)
app.post('/api/stocks', (req, res) => {
  const { name, quantity } = req.body;
  
  if (!name || quantity === undefined) {
    return res.status(400).json({ error: 'Stok adı ve miktarı gerekli' });
  }
  
  const db = getDatabase();
  
  // Aynı isimde stok varsa kontrol et
  if (db.stocks.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Bu stok zaten var' });
  }
  
  const stock = {
    id: Date.now().toString(),
    name,
    quantity: parseInt(quantity),
    products: [],
    createdAt: new Date()
  };
  
  db.stocks.push(stock);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Stok eklendi', stock });
});

// API: Ürün Ekle (Site)
app.post('/api/products', (req, res) => {
  const { stockId, productName } = req.body;
  
  if (!stockId || !productName) {
    return res.status(400).json({ error: 'Stok ve ürün adı gerekli' });
  }
  
  const db = getDatabase();
  const stock = db.stocks.find(s => s.id === stockId);
  
  if (!stock) {
    return res.status(400).json({ error: 'Stok bulunamadı' });
  }
  
  const product = {
    id: Date.now().toString(),
    name: productName,
    createdAt: new Date()
  };
  
  stock.products.push(product);
  saveDatabase(db);
  
  res.json({ success: true, message: 'Ürün eklendi', product });
});

// ============ DISCORD BOT ============

client.on('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  
  // Slash komutlarını kaydet
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

  const { commandName, options } = interaction;
  const db = getDatabase();

  if (commandName === 'stokekle') {
    const name = options.getString('isim');
    const quantity = options.getInteger('miktar');

    // Aynı isimde stok varsa kontrol et
    if (db.stocks.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      return interaction.reply('❌ Bu stok zaten var!');
    }

    const stock = {
      id: Date.now().toString(),
      name,
      quantity,
      products: [],
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
      embed.addFields({
        name: `${stock.name}`,
        value: `📊 Miktar: **${stock.quantity}**\n🎮 Ürünler: ${stock.products.length}\n${
          stock.products.length > 0 
            ? stock.products.map(p => `• ${p.name}`).join('\n')
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

    const product = {
      id: Date.now().toString(),
      name: productName,
      createdAt: new Date()
    };

    stock.products.push(product);
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
});

// ============ SUNUCU ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
