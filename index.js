require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v4.0 - MODERASYON & YÖNETİM SİSTEMİ
=================================================================

PREFIX KOMUTLARI (-):
- -kanal kilitle       → Kanalı yazılmaya kapalı yap
- -kanal aç            → Kanalı yazılmaya açık yap
- -kanal resetle       → Tüm mesajları sil
- -mute @user sebep zaman  → Kullanıcıyı sustur
- -uyarı @user mesaj   → Uyarı ver (1-5 arası, 5=oto-mute)
- -i                   → Davet ettiğin kişileri göster
- -botdavet            → Bot davet linki

SLASH KOMUTLARI (/):
- /rolver @user @role  → Rol ver (Sadece Admin)
- /rolal @user @role   → Rol al (Sadece Admin)

WEB PANELİ:
- DM gönderme
- Rol ver/al
- Sohbet logları

=================================================================
*/

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

// JSON FILES
const muteLogFile = './mute-log.json';
const warnLogFile = './warn-log.json';
const chatLogFile = './chat-log.json';

function initFiles() {
  if (!fs.existsSync(muteLogFile)) fs.writeFileSync(muteLogFile, JSON.stringify({}));
  if (!fs.existsSync(warnLogFile)) fs.writeFileSync(warnLogFile, JSON.stringify({}));
  if (!fs.existsSync(chatLogFile)) fs.writeFileSync(chatLogFile, JSON.stringify({}));
}

function getMuteLog() {
  return JSON.parse(fs.readFileSync(muteLogFile, 'utf8'));
}

function saveMuteLog(data) {
  fs.writeFileSync(muteLogFile, JSON.stringify(data, null, 2));
}

function getWarnLog() {
  return JSON.parse(fs.readFileSync(warnLogFile, 'utf8'));
}

function saveWarnLog(data) {
  fs.writeFileSync(warnLogFile, JSON.stringify(data, null, 2));
}

function getChatLog() {
  return JSON.parse(fs.readFileSync(chatLogFile, 'utf8'));
}

function saveChatLog(data) {
  fs.writeFileSync(chatLogFile, JSON.stringify(data, null, 2));
}

initFiles();

