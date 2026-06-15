require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const OWNER_ID = '1403495996138323989';

// JSON dosyaları
const logsFile = './logs-config.json';
const stockFile = './stock.json';
const owoFile = './owo-users.json';

// Dosyaları başlat
function initFiles() {
  if (!fs.existsSync(logsFile)) fs.writeFileSync(logsFile, JSON.stringify({}));
  if (!fs.existsSync(stockFile)) fs.writeFileSync(stockFile, JSON.stringify({}));
  if (!fs.existsSync(owoFile)) fs.writeFileSync(owoFile, JSON.stringify({}));
}

function getLogs() {
  return JSON.parse(fs.readFileSync(logsFile, 'utf8'));
}

function saveLogs(data) {
  fs.writeFileSync(logsFile, JSON.stringify(data, null, 2));
}

function getStock() {
  return JSON.parse(fs.readFileSync(stockFile, 'utf8'));
}

function saveStock(data) {
  fs.writeFileSync(stockFile, JSON.stringify(data, null, 2));
}

function getOWOUsers() {
  return JSON.parse(fs.readFileSync(owoFile, 'utf8'));
}

function saveOWOUsers(data) {
  fs.writeFileSync(owoFile, JSON.stringify(data, null, 2));
}

initFiles();

// Bot hazır
client.once('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  console.log(`🎮 ${client.guilds.cache.size} sunucuda aktif`);
  updateBotStatus();
});

// Bot durumunu güncelle
function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(`${serverCount} sunucuda aktif`, { type: 3 });
}

// Yeni sunucuya katıldığında
client.on('guildCreate', () => {
  updateBotStatus();
  console.log(`✅ Yeni sunucuya katıldı! Toplam: ${client.guilds.cache.size}`);
});

// Sunucudan atıldığında
client.on('guildDelete', () => {
  updateBotStatus();
  console.log(`❌ Sunucudan atıldı! Toplam: ${client.guilds.cache.size}`);
});

// SLASH KOMUTLARI KAYIT ET
client.on('ready', async () => {
  const commands = [
    new SlashCommandBuilder()
      .setName('sunucudurumu')
      .setDescription('Sunucu bilgilerini gösterir'),
    
    new SlashCommandBuilder()
      .setName('logkur')
      .setDescription('Log kanalını kurar ve loglamaya başlar'),
    
    new SlashCommandBuilder()
      .setName('owoileöde')
      .setDescription('OWO sistemi ile hesap gönder'),
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Slash komutları kaydedildi');
  } catch (error) {
    console.error('❌ Komut kaydı hatası:', error);
  }
});

// Sunucuya özel komutları sil
client.on('guildCreate', async (guild) => {
  try {
    await guild.commands.set([]);
    console.log(`✅ ${guild.name} sunucusundaki eski komutlar temizlendi`);
  } catch (error) {
    console.error('Komut temizleme hatası:', error);
  }
});

// SLASH KOMUT HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'sunucudurumu') {
      const guild = interaction.guild;
      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle(`📊 ${guild.name} - Sunucu Durumu`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '🏷️ Sunucu Adı', value: guild.name, inline: true },
          { name: '🔢 Sunucu ID', value: guild.id, inline: true },
          { name: '👥 Üye Sayısı', value: `${guild.memberCount}`, inline: true },
          { name: '🎮 Kanal Sayısı', value: `${guild.channels.cache.size}`, inline: true },
          { name: '📅 Oluşturulma Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
          { name: '👑 Sunucu Sahibi', value: `${owner.user.tag}`, inline: true }
        )
        .setFooter({ text: `Sunucu Durumu • ${new Date().toLocaleString('tr-TR')}` });

      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'logkur') {
      const guild = interaction.guild;
      const logs = getLogs();

      if (logs[guild.id]) {
        return await interaction.reply({ 
          content: '❌ Bu sunucuda zaten log kanalı kurulu!', 
          ephemeral: true 
        });
      }

      try {
        const logChannel = await guild.channels.create({
          name: '📋-loglar',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.SendMessages],
            }
          ]
        });

        logs[guild.id] = logChannel.id;
        saveLogs(logs);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Log Sistemi Kuruldu')
          .setDescription(`Log kanalı: ${logChannel}`)
          .addFields(
            { name: '📝 Loglanacak Olaylar', value: `
✅ Mesaj gönderme/silme/düzenleme
✅ Ses kanalı giriş/çıkış
✅ Davet oluşturma/silme
✅ Moderasyon işlemleri
            ` }
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Log kanalı oluşturma hatası:', error);
        await interaction.reply({ content: '❌ Log kanalı oluşturulamadı', ephemeral: true });
      }
    }

    else if (commandName === 'owoileöde') {
      const user = interaction.user;
      const owoUsers = getOWOUsers();

      if (!owoUsers[user.id]) {
        owoUsers[user.id] = { credits: 0, received: [] };
      }

      const userOWOs = owoUsers[user.id];
      const stockData = getStock();

      // OWO kredisi göster
      const owoList = Object.keys(stockData)
        .slice(0, 5)
        .map((key, idx) => `${idx + 1}. ${stockData[key].name} (${stockData[key].credits || 0} kredisi)`)
        .join('\n') || 'Stokta ürün yok';

      const embed = new EmbedBuilder()
        .setColor('#f093fb')
        .setTitle('🎁 OWO Sistemi')
        .setDescription(`Mevcut Kredileriniz: **${userOWOs.credits}** OWO`)
        .addFields(
          { name: '📦 Stok Ürünleri', value: owoList || 'Boş' }
        )
        .setFooter({ text: 'OWO gönder: owo send' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Komut hatası:', error);
    await interaction.reply({ content: '❌ Komut çalıştırılırken hata oluştu', ephemeral: true });
  }
});

