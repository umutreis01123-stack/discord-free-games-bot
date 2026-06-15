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

// JSON dosyalari
const logsFile = './logs-config.json';
const stockFile = './stock.json';
const owoFile = './owo-users.json';

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

// Bot ready
client.once('ready', () => {
  console.log('Bot logged in: ' + client.user.tag);
  console.log('Active in ' + client.guilds.cache.size + ' servers');
  updateBotStatus();
});

function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(serverCount + ' sunucuda aktif', { type: 3 });
}

client.on('guildCreate', () => {
  updateBotStatus();
  console.log('New guild joined! Total: ' + client.guilds.cache.size);
});

client.on('guildDelete', () => {
  updateBotStatus();
  console.log('Guild removed. Total: ' + client.guilds.cache.size);
});

// KOMUTLAR - TEMIZ VE BASIT
client.on('ready', async () => {
  try {
    console.log('Komutlar temizleniyor ve yenileniyor...');

    const allGlobalCommands = await client.application.commands.fetch();
    console.log('Siliniyor: ' + allGlobalCommands.size + ' komut');
    
    for (const command of allGlobalCommands.values()) {
      try {
        await command.delete();
        console.log('Silindi: ' + command.name);
      } catch (error) {
        console.error('Hata: ' + command.name);
      }
    }

    console.log('Sunucu komutlari temizleniyor...');
    for (const guild of client.guilds.cache.values()) {
      try {
        const guildCommands = await guild.commands.fetch();
        for (const cmd of guildCommands.values()) {
          try {
            await cmd.delete();
          } catch (error) {
            // skip
          }
        }
      } catch (error) {
        // skip
      }
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('sunucudurumu')
        .setDescription('Sunucu bilgileri'),
      
      new SlashCommandBuilder()
        .setName('logkur')
        .setDescription('Log kanalini olustur'),
      
      new SlashCommandBuilder()
        .setName('owoileode')
        .setDescription('OWO gonder'),
    ];

    await client.application.commands.set(commands);
    console.log('Yeni komutlar eklendi: 3');
    
  } catch (error) {
    console.error('Komut hatasi:', error);
  }
});

