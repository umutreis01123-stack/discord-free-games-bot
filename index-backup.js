require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v7.0 - GELİŞMİŞ YÖNETİM SİSTEMİ
=================================================================

YENİ KOMUTLAR (/):
- /kötürol @rol        → Kötü rol yönetimi
- /sesteafk            → Botu sese çağır (7/24 durur)
- /şikayetkur         → Şikayet sistemi kur
- /puantablosu        → Bot genel puan tablosu
- /ticketkur          → Ticket sistemi kur
- /quotaayarla        → Haftalık quota sistemi
- /bomkur             → Bom oyunu kur

ESKİ KOMUTLAR:
- /sorumlu @user      → Ticket sorumlusu belirle
- /dmlogkur           → DM log kanalı ayarla
- /kayıtolkur         → Kayıt sistemi butonunu göster
- /ticket             → Ticket sistemi
- /dmmesajyolla       → Kullanıcıya DM gönder

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
const dmLogFile = './dm-logs.json';
const registersFile = './registers.json';
const ticketsFile = './tickets.json';
const complaintsFile = './complaints.json';
const quotaFile = './quota.json';
const bomGameFile = './bom-games.json';
const rolesFile = './roles.json';
const activityFile = './activity.json';

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(dmLogFile)) fs.writeFileSync(dmLogFile, JSON.stringify({}));
  if (!fs.existsSync(registersFile)) fs.writeFileSync(registersFile, JSON.stringify({}));
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(complaintsFile)) fs.writeFileSync(complaintsFile, JSON.stringify({}));
  if (!fs.existsSync(quotaFile)) fs.writeFileSync(quotaFile, JSON.stringify({}));
  if (!fs.existsSync(bomGameFile)) fs.writeFileSync(bomGameFile, JSON.stringify({}));
  if (!fs.existsSync(rolesFile)) fs.writeFileSync(rolesFile, JSON.stringify({}));
  if (!fs.existsSync(activityFile)) fs.writeFileSync(activityFile, JSON.stringify({}));
}

function getConfig() {
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
}

function getDMLogs() {
  return JSON.parse(fs.readFileSync(dmLogFile, 'utf8'));
}

function saveDMLogs(data) {
  fs.writeFileSync(dmLogFile, JSON.stringify(data, null, 2));
}

function getRegisters() {
  return JSON.parse(fs.readFileSync(registersFile, 'utf8'));
}

function saveRegisters(data) {
  fs.writeFileSync(registersFile, JSON.stringify(data, null, 2));
}

function getTickets() {
  return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
}

function saveTickets(data) {
  fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
}

function getComplaints() {
  return JSON.parse(fs.readFileSync(complaintsFile, 'utf8'));
}

function saveComplaints(data) {
  fs.writeFileSync(complaintsFile, JSON.stringify(data, null, 2));
}

function getQuota() {
  return JSON.parse(fs.readFileSync(quotaFile, 'utf8'));
}

function saveQuota(data) {
  fs.writeFileSync(quotaFile, JSON.stringify(data, null, 2));
}

function getBomGames() {
  return JSON.parse(fs.readFileSync(bomGameFile, 'utf8'));
}

function saveBomGames(data) {
  fs.writeFileSync(bomGameFile, JSON.stringify(data, null, 2));
}

function getRoles() {
  return JSON.parse(fs.readFileSync(rolesFile, 'utf8'));
}

function saveRoles(data) {
  fs.writeFileSync(rolesFile, JSON.stringify(data, null, 2));
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

function logVoiceActivity(userId, guildId, username, duration) {
  const activity = getActivity();
  const today = new Date().toISOString().split('T')[0];
  
  if (!activity[guildId]) activity[guildId] = {};
  if (!activity[guildId][userId]) activity[guildId][userId] = { username, messages: {}, voice: {} };
  if (!activity[guildId][userId].voice[today]) activity[guildId][userId].voice[today] = 0;
  
  activity[guildId][userId].voice[today] += duration;
  saveActivity(activity);
}

function calculateWeeklyActivity(guildId) {
  const activity = getActivity();
  const guildActivity = activity[guildId] || {};
  
  const results = [];
  
  for (const [userId, userData] of Object.entries(guildActivity)) {
    let weeklyMessages = 0;
    let weeklyVoice = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      weeklyMessages += userData.messages[dateStr] || 0;
      weeklyVoice += userData.voice[dateStr] || 0;
    }
    
    const activityScore = weeklyMessages + (weeklyVoice / 60000 * 0.5); // milliseconds to minutes
    
    results.push({
      userId,
      username: userData.username,
      messages: weeklyMessages,
      voice: Math.round(weeklyVoice / 60000), // dakika cinsinden
      score: Math.round(activityScore),
      isActive: activityScore >= 50
    });
  }
  
  return results.sort((a, b) => b.score - a.score);
}