// Bot ready
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  console.log('📊 Toplam Sunucu: ' + client.guilds.cache.size);
  updateBotStatus();

  try {
    console.log('⚙️ Slash komutları kurgulanıyor...');

    const allCommands = await client.application.commands.fetch();
    console.log('Mevcut komutlar siliniyor: ' + allCommands.size);
    
    for (const command of allCommands.values()) {
      try {
        await command.delete();
        console.log('❌ Silindi: ' + command.name);
      } catch (error) {
        console.error('Komut silme hatası:', error);
      }
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('rolver')
        .setDescription('➕ Kullanıcıya rol ver')
        .addUserOption(option => option.setName('kullanici').setDescription('Rol verilecek kullanıcı').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('Verilecek rol').setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('rolal')
        .setDescription('➖ Kullanıcıdan rol al')
        .addUserOption(option => option.setName('kullanici').setDescription('Rol alınacak kullanıcı').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('Alınacak rol').setRequired(true)),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(`${serverCount} sunucuda | -yardım`, { type: 2 });
}

client.on('guildCreate', () => {
  updateBotStatus();
  console.log('➕ Yeni sunucu eklendi. Toplam: ' + client.guilds.cache.size);
});

client.on('guildDelete', () => {
  updateBotStatus();
  console.log('➖ Sunucu kaldırıldı. Toplam: ' + client.guilds.cache.size);
});

function isOwner(userId) {
  return userId === OWNER_ID;
}

// MESAJ LOG SISTEMI
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const chatLog = getChatLog();
  const guildId = message.guild?.id || 'DM';
  
  if (!chatLog[guildId]) chatLog[guildId] = [];
  
  chatLog[guildId].push({
    author: message.author.tag,
    authorId: message.author.id,
    content: message.content,
    timestamp: new Date().toISOString(),
    channelId: message.channel?.id || 'DM',
    channelName: message.channel?.name || 'DM',
  });

  if (chatLog[guildId].length > 1000) {
    chatLog[guildId] = chatLog[guildId].slice(-1000);
  }
  
  saveChatLog(chatLog);

  // PREFIX KOMUTLARI
  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // YARDIM KOMUTU
    if (command === 'yardım') {
      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('📚 Bot Komutları')
        .setDescription('ZWOZ Bot Komutları')
        .addFields(
          { name: '🔧 Kanal Komutları', value: '`-kanal kilitle` - Kanalı kilitler\n`-kanal aç` - Kanalı açar\n`-kanal resetle` - Mesajları siler', inline: false },
          { name: '🚫 Moderasyon', value: '`-mute @user sebep zaman` - Kullanıcıyı sustur\n`-uyarı @user mesaj` - Uyarı ver (1-5, 5=mute)', inline: false },
          { name: '👥 Davet', value: '`-i` - Davet ettiklerin\n`-botdavet` - Bot linki', inline: false },
          { name: '👑 Admin (/)', value: '`/rolver @user @role` - Rol ver\n`/rolal @user @role` - Rol al', inline: false }
        )
        .setFooter({ text: 'ZWOZ Bot | v4.0' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    // KANAL KİLİT KOMUTU
    if (command === 'kanal' && args[0] === 'kilitle') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await message.reply('❌ Kanal yönetme yetkisine sahip değilsiniz!');
      }

      try {
        const channel = message.channel;
        await channel.permissionOverwrites.edit(channel.guild.id, {
          SendMessages: false,
        });

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔒 Kanal Kilitlendi')
          .setDescription(`${channel.name} kanalı yazılmaya kapalı`)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Kanal kilitleme hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

    // KANAL AÇ KOMUTU
    else if (command === 'kanal' && args[0] === 'aç') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await message.reply('❌ Kanal yönetme yetkisine sahip değilsiniz!');
      }

      try {
        const channel = message.channel;
        await channel.permissionOverwrites.edit(channel.guild.id, {
          SendMessages: true,
        });

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🔓 Kanal Açıldı')
          .setDescription(`${channel.name} kanalı yazılmaya açık`)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Kanal açma hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

    // KANAL RESETLE KOMUTU
    else if (command === 'kanal' && args[0] === 'resetle') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return await message.reply('❌ Mesaj yönetme yetkisine sahip değilsiniz!');
      }

      try {
        const loadingMsg = await message.reply('⏳ Kanal resetleniyor...');
        const channel = message.channel;
        let totalDeleted = 0;
        let hasMore = true;

        while (hasMore) {
          const messages = await channel.messages.fetch({ limit: 100 });
          
          if (messages.size === 0) {
            hasMore = false;
            break;
          }

          try {
            await channel.bulkDelete(messages, true);
            totalDeleted += messages.size;
          } catch (error) {
            hasMore = false;
            break;
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle('✅ Kanal Resetlendi')
          .setDescription(`${totalDeleted} mesaj silindi`)
          .setTimestamp();

        await loadingMsg.edit({ content: '', embeds: [embed] });
      } catch (error) {
        console.error('Kanal resetleme hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

    // MUTE KOMUTU
    else if (command === 'mute') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await message.reply('❌ Üye susturma yetkisine sahip değilsiniz!');
      }

      const user = message.mentions.users.first();
      const sebep = args.slice(1, -1).join(' ') || 'Belirtilmedi';
      const zaman = args[args.length - 1];

      if (!user) return await message.reply('❌ Kullanıcı etiketleyin!');
      if (!zaman) return await message.reply('❌ Zaman belirtin! (s=saniye, m=dakika, h=saat)');

      try {
        const member = await message.guild.members.fetch(user.id);
        let ms = 0;

        if (zaman.includes('s')) ms = parseInt(zaman) * 1000;
        else if (zaman.includes('m')) ms = parseInt(zaman) * 60 * 1000;
        else if (zaman.includes('h')) ms = parseInt(zaman) * 60 * 60 * 1000;
        else return await message.reply('❌ Zaman formatı: 30s, 5m, 1h');

        await member.timeout(ms, sebep);

        const muteLog = getMuteLog();
        const logKey = `${message.guild.id}_${user.id}`;
        if (!muteLog[logKey]) muteLog[logKey] = [];
        muteLog[logKey].push({
          moderator: message.author.tag,
          reason: sebep,
          timestamp: new Date().toISOString(),
          duration: zaman,
        });
        saveMuteLog(muteLog);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔇 Kullanıcı Susturuldu')
          .setDescription(`${user.tag} ${zaman} için susturuldu`)
          .addFields(
            { name: 'Sebep', value: sebep, inline: true },
            { name: 'Moderatör', value: message.author.tag, inline: true }
          )
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Mute hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

    // UYARI KOMUTU
    else if (command === 'uyarı') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await message.reply('❌ Moderasyon yetkisine sahip değilsiniz!');
      }

      const user = message.mentions.users.first();
      const reason = args.slice(1).join(' ') || 'Belirtilmedi';

      if (!user) return await message.reply('❌ Kullanıcı etiketleyin!');

      try {
        const warnLog = getWarnLog();
        const logKey = `${message.guild.id}_${user.id}`;
        if (!warnLog[logKey]) warnLog[logKey] = [];

        warnLog[logKey].push({
          moderator: message.author.tag,
          reason: reason,
          timestamp: new Date().toISOString(),
        });

        const warnCount = warnLog[logKey].length;
        saveMuteLog(warnLog);

        let responseText = `⚠️ ${user.tag} uyarılandı (${warnCount}/5)`;

        // 5. uyarıda oto-mute
        if (warnCount >= 5) {
          const member = await message.guild.members.fetch(user.id);
          await member.timeout(60 * 60 * 1000, 'Otomatik mute - 5 uyarı');
          responseText += '\n🔇 5 uyarı doldu → 1 saat mute uygulandı!';
        }

        const embed = new EmbedBuilder()
          .setColor(warnCount >= 5 ? '#e74c3c' : '#f39c12')
          .setTitle('⚠️ Uyarı Verildi')
          .setDescription(responseText)
          .addFields(
            { name: 'Sebep', value: reason, inline: true },
            { name: 'Uyarı Sayısı', value: `${warnCount}/5`, inline: true },
            { name: 'Moderatör', value: message.author.tag, inline: true }
          )
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Uyarı hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

    // DAVETLİ KOMUTU
    else if (command === 'i') {
      try {
        const invites = await message.guild.invites.fetch();
        const userInvites = invites.filter(inv => inv.inviter?.id === message.author.id);

        if (userInvites.size === 0) {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('📋 Davetleriniz')
            .setDescription('❌ Henüz davet ettiğiniz biri yok');
          
          return await message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('📋 Davetleriniz')
          .setDescription(`Toplam ${userInvites.size} kişi davet ettiniz`)
          .addFields(
            userInvites.map(inv => ({
              name: `Davetli: ${inv.uses}`,
              value: inv.inviter?.tag || 'Bilinmiyor',
              inline: true
            })).slice(0, 25)
          )
          .setFooter({ text: 'Davet Sistemi' })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Davet hatası:', error);
        await message.reply('❌ Davetleriniz getirilemedi!');
      }
    }

    // BOT DAVET LINKI
    else if (command === 'botdavet') {
      try {
        const botLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('🤖 Bot Davet Linki')
          .setDescription(`[Botu Davet Et](${botLink})`)
          .setFooter({ text: 'Bot Davet' })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Bot davet hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

  } catch (error) {
    console.error('Komut hatası:', error);
  }
});

// SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  try {
    // ROL VER
    if (commandName === 'rolver') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await interaction.reply({ content: '❌ Rol yönetme yetkisine sahip değilsiniz!', ephemeral: true });
      }

      try {
        const targetUser = interaction.options.getUser('kullanici');
        const role = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(targetUser.id);

        if (member.roles.cache.has(role.id)) {
          return await interaction.reply({ content: `❌ ${targetUser.tag} zaten ${role.name} rolüne sahip!`, ephemeral: true });
        }

        await member.roles.add(role);
        
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Rol Verildi')
          .setDescription(`${targetUser.tag} → ${role.name}`)
          .addFields(
            { name: 'Veren', value: user.tag, inline: true },
            { name: 'Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Rol ver hatası:', error);
        await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
      }
    }

    // ROL AL
    else if (commandName === 'rolal') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await interaction.reply({ content: '❌ Rol yönetme yetkisine sahip değilsiniz!', ephemeral: true });
      }

      try {
        const targetUser = interaction.options.getUser('kullanici');
        const role = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(targetUser.id);

        if (!member.roles.cache.has(role.id)) {
          return await interaction.reply({ content: `❌ ${targetUser.tag} ${role.name} rolüne sahip değil!`, ephemeral: true });
        }

        await member.roles.remove(role);
        
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('✅ Rol Alındı')
          .setDescription(`${targetUser.tag} ← ${role.name}`)
          .addFields(
            { name: 'Alan', value: user.tag, inline: true },
            { name: 'Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Rol al hatası:', error);
        await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
      }
    }

  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
      } catch (e) {
        // Already replied
      }
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
      });
    }

    res.json({
      status: 'online',
      servers: client.guilds.cache.size,
      bot: {
        username: client.user.username,
        tag: client.user.tag,
        id: client.user.id,
        avatar: client.user.displayAvatarURL({ dynamic: true, size: 256 })
      }
    });
  } catch (error) {
    console.error('Bot stats API hatası:', error);
    res.status(500).json({ error: 'Hata' });
  }
});