// SLASH KOMUT HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

  const { commandName, customId, user } = interaction;

  try {
    // SELECT MENU HANDLER
    if (interaction.isStringSelectMenu() && customId.startsWith('stock_select_')) {
      const selectedStockId = interaction.values[0];
      const stock = getStock();
      const selectedStock = stock[selectedStockId];

      if (!selectedStock) {
        return await interaction.reply({ 
          content: 'Stok bulunamadi!', 
          ephemeral: true 
        });
      }

      // Kullanıcı seçimini kaydet (cache'de)
      if (!client.userStockSelection) client.userStockSelection = {};
      client.userStockSelection[user.id] = selectedStockId;

      const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
      
      const sendButton = new ButtonBuilder()
        .setCustomId('owo_send_' + user.id)
        .setLabel('OWO SEND')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(sendButton);

      const embed = new EmbedBuilder()
        .setColor('#f5576c')
        .setTitle('OWO - Onay')
        .setDescription('Sectiniz: ' + selectedStock.name)
        .addFields(
          { name: 'OWO Kredisi', value: selectedStock.credits.toString(), inline: true },
          { name: 'Uyari', value: 'OWO ile odeme gerceklesecek' }
        );

      await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        ephemeral: true 
      });
    }

    // BUTTON HANDLER - OWO SEND
    else if (interaction.isButton() && customId.startsWith('owo_send_')) {
      const selectedStockId = client.userStockSelection?.[user.id];

      if (!selectedStockId) {
        return await interaction.reply({ 
          content: 'Once stok secin!', 
          ephemeral: true 
        });
      }

      const stock = getStock();
      const selectedStock = stock[selectedStockId];

      if (!selectedStock) {
        return await interaction.reply({ 
          content: 'Stok bulunamadi!', 
          ephemeral: true 
        });
      }

      try {
        const owner = await client.users.fetch(OWNER_ID);

        // Stok içindeki ürünleri al
        const products = Object.entries(stock).filter(([id, item]) => 
          item.type === 'product' && item.name && item.username && item.password
        );

        if (products.length === 0) {
          await owner.send('Hata: Stokta urun yok!').catch(() => null);
          return await interaction.reply({ 
            content: 'Stokta urun yok!', 
            ephemeral: true 
          });
        }

        // Random ürün seç
        const randomProduct = products[Math.floor(Math.random() * products.length)][1];

        // Ownership'e ürün gönder
        const dmEmbed = new EmbedBuilder()
          .setColor('#f5576c')
          .setTitle('OWO ile Odeme Gerceklesti!')
          .setDescription(user.tag + ' OWO attı')
          .addFields(
            { name: 'Urun', value: randomProduct.name },
            { name: 'Hesap Adi', value: randomProduct.username },
            { name: 'Sifre', value: randomProduct.password },
            { name: 'Baglanti', value: randomProduct.link || 'Yok' },
            { name: 'Aciklama', value: randomProduct.description || 'Yok' }
          )
          .setTimestamp();

        await owner.send({ embeds: [dmEmbed] }).catch(() => null);

        // Kullanıcıya bildir
        const confirmEmbed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('Basarili!')
          .setDescription('OWO ile odeme gerceklesti\nDM bakın');

        await interaction.reply({ 
          embeds: [confirmEmbed], 
          ephemeral: true 
        });

        // Seçimi temizle
        delete client.userStockSelection[user.id];

      } catch (error) {
        console.error('OWO gonderme hatasi:', error);
        await interaction.reply({ 
          content: 'Hata olustu', 
          ephemeral: true 
        });
      }
    }

    // SLASH COMMANDS
    else if (interaction.isChatInputCommand()) {
    if (commandName === 'sunucudurumu') {
      const guild = interaction.guild;
      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('Sunucu Durumu: ' + guild.name)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'Adi', value: guild.name, inline: true },
          { name: 'ID', value: guild.id, inline: true },
          { name: 'Uyeler', value: guild.memberCount.toString(), inline: true },
          { name: 'Kanallar', value: guild.channels.cache.size.toString(), inline: true },
          { name: 'Sahibi', value: owner.user.tag, inline: true }
        )
        .setFooter({ text: 'Sunucu Durumu' });

      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'logkur') {
      const guild = interaction.guild;
      const logs = getLogs();

      if (logs[guild.id]) {
        return await interaction.reply({ 
          content: 'Bu sunucuda zaten log kanalı var!', 
          ephemeral: true 
        });
      }

      try {
        const logChannel = await guild.channels.create({
          name: 'loglar',
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
          .setTitle('Log Sistemi Baslatildi')
          .setDescription('Log kanali: ' + logChannel);

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Log kanali hatasi:', error);
        await interaction.reply({ content: 'Hata olustu', ephemeral: true });
      }
    }

    else if (commandName === 'owoileode') {
      const user = interaction.user;
      const stock = getStock();
      const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      // Sadece stock type'ı olan öğeleri al
      const stocks = Object.entries(stock).filter(([id, item]) => item.type === 'stock' || (!item.type && item.credits));
      
      if (stocks.length === 0) {
        return await interaction.reply({ 
          content: 'Stokta urun yok!', 
          ephemeral: true 
        });
      }

      // Select menu oluştur
      const selectOptions = stocks.map(([id, item]) => ({
        label: item.name,
        value: id,
        description: item.credits + ' OWO Kredisi'
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('stock_select_' + user.id)
        .setPlaceholder('Stok secin...')
        .addOptions(selectOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor('#f093fb')
        .setTitle('OWO Sistemi')
        .setDescription('Lutfen bir stok secin');

      await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        ephemeral: true 
      });
    }
    }
  } catch (error) {
    console.error('Interaction hatasi:', error);
    if (interaction.isChatInputCommand()) {
      await interaction.reply({ content: 'Hata olustu', ephemeral: true });
    }
  }
});