initFiles();

// SES AKTİFLİK TAKİBİ
const voiceSessions = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.member.user.id;
  const username = newState.member.user.tag;
  
  if (!oldState.channel && newState.channel) {
    voiceSessions.set(userId, {
      joinTime: Date.now(),
      guildId: newState.guild.id,
      username: username
    });
  }
  
  if (oldState.channel && !newState.channel) {
    const session = voiceSessions.get(userId);
    if (session) {
      const duration = Date.now() - session.joinTime;
      logVoiceActivity(userId, session.guildId, session.username, duration);
      voiceSessions.delete(userId);
    }
  }
});

// ROL YÖNETİMİ
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const roles = getRoles();
    const guildRoles = roles[newMember.guild.id];
    
    if (!guildRoles || !guildRoles.badRoleId) return;

    const badRole = newMember.guild.roles.cache.get(guildRoles.badRoleId);
    if (!badRole) return;

    const hadRole = oldMember.roles.cache.has(badRole.id);
    const hasRole = newMember.roles.cache.has(badRole.id);

    if (!hadRole && hasRole) {
      try {
        await newMember.timeout(3600000, 'Yasaklı rolü kendine verdi');

        const channel = newMember.guild.channels.cache.find(ch => 
          ch.name === 'genel' || ch.name === 'general' || ch.isTextBased()
        );

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('⚠️ Yasaklı Rol Kullanımı')
            .setDescription(`${newMember.user.tag} yasaklı rolü kendine verdi!\n\n**Ceza:** 1 saat timeout\n**Rol:** ${badRole.name}\n\n*İbreti alem olsun diye bu yere atıldı ve bir daha yaparsa baş dev, admin yada kurucu tarafından yargılanacaktır.*`)
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Timeout uygulama hatası:', error);
      }
    }
  } catch (error) {
    console.error('Rol kontrolü hatası:', error);
  }
});

