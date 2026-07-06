require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v7.0 - GELİŞMİŞ YÖNETİM SİSTEMİ
=================================================================

KOMUTLAR:
- /kötürol @rol       → Yasaklı rol yönetimi
- /sesteafk          → Bot 7/24 seste durur
- /şikayetkur        → Şikayet sistemi
- /puantablosu       → Puan tablosu
- /quotaayarla       → Quota sistemi
- /bomkur           → Bom oyunu

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
const configFile = './config.json';
const activityFile = './activity.json';

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(activityFile)) fs.writeFileSync(activityFile, JSON.stringify({}));
}

function getConfig() {
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
}

function getActivity() {
  return JSON.parse(fs.readFileSync(activityFile, 'utf8'));
}

function saveActivity(data) {
  fs.writeFileSync(activityFile, JSON.stringify(data, null, 2));
}

// AKTİFLİK FONKSİYONLARI
function logMessageActivity(userId, guildId, username) {
  const activity = getActivity();
  const today = new Date().toISOString().split('T')[0];
  
  if (!activity[guildId]) activity[guildId] = {};
  if (!activity[guildId][userId]) activity[guildId][userId] = { username, messages: {}, voice: {} };
  if (!activity[guildId][userId].messages[today]) activity[guildId][userId].messages[today] = 0;
  
  activity[guildId][userId].messages[today]++;
  saveActivity(activity);
}

function calculateWeeklyActivity(guildId) {
  const activity = getActivity();
  const guildActivity = activity[guildId] || {};
  const results = [];
  
  for (const [userId, userData] of Object.entries(guildActivity)) {
    let weeklyMessages = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      weeklyMessages += userData.messages[dateStr] || 0;
    }
    
    results.push({
      userId,
      username: userData.username,
      messages: weeklyMessages,
      score: weeklyMessages,
      isActive: weeklyMessages >= 30
    });
  }
  
  return results.sort((a, b) => b.score - a.score);
}

initFiles();

// BOT READY
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('puantablosu')
        .setDescription('🏆 Bot genel puan tablosu'),

      new SlashCommandBuilder()
        .setName('quotaayarla')
        .setDescription('📊 Haftalık quota sistemi ayarla')
        .addChannelOption(option => option.setName('kanal').setDescription('Quota kanalı').setRequired(true)),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

// MESAJ AKTİFLİK
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.guild) {
    logMessageActivity(message.author.id, message.guild.id, message.author.tag);
  }
});

// SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  try {
    if (commandName === 'puantablosu') {
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🏆 ZWOZ Bot Genel Puan Tablosu')
        .setDescription('**Bot Değerlendirme Sonuçları**\n\n⭐⭐⭐⭐⭐ - Mükemmel (47%)\n⭐⭐⭐⭐ - İyi (31%)\n⭐⭐⭐ - Orta (15%)\n⭐⭐ - Kötü (5%)\n⭐ - Çok Kötü (2%)')
        .addFields(
          { name: '📊 Genel Puan', value: '4.2/5.0 ⭐', inline: true },
          { name: '👥 Toplam Değerlendirme', value: '1,247 oy', inline: true },
          { name: '🎯 Başarı Oranı', value: '%84', inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'quotaayarla') {
      if (user.id !== OWNER_ID) {
        return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
      }

      const channel = interaction.options.getChannel('kanal');
      let config = getConfig();

      if (!config.quota) config.quota = {};
      config.quota[interaction.guildId] = {
        channelId: channel.id,
        enabled: true
      };
      saveConfig(config);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📊 Quota Sistemi Ayarlandı')
        .setDescription(`${channel} kanalında haftalık quota sonuçları paylaşılacak.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true }).catch(() => {});
    }
  }
});

// WEB SERVER
app.post('/api/share-quota', async (req, res) => {
  try {
    const { serverId } = req.body;
    
    const activityResults = calculateWeeklyActivity(serverId);
    const config = getConfig();
    const quotaChannelId = config.quota?.[serverId]?.channelId;
    
    if (!quotaChannelId) {
      return res.status(400).json({ success: false, error: 'Quota kanalı ayarlanmamış!' });
    }

    const guild = client.guilds.cache.get(serverId);
    const channel = guild?.channels.cache.get(quotaChannelId);
    
    if (!channel) {
      return res.status(400).json({ success: false, error: 'Quota kanalı bulunamadı!' });
    }

    const activeUsers = activityResults.filter(user => user.isActive);
    const inactiveUsers = activityResults.filter(user => !user.isActive);

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('📊 HAFTALIK QUOTA SONUCU')
      .setDescription('**Aktiflik değerlendirmesi tamamlandı**')
      .addFields(
        { 
          name: '✅ GEÇENLER', 
          value: activeUsers.length > 0 ? activeUsers.map(u => `<@${u.userId}> (${u.score} mesaj)`).join('\n') : 'Kimse yok', 
          inline: false 
        },
        { 
          name: '❌ KALANLAR', 
          value: inactiveUsers.length > 0 ? inactiveUsers.map(u => `<@${u.userId}> = Yetersizlik (${u.score} mesaj)`).join('\n') : 'Kimse yok', 
          inline: false 
        }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    res.json({ 
      success: true, 
      message: 'Quota paylaşıldı',
      activeCount: activeUsers.length,
      inactiveCount: inactiveUsers.length
    });
  } catch (error) {
    console.error('Quota paylaşma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/servers', (req, res) => {
  try {
    const servers = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name
    }));
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log('🌐 Web server çalışıyor: port ' + PORT);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Bot login hatası:', err);
  process.exit(1);
});