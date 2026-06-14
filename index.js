require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType, AuditLogEvent } = require('discord.js');
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
    GatewayIntentBits.GuildInvites,
    // GatewayIntentBits.GuildPresences, // ❌ KALDIRILDI: Discord Portal'da aktif değilse hata veriyor
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const OWNER_ID = '1403495996138323989';
const botStartTime = Date.now();

// Her sunucu için log kanalı ID'leri
let logChannels = {}; // { guildId: channelId }

// Log kanallarını yükle
function loadLogChannels() {
  try {
    if (fs.existsSync('log-channels.json')) {
      logChannels = JSON.parse(fs.readFileSync('log-channels.json', 'utf8'));
    }
  } catch (error) {
    console.error('Log kanalları yükleme hatası:', error);
  }
}

// Log kanallarını kaydet
function saveLogChannels() {
  try {
    fs.writeFileSync('log-channels.json', JSON.stringify(logChannels, null, 2));
  } catch (error) {
    console.error('Log kanalları kaydetme hatası:', error);
  }
}

// Bot hazır
client.once('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  console.log(`🎮 ${client.guilds.cache.size} sunucuda aktif`);
  
  loadLogChannels();
  
  // Bot durumunu güncelle
  updateBotStatus();
});

// Bot durumunu güncelle
function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(`${serverCount} sunucuda aktif`, { type: 3 }); // 3 = WATCHING
}

// Yeni sunucuya katıldığında durumu güncelle
client.on('guildCreate', () => {
  updateBotStatus();
  console.log(`✅ Yeni sunucuya katıldı! Toplam: ${client.guilds.cache.size}`);
});

// Sunucudan atıldığında durumu güncelle
client.on('guildDelete', () => {
  updateBotStatus();
  console.log(`❌ Sunucudan atıldı! Toplam: ${client.guilds.cache.size}`);
});

// Log kanalına mesaj gönder
async function sendLog(guild, embed) {
  if (!logChannels[guild.id]) return;
  
  try {
    const channel = await guild.channels.fetch(logChannels[guild.id]);
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Log gönderme hatası:', error);
  }
}

// ========== MESAJ LOGLARI ==========
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setTitle('📝 Yeni Mesaj')
    .setDescription(`**Kanal:** ${message.channel}\n**Mesaj:**\n${message.content || '*Mesaj içeriği yok*'}`)
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${message.author.id}>`, inline: true },
      { name: '📺 Kanal', value: `<#${message.channel.id}>`, inline: true },
      { name: '🆔 Mesaj ID', value: message.id, inline: true }
    )
    .setFooter({ text: `Kullanıcı ID: ${message.author.id}` })
    .setTimestamp();

  await sendLog(message.guild, embed);
});

// Mesaj silindi
client.on('messageDelete', async (message) => {
  if (!message.guild) return;
  if (message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: message.author?.tag || 'Bilinmeyen', iconURL: message.author?.displayAvatarURL() })
    .setTitle('🗑️ Mesaj Silindi')
    .setDescription(`**Kanal:** ${message.channel}\n**Silinen Mesaj:**\n${message.content || '*İçerik alınamadı*'}`)
    .addFields(
      { name: '👤 Kullanıcı', value: message.author ? `<@${message.author.id}>` : 'Bilinmeyen', inline: true },
      { name: '📺 Kanal', value: `<#${message.channel.id}>`, inline: true }
    )
    .setFooter({ text: `Kullanıcı ID: ${message.author?.id || 'Bilinmeyen'}` })
    .setTimestamp();

  await sendLog(message.guild, embed);
});

// Mesaj düzenlendi
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.guild) return;
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
    .setTitle('✏️ Mesaj Düzenlendi')
    .setDescription(`**Kanal:** ${newMessage.channel}`)
    .addFields(
      { name: '📄 Eski Mesaj', value: oldMessage.content || '*İçerik yok*', inline: false },
      { name: '📝 Yeni Mesaj', value: newMessage.content || '*İçerik yok*', inline: false },
      { name: '👤 Kullanıcı', value: `<@${newMessage.author.id}>`, inline: true },
      { name: '📺 Kanal', value: `<#${newMessage.channel.id}>`, inline: true }
    )
    .setFooter({ text: `Kullanıcı ID: ${newMessage.author.id}` })
    .setTimestamp();

  await sendLog(newMessage.guild, embed);
});