// MESAJ EVENT - OWO TESPİTİ
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Log sistemi
  const logs = getLogs();
  const logChannelId = logs[message.guildId];

  if (logChannelId && message.guild) {
    const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📝 Mesaj Gönderildi')
        .addFields(
          { name: 'Yazar', value: `${message.author.tag}`, inline: true },
          { name: 'Kanal', value: `${message.channel}`, inline: true },
          { name: 'İçerik', value: `${message.content.substring(0, 100)}...` || '(boş)' }
        )
        .setTimestamp();
      
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }

  // OWO SEND TESPİTİ
  if (message.content.toLowerCase().includes('owo send')) {
    const sender = message.author;
    const owoUsers = getOWOUsers();
    const stockData = getStock();

    if (!owoUsers[sender.id]) {
      return await message.reply('❌ Sizin OWO kredisi yok!');
    }

    if (owoUsers[sender.id].credits <= 0) {
      return await message.reply('❌ Kredileriniz yetersiz!');
    }

    // Random ürün seç
    const stockKeys = Object.keys(stockData);
    if (stockKeys.length === 0) {
      return await message.reply('❌ Stokta ürün yok!');
    }

    const randomProduct = stockData[stockKeys[Math.floor(Math.random() * stockKeys.length)]];

    try {
      const owner = await client.users.fetch(OWNER_ID);
      const dmEmbed = new EmbedBuilder()
        .setColor('#f5576c')
        .setTitle('🎁 OWO Hediyesi Aldınız!')
        .setDescription(`${sender.tag} tarafından OWO gönderildi`)
        .addFields(
          { name: '📦 Ürün', value: randomProduct.name },
          { name: '🔗 Bağlantı', value: randomProduct.link || 'Bağlantı yok' },
          { name: '🖼️ Görsel', value: randomProduct.image || 'Görsel yok' }
        )
        .setTimestamp();

      await owner.send({ embeds: [dmEmbed] });

      owoUsers[sender.id].credits--;
      saveOWOUsers(owoUsers);

      await message.reply(`✅ OWO gönderildi! Kalan Kredileriniz: ${owoUsers[sender.id].credits}`);
    } catch (error) {
      console.error('OWO gönderme hatası:', error);
      await message.reply('❌ OWO gönderilemedi');
    }
  }
});

// MESAJ SİLME LOGLAMA
client.on('messageDelete', async (message) => {
  if (!message.guild) return;

  const logs = getLogs();
  const logChannelId = logs[message.guildId];

  if (logChannelId) {
    const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🗑️ Mesaj Silindi')
        .addFields(
          { name: 'Yazar', value: `${message.author?.tag || 'Bilinmiyor'}`, inline: true },
          { name: 'Kanal', value: `${message.channel}`, inline: true },
          { name: 'İçerik', value: `${message.content.substring(0, 100) || '(boş)'}` }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
  }
});

// MESAJ DÜZENLEME LOGLAMA
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.guild || oldMessage.content === newMessage.content) return;

  const logs = getLogs();
  const logChannelId = logs[newMessage.guildId];

  if (logChannelId) {
    const logChannel = await newMessage.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('✏️ Mesaj Düzenlendi')
        .addFields(
          { name: 'Yazar', value: `${newMessage.author?.tag}`, inline: true },
          { name: 'Kanal', value: `${newMessage.channel}`, inline: true },
          { name: 'Eski İçerik', value: oldMessage.content.substring(0, 100) || '(boş)' },
          { name: 'Yeni İçerik', value: newMessage.content.substring(0, 100) || '(boş)' }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
  }
});

// ========== WEB SERVER & API ==========

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/bot-stats', async (req, res) => {
  try {
    if (!client.user) {
      return res.json({
        status: 'offline',
        servers: 0,
        bot: null,
        founder: null
      });
    }

    let founderData = null;
    try {
      const founder = await client.users.fetch(OWNER_ID);
      founderData = {
        username: founder.username,
        tag: founder.tag,
        id: founder.id,
        avatar: founder.displayAvatarURL({ dynamic: true, size: 128 }),
        status: 'online'
      };
    } catch (error) {
      console.error('Kurucu bilgisi hatası:', error);
    }

    res.json({
      status: 'online',
      servers: client.guilds.cache.size,
      bot: {
        username: client.user.username,
        tag: client.user.tag,
        id: client.user.id,
        avatar: client.user.displayAvatarURL({ dynamic: true, size: 256 })
      },
      founder: founderData
    });
  } catch (error) {
    console.error('Bot stats API hatası:', error);
    res.status(500).json({ error: 'İstatistik alınamadı' });
  }
});

// STOK YÖNETİMİ API
app.post('/api/stock/add', express.json(), (req, res) => {
  const { id, name, link, image, credits, type, description } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID ve isim gerekli' });
  }

  const stock = getStock();
  stock[id] = { 
    name, 
    link, 
    image, 
    credits: credits || 0, 
    type: type || 'stock',
    description: description || ''
  };
  saveStock(stock);

  res.json({ success: true, message: type === 'product' ? 'Ürün eklendi' : 'Stok eklendi' });
});

app.get('/api/stock', (req, res) => {
  const stock = getStock();
  res.json(stock);
});

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