// MESAJ EVENT - OWO TESPITI
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const logs = getLogs();
  const logChannelId = logs[message.guildId];

  if (logChannelId && message.guild) {
    const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Mesaj Gonderildi')
        .addFields(
          { name: 'Yazar', value: message.author.tag, inline: true },
          { name: 'Kanal', value: message.channel.toString(), inline: true },
          { name: 'Icerik', value: message.content.substring(0, 100) || '(bos)' }
        )
        .setTimestamp();
      
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }

  // OWO SEND TESPITI
  if (message.content.toLowerCase().includes('owo send')) {
    const sender = message.author;
    const owoUsers = getOWOUsers();
    const stockData = getStock();

    if (!owoUsers[sender.id]) {
      return await message.reply('OWO kredisi yok!');
    }

    if (owoUsers[sender.id].credits <= 0) {
      return await message.reply('Kredileriniz yetersiz!');
    }

    const stockKeys = Object.keys(stockData);
    if (stockKeys.length === 0) {
      return await message.reply('Stokta urun yok!');
    }

    const randomProduct = stockData[stockKeys[Math.floor(Math.random() * stockKeys.length)]];

    try {
      const owner = await client.users.fetch(OWNER_ID);
      const dmEmbed = new EmbedBuilder()
        .setColor('#f5576c')
        .setTitle('OWO Hediyesi')
        .setDescription(sender.tag + ' tarafindan gonderildi')
        .addFields(
          { name: 'Urun', value: randomProduct.name },
          { name: 'Hesap Adi', value: randomProduct.username || 'Belirtilmemis' },
          { name: 'Sifre', value: randomProduct.password || 'Belirtilmemis' },
          { name: 'Baglanti', value: randomProduct.link || 'Baglanfi yok' },
          { name: 'Aciklama', value: randomProduct.description || 'Aciklama yok' }
        )
        .setTimestamp();

      await owner.send({ embeds: [dmEmbed] });

      owoUsers[sender.id].credits--;
      saveOWOUsers(owoUsers);

      await message.reply('OWO gonderildi! Kalan: ' + owoUsers[sender.id].credits);
    } catch (error) {
      console.error('OWO hatasi:', error);
      await message.reply('OWO gonderilenemedi');
    }
  }
});

// MESAJ SILME LOGLAMA
client.on('messageDelete', async (message) => {
  if (!message.guild) return;

  const logs = getLogs();
  const logChannelId = logs[message.guildId];

  if (logChannelId) {
    const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Mesaj Silindi')
        .addFields(
          { name: 'Yazar', value: message.author?.tag || 'Bilinmiyor', inline: true },
          { name: 'Kanal', value: message.channel.toString(), inline: true },
          { name: 'Icerik', value: message.content.substring(0, 100) || '(bos)' }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
  }
});

// MESAJ DUZENLE LOGLAMA
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.guild || oldMessage.content === newMessage.content) return;

  const logs = getLogs();
  const logChannelId = logs[newMessage.guildId];

  if (logChannelId) {
    const logChannel = await newMessage.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('Mesaj Duzenlendi')
        .addFields(
          { name: 'Yazar', value: newMessage.author?.tag, inline: true },
          { name: 'Kanal', value: newMessage.channel.toString(), inline: true },
          { name: 'Eski', value: oldMessage.content.substring(0, 100) || '(bos)' },
          { name: 'Yeni', value: newMessage.content.substring(0, 100) || '(bos)' }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
  }
});

// WEB SERVER
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
      console.error('Kurucu bilgisi hatasi:', error);
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
    console.error('Bot stats API hatasi:', error);
    res.status(500).json({ error: 'Hata' });
  }
});

app.post('/api/stock/add', express.json(), (req, res) => {
  const { id, name, link, image, credits, type, description, username, password } = req.body;

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
    description: description || '',
    username: username || '',
    password: password || ''
  };
  saveStock(stock);

  res.json({ success: true, message: 'Eklendi' });
});

app.get('/api/stock', (req, res) => {
  const stock = getStock();
  res.json(stock);
});

app.listen(PORT, () => {
  console.log('Web server port ' + PORT);
});

client.login(process.env.DISCORD_TOKEN);