// ========== SES LOGLARI ==========
client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member;
  if (!member || member.user.bot) return;

  // Ses kanalına katıldı
  if (!oldState.channel && newState.channel) {
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle('🎙️ Ses Kanalına Katıldı')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${member.id}>`, inline: true },
        { name: '📢 Kanal', value: newState.channel.name, inline: true },
        { name: '🆔 Kanal ID', value: newState.channel.id, inline: true }
      )
      .setFooter({ text: `Kullanıcı ID: ${member.id}` })
      .setTimestamp();

    await sendLog(newState.guild, embed);
  }

  // Ses kanalından ayrıldı
  if (oldState.channel && !newState.channel) {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle('🔇 Ses Kanalından Ayrıldı')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${member.id}>`, inline: true },
        { name: '📢 Kanal', value: oldState.channel.name, inline: true },
        { name: '🆔 Kanal ID', value: oldState.channel.id, inline: true }
      )
      .setFooter({ text: `Kullanıcı ID: ${member.id}` })
      .setTimestamp();

    await sendLog(oldState.guild, embed);
  }

  // Kanal değiştirdi
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle('🔄 Ses Kanalı Değiştirdi')
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${member.id}>`, inline: true },
        { name: '📢 Eski Kanal', value: oldState.channel.name, inline: true },
        { name: '📢 Yeni Kanal', value: newState.channel.name, inline: true }
      )
      .setFooter({ text: `Kullanıcı ID: ${member.id}` })
      .setTimestamp();

    await sendLog(newState.guild, embed);
  }
});

// ========== DAVET LOGLARI ==========
client.on('inviteCreate', async (invite) => {
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setAuthor({ name: invite.inviter?.tag || 'Bilinmeyen', iconURL: invite.inviter?.displayAvatarURL() })
    .setTitle('🔗 Davet Oluşturuldu')
    .addFields(
      { name: '👤 Oluşturan', value: invite.inviter ? `<@${invite.inviter.id}>` : 'Bilinmeyen', inline: true },
      { name: '📺 Kanal', value: `<#${invite.channel.id}>`, inline: true },
      { name: '🔗 Kod', value: invite.code, inline: true },
      { name: '⏰ Süre', value: invite.maxAge ? `${invite.maxAge / 3600} saat` : 'Sınırsız', inline: true },
      { name: '👥 Kullanım', value: invite.maxUses ? `${invite.maxUses} kez` : 'Sınırsız', inline: true }
    )
    .setFooter({ text: `Davet Kodu: ${invite.code}` })
    .setTimestamp();

  await sendLog(invite.guild, embed);
});

// Davet silindi
client.on('inviteDelete', async (invite) => {
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('🗑️ Davet Silindi')
    .addFields(
      { name: '🔗 Kod', value: invite.code, inline: true },
      { name: '📺 Kanal', value: `<#${invite.channel.id}>`, inline: true }
    )
    .setFooter({ text: `Davet Kodu: ${invite.code}` })
    .setTimestamp();

  await sendLog(invite.guild, embed);
});

// ========== KOMUTLAR ==========
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // -logkur [kanal]
  if (command === 'logkur') {
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ Bu komutu sadece bot sahibi kullanabilir!');
    }

    const channel = message.mentions.channels.first() || message.channel;

    logChannels[message.guild.id] = channel.id;
    saveLogChannels();

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Log Sistemi Kuruldu!')
      .setDescription(`Tüm sunucu aktiviteleri ${channel} kanalına kaydedilecek.`)
      .addFields(
        { name: '📊 İzlenecekler', value: '• Mesajlar (gönderim/silme/düzenleme)\n• Ses hareketleri (giriş/çıkış/kanal değiştirme)\n• Davetler (oluşturma/silme)', inline: false }
      )
      .setFooter({ text: 'Log sistemi aktif!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
    console.log(`📊 Log kanalı kuruldu: ${message.guild.name} → #${channel.name}`);
  }

  // -logkapat
  if (command === 'logkapat') {
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ Bu komutu sadece bot sahibi kullanabilir!');
    }

    if (!logChannels[message.guild.id]) {
      return message.reply('⚠️ Bu sunucuda log sistemi kurulu değil!');
    }

    delete logChannels[message.guild.id];
    saveLogChannels();

    message.reply('✅ Log sistemi kapatıldı!');
    console.log(`🛑 Log sistemi kapatıldı: ${message.guild.name}`);
  }
});

// ========== WEB SERVER ==========

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

    // Kurucu bilgilerini al
    let founderData = null;
    try {
      const founder = await client.users.fetch(OWNER_ID);
      
      // Kurucunun durumunu "online" olarak göster (presence olmadan)
      // Discord Portal'da PRESENCE INTENT aktif değilse presence bilgisi alınamaz
      let founderStatus = 'online'; // Varsayılan: online
      
      founderData = {
        username: founder.username,
        tag: founder.tag,
        id: founder.id,
        avatar: founder.displayAvatarURL({ dynamic: true, size: 128 }),
        status: founderStatus
      };
      
      console.log(`✅ Kurucu bilgisi alındı: ${founder.username}`);
    } catch (error) {
      console.error('❌ Kurucu bilgisi alınamadı:', error);
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

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