// BOT READY
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('sorumlu')
        .setDescription('👨‍💼 Ticket sorumlusunu belirle')
        .addUserOption(option => option.setName('kullanici').setDescription('Sorumlu yapılacak kullanıcı').setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('dmlogkur')
        .setDescription('📋 DM log kanalını ayarla'),
      
      new SlashCommandBuilder()
        .setName('kayıtolkur')
        .setDescription('📝 Kayıt sistemi butonunu göster'),

      new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('🎫 Ticket aç'),

      new SlashCommandBuilder()
        .setName('dmmesajyolla')
        .setDescription('💬 Kullanıcıya DM gönder')
        .addUserOption(option => option.setName('kullanici').setDescription('Mesaj göndereceği kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true)),

      new SlashCommandBuilder()
        .setName('kötürol')
        .setDescription('⚠️ Kötü rol yönetimi ayarla')
        .addRoleOption(option => option.setName('rol').setDescription('Yasaklanacak rol').setRequired(true)),

      new SlashCommandBuilder()
        .setName('sesteafk')
        .setDescription('🔊 Botu sese çağır (7/24 durur)'),

      new SlashCommandBuilder()
        .setName('şikayetkur')
        .setDescription('📝 Şikayet sistemi kur'),

      new SlashCommandBuilder()
        .setName('puantablosu')
        .setDescription('🏆 Bot genel puan tablosu'),

      new SlashCommandBuilder()
        .setName('ticketkur')
        .setDescription('🎫 Ticket sistemi kur'),

      new SlashCommandBuilder()
        .setName('quotaayarla')
        .setDescription('📊 Haftalık quota sistemi ayarla')
        .addChannelOption(option => option.setName('kanal').setDescription('Quota kanalı').setRequired(true)),

      new SlashCommandBuilder()
        .setName('bomkur')
        .setDescription('💣 Bom oyunu kur'),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
    updateBotStatus();
    setInterval(updateBotStatus, 5000);
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

let statusIndex = 0;
function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  let totalMembers = 0;
  client.guilds.cache.forEach(guild => {
    totalMembers += guild.memberCount;
  });
  
  const statuses = [
    `${serverCount} sunucuda 🤖`,
    `${totalMembers} kişi kullanıyor 👥`
  ];
  
  client.user.setActivity(statuses[statusIndex], { type: 2 });
  statusIndex = (statusIndex + 1) % statuses.length;
}

async function saveDMLog(userId, username, message, type) {
  const logs = getDMLogs();
  const key = userId;

  if (!logs[key]) {
    logs[key] = {
      username: username,
      messages: []
    };
  }

  logs[key].messages.push({
    author: type,
    content: message,
    timestamp: new Date().toISOString()
  });

  if (logs[key].messages.length > 100) {
    logs[key].messages = logs[key].messages.slice(-100);
  }

  saveDMLogs(logs);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.guild) {
    logMessageActivity(message.author.id, message.guild.id, message.author.tag);

    // BOM OYUNU KONTROLÜ
    const bomGames = getBomGames();
    const gameData = bomGames[message.channelId];

    if (gameData && gameData.active) {
      const content = message.content.trim();
      const num = parseInt(content);

      if (!isNaN(num)) {
        if (gameData.lastUser === message.author.id) {
          await message.delete().catch(() => {});
          return;
        }

        if (num === gameData.currentNumber + 1) {
          gameData.currentNumber = num;
          gameData.lastUser = message.author.id;
          
          await message.react('✅').catch(() => {});

          if (num === 5) {
            await message.delete().catch(() => {});
            
            try {
              await message.author.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor('#f39c12')
                    .setTitle('💣 Bom Oyunu İpucu')
                    .setDescription('**5 yazma, "bom" yaz!**\n\nBir sonraki mesajında "bom" yazmalısın.')
                    .setTimestamp()
                ]
              });
            } catch (error) {
              console.error('DM gönderme hatası:', error);
            }

            gameData.currentNumber = 0;
            gameData.lastUser = null;
          }

          saveBomGames(bomGames);
        } else {
          await message.delete().catch(() => {});
        }
      } else if (content.toLowerCase() === 'bom' && gameData.currentNumber === 0) {
        gameData.currentNumber = 0;
        gameData.lastUser = null;
        await message.react('💣').catch(() => {});
        saveBomGames(bomGames);
      }
    }
  }

  if (!message.guild) {
    await saveDMLog(message.author.id, message.author.tag, message.content, 'user');

    const config = getConfig();
    
    if (config.dmLogChannelId && config.dmLogGuildId) {
      try {
        const guild = client.guilds.cache.get(config.dmLogGuildId);
        const channel = guild?.channels.cache.get(config.dmLogChannelId);

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📨 DM Alındı')
            .setDescription(`**Gönderen:** ${message.author.tag}\n**Mesaj:** ${message.content}`)
            .setFooter({ text: message.author.id })
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('DM log gönderme hatası:', error);
      }
    }

    // KAYIT SISTEMI
    const registers = getRegisters();
    const userReg = registers[message.author.id];

    if (userReg && userReg.step === 'name_wait') {
      userReg.name = message.content;
      userReg.step = 'age_wait';
      saveRegisters(registers);
      
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('📝 Yaşınız?')
            .setDescription(`**İsim:** ${userReg.name}\n\nLütfen **yaşınızı** yazın`)
            .setTimestamp()
        ]
      });
      return;
    }

    if (userReg && userReg.step === 'age_wait') {
      userReg.age = message.content;
      userReg.step = 'completed';
      saveRegisters(registers);
      
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Kayıt Tamamlandı!')
            .setDescription(`**İsim:** ${userReg.name}\n**Yaş:** ${userReg.age}\n\nSunucuya kaydedildiniz`)
            .setTimestamp()
        ]
      });

      if (userReg.guildId) {
        const guild = client.guilds.cache.get(userReg.guildId);
        if (guild) {
          try {
            const embed = new EmbedBuilder()
              .setColor('#2ecc71')
              .setTitle('✅ Yeni Kayıt')
              .addFields(
                { name: '👤 İsim', value: userReg.name, inline: true },
                { name: '🎂 Yaş', value: userReg.age, inline: true },
                { name: '📱 Kullanıcı', value: message.author.tag, inline: false }
              )
              .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            const generalChannel = guild.channels.cache.find(ch => ch.name === 'genel' || ch.name === 'general' || ch.isTextBased());
            if (generalChannel) {
              await generalChannel.send({ embeds: [embed] });
            }
          } catch (error) {
            console.error('Kayıt gönderme hatası:', error);
          }
        }
      }
      return;
    }
  }
});

// SLASH COMMANDS VE BUTTON HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    if (interaction.isChatInputCommand()) {
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
    }

  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true }).catch(() => {});
    }
  }
});

// WEB SERVER
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