// CHAT LOG API
app.get('/api/chat-logs', (req, res) => {
  try {
    const chatLog = getChatLog();
    res.json(chatLog);
  } catch (error) {
    console.error('Chat log API hatası:', error);
    res.status(500).json({ error: 'Hata' });
  }
});

// WARN LOG API
app.get('/api/warn-logs', (req, res) => {
  try {
    const warnLog = getWarnLog();
    res.json(warnLog);
  } catch (error) {
    console.error('Warn log API hatası:', error);
    res.status(500).json({ error: 'Hata' });
  }
});

// MUTE LOG API
app.get('/api/mute-logs', (req, res) => {
  try {
    const muteLog = getMuteLog();
    res.json(muteLog);
  } catch (error) {
    console.error('Mute log API hatası:', error);
    res.status(500).json({ error: 'Hata' });
  }
});

// DM GÖNDER API
app.post('/api/send-dm', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ success: false, error: 'User ID ve mesaj gerekli' });
    }

    const user = await client.users.fetch(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    await user.send(message);
    res.json({ success: true, message: 'Mesaj gönderildi' });
  } catch (error) {
    console.error('DM gönderme hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROL YÖNETİMİ API
app.post('/api/manage-role', async (req, res) => {
  try {
    const { guildId, userId, roleId, action } = req.body;

    if (!guildId || !userId || !roleId || !action) {
      return res.status(400).json({ success: false, error: 'Tüm alanlar gerekli' });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, error: 'Sunucu bulunamadı' });
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return res.status(404).json({ success: false, error: 'Rol bulunamadı' });
    }

    if (action === 'give') {
      await member.roles.add(role);
    } else if (action === 'remove') {
      await member.roles.remove(role);
    }

    res.json({ success: true, message: 'İşlem başarılı' });
  } catch (error) {
    console.error('Rol yönetimi hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server error handling
const server = app.listen(PORT, () => {
  console.log('🌐 Web server çalışıyor: port ' + PORT);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} zaten kullanımda!`);
    process.exit(1);
  } else {
    console.error('Server hatası:', err);
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Bot login hatası:', err);
  process.exit(1);
});
