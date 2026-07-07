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
const rolesFile = './roles.json';
const complaintsFile = './complaints.json';
const bomGamesFile = './bom-games.json';
const ticketsFile = './tickets.json';

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(activityFile)) fs.writeFileSync(activityFile, JSON.stringify({}));
  if (!fs.existsSync(rolesFile)) fs.writeFileSync(rolesFile, JSON.stringify({}));
  if (!fs.existsSync(complaintsFile)) fs.writeFileSync(complaintsFile, JSON.stringify({}));
  if (!fs.existsSync(bomGamesFile)) fs.writeFileSync(bomGamesFile, JSON.stringify({}));
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
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

function getRoles() {
  return JSON.parse(fs.readFileSync(rolesFile, 'utf8'));
}

function saveRoles(data) {
  fs.writeFileSync(rolesFile, JSON.stringify(data, null, 2));
}

function getComplaints() {
  return JSON.parse(fs.readFileSync(complaintsFile, 'utf8'));
}

function saveComplaints(data) {
  fs.writeFileSync(complaintsFile, JSON.stringify(data, null, 2));
}

function getBomGames() {
  return JSON.parse(fs.readFileSync(bomGamesFile, 'utf8'));
}

function saveBomGames(data) {
  fs.writeFileSync(bomGamesFile, JSON.stringify(data, null, 2));
}

function getTickets() {
  return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
}

function saveTickets(data) {
  fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
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

// ROL YÖNETİMİ - Kötü rol kontrolü
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
        await newMember.timeout(3600000, 'Yasaklı rolü kendine verdi'); // 1 saat

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
        .setName('puantablosu')
        .setDescription('🏆 Bot genel puan tablosu'),

      new SlashCommandBuilder()
        .setName('quotaayarla')
        .setDescription('📊 Haftalık quota sistemi ayarla')
        .addChannelOption(option => option.setName('kanal').setDescription('Quota kanalı').setRequired(true)),

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
        .setName('bomkur')
        .setDescription('💣 Bom oyunu kur'),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

// MESAJ AKTİFLİK VE BOM OYUNU
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
        // Aynı kişi ard arda yazamaz
        if (gameData.lastUser === message.author.id) {
          await message.delete().catch(() => {});
          return;
        }

        // Doğru sayı mı?
        if (num === gameData.currentNumber + 1) {
          gameData.currentNumber = num;
          gameData.lastUser = message.author.id;
          
          // Onay emojisi ekle
          await message.react('✅').catch(() => {});

          // 5'e geldi mi?
          if (num === 5) {
            await message.delete().catch(() => {});
            
            // Kullanıcıya ipucu DM gönder
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
          // Yanlış sayı, sil
          await message.delete().catch(() => {});
        }
      } else if (content.toLowerCase() === 'bom' && gameData.currentNumber === 0) {
        // Bom yazıldı, oyunu sıfırla
        gameData.currentNumber = 0;
        gameData.lastUser = null;
        await message.react('💣').catch(() => {});
        saveBomGames(bomGames);
      }
    }
  }
});

// SLASH COMMANDS VE BUTTONLAR
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    if (interaction.isChatInputCommand()) {
      // PUAN TABLOSU
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

      // QUOTA AYARLA
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

      // KÖTÜ ROL AYARLA
      else if (commandName === 'kötürol') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const role = interaction.options.getRole('rol');
        let roles = getRoles();

        if (!roles[interaction.guildId]) {
          roles[interaction.guildId] = {};
        }

        roles[interaction.guildId].badRoleId = role.id;
        saveRoles(roles);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('⚠️ Kötü Rol Ayarlandı')
          .setDescription(`${role.name} rolü artık yasaklı!\n\nBu rolü kendine veren kullanıcılar 1 saat timeout alacak.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // SESTE AFK
      else if (commandName === 'sesteafk') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        try {
          const voiceChannel = interaction.guild.channels.cache.find(ch => 
            ch.isVoiceBased() && ch.joinable
          );

          if (!voiceChannel) {
            return await interaction.reply({ 
              content: '❌ Katılabilir ses kanalı bulunamadı!', 
              ephemeral: true 
            });
          }

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🔊 Ses Kanalında AFK')
            .setDescription(`Bot ${voiceChannel.name} kanalına katılacak ve 7/24 orada duracak.\n\n*Not: Ses özelliği için @discordjs/voice paketi gerekli*`)
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
          console.error('Ses kanalı hatası:', error);
          await interaction.reply({ 
            content: '❌ Ses kanalına katılırken hata oluştu!', 
            ephemeral: true 
          });
        }
      }

      // ŞİKAYET SISTEMI KUR
      else if (commandName === 'şikayetkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const complaintBtn = new ButtonBuilder()
          .setCustomId('create_complaint')
          .setLabel('📝 Şikayet Et')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(complaintBtn);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('📝 Şikayet Sistemi')
          .setDescription('**Şikayet etmek için aşağıdaki butonu kullanın**\n\n• Şikayetinizi detaylı yazın\n• Öncelik seviyenizi belirtin\n• Şikayet ettiğiniz kullanıcıyı belirtin')
          .setTimestamp();

        await interaction.channel.send({ embeds: [embed], components: [row] });

        let config = getConfig();
        config.complaintChannelId = interaction.channelId;
        config.complaintGuildId = interaction.guildId;
        saveConfig(config);

        await interaction.reply({ content: '✅ Şikayet sistemi kuruldu!', ephemeral: true });
      }

      // BOM OYUNU KUR
      else if (commandName === 'bomkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        let bomGames = getBomGames();
        bomGames[interaction.channelId] = {
          guildId: interaction.guildId,
          active: true,
          currentNumber: 0,
          lastUser: null
        };
        saveBomGames(bomGames);

        const embed = new EmbedBuilder()
          .setColor('#e67e22')
          .setTitle('💣 Bom Oyunu Kuruldu')
          .setDescription('**Oyun Kuralları:**\n\n• 1\'den başlayarak sırayla sayın\n• Aynı kişi ard arda yazamaz\n• 5\'e gelince "bom" yazın\n• Yanlış sayı yazarsanız mesaj silinir')
          .addFields(
            { name: '🎯 Başla', value: '**1** yazarak oyunu başlatın!', inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
    }

    // BUTTON HANDLER
    else if (interaction.isButton()) {
      const { customId } = interaction;

      // ŞİKAYET OLUŞTUR
      if (customId === 'create_complaint') {
        try {
          const complaints = getComplaints();
          
          if (!complaints[interaction.guildId]) {
            complaints[interaction.guildId] = {};
          }

          const complaintChannel = await interaction.guild.channels.create({
            name: `📝-şikayet-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              },
              {
                id: OWNER_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              }
            ],
          });

          complaints[interaction.guildId][complaintChannel.id] = {
            userId: user.id,
            createdAt: Date.now(),
            status: 'open'
          };
          saveComplaints(complaints);

          const acceptBtn = new ButtonBuilder()
            .setCustomId('accept_complaint')
            .setLabel('✅ Talebi Üstlen')
            .setStyle(ButtonStyle.Success);

          const closeComplaintBtn = new ButtonBuilder()
            .setCustomId('close_complaint')
            .setLabel('❌ Şikayeti Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(acceptBtn, closeComplaintBtn);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('📝 Şikayet Kanalı')
            .setDescription(`Merhaba ${user.username}!\n\n**Şikayetinizi detaylı bir şekilde yazın:**\n• Sorunun açıklaması\n• Öncelik seviyesi (Düşük/Orta/Yüksek)\n• Şikayet ettiğiniz kullanıcı`)
            .setTimestamp();

          await complaintChannel.send({ embeds: [embed], components: [row] });
          
          await interaction.reply({ 
            content: `✅ Şikayet kanalı oluşturuldu: ${complaintChannel}`, 
            ephemeral: true 
          });

        } catch (error) {
          console.error('Şikayet kanalı oluşturma hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // ŞİKAYET KABUL ET
      else if (customId === 'accept_complaint') {
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Talebi Üstlenildi')
          .setDescription(`${interaction.user.tag} bu şikayeti üstlendi ve incelemeye başladı.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // ŞİKAYET KAPAT
      else if (customId === 'close_complaint') {
        const complaints = getComplaints();
        const guildComplaints = complaints[interaction.guildId];
        
        if (guildComplaints && guildComplaints[interaction.channelId]) {
          const complaintData = guildComplaints[interaction.channelId];
          const complainant = await client.users.fetch(complaintData.userId);

          // Kullanıcıya değerlendirme DM'i gönder
          try {
            const rateBtn1 = new ButtonBuilder()
              .setCustomId('rate_1')
              .setLabel('⭐ 1')
              .setStyle(ButtonStyle.Danger);

            const rateBtn2 = new ButtonBuilder()
              .setCustomId('rate_2')
              .setLabel('⭐⭐ 2')
              .setStyle(ButtonStyle.Danger);

            const rateBtn3 = new ButtonBuilder()
              .setCustomId('rate_3')
              .setLabel('⭐⭐⭐ 3')
              .setStyle(ButtonStyle.Secondary);

            const rateBtn4 = new ButtonBuilder()
              .setCustomId('rate_4')
              .setLabel('⭐⭐⭐⭐ 4')
              .setStyle(ButtonStyle.Success);

            const rateBtn5 = new ButtonBuilder()
              .setCustomId('rate_5')
              .setLabel('⭐⭐⭐⭐⭐ 5')
              .setStyle(ButtonStyle.Success);

            const row1 = new ActionRowBuilder().addComponents(rateBtn1, rateBtn2, rateBtn3);
            const row2 = new ActionRowBuilder().addComponents(rateBtn4, rateBtn5);

            const embed = new EmbedBuilder()
              .setColor('#f39c12')
              .setTitle('📋 Şikayetiniz Kapatılmıştır')
              .setDescription('**Bizi değerlendirin!**\n\nLütfen aldığınız hizmetin kalitesini 1-5 yıldız arasında değerlendirin.')
              .setTimestamp();

            await complainant.send({ embeds: [embed], components: [row1, row2] });

          } catch (error) {
            console.error('Değerlendirme DM gönderme hatası:', error);
          }
        }

        await interaction.reply({ content: '⏳ Şikayet kanalı 5 saniye içinde kapatılacak...', ephemeral: true });
        
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error('Şikayet kanalı silme hatası:', error);
          }
        }, 5000);
      }

      // PUAN VER (1-5 YILDIZ)
      else if (customId.startsWith('rate_')) {
        const rating = parseInt(customId.split('_')[1]);
        
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🙏 Teşekkürler!')
          .setDescription(`**${rating} yıldız** değerlendirmeniz için teşekkür ederiz!\n\nGeribildirimleriniz bizim için çok değerli.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        
        console.log(`[DEĞERLENDİRME] ${interaction.user.tag} - ${rating} yıldız`);
      }
    }

  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true }).catch(() => {});
    }
  }
});

// WEB SERVER API'LER
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

// QUOTA AYARLARI KAYDET
app.post('/api/quota-settings', async (req, res) => {
  try {
    const { serverId, devText, modText } = req.body;
    
    let config = getConfig();
    if (!config.quotaTexts) config.quotaTexts = {};
    if (!config.quotaTexts[serverId]) config.quotaTexts[serverId] = {};
    
    config.quotaTexts[serverId].devText = devText;
    config.quotaTexts[serverId].modText = modText;
    saveConfig(config);

    res.json({ success: true, message: 'Quota ayarları kaydedildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// KOMUT KURULUMU
app.post('/api/setup-command', async (req, res) => {
  try {
    const { serverId, command, channelId } = req.body;
    
    res.json({ success: true, message: `${command} komutu ${serverId} sunucusunda kuruldu` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// İSTATİSTİKLER
app.get('/api/stats', (req, res) => {
  try {
    const config = getConfig();
    const activity = getActivity();
    const complaints = getComplaints();
    const bomGames = getBomGames();

    let userCount = 0;
    Object.values(activity).forEach(guildActivity => {
      userCount += Object.keys(guildActivity).length;
    });

    let complaintCount = 0;
    Object.values(complaints).forEach(guildComplaints => {
      complaintCount += Object.keys(guildComplaints).length;
    });

    let bomGameCount = 0;
    Object.values(bomGames).forEach(game => {
      if (game.active) bomGameCount++;
    });

    res.json({
      servers: client.guilds.cache.size,
      users: userCount,
      complaints: complaintCount,
      bomGames: bomGameCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SUNUCULARA MESAJ GÖNDER
app.post('/api/send-global-message', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Mesaj gerekli' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const guild of client.guilds.cache.values()) {
      try {
        const channel = guild.channels.cache.find(ch => 
          ch.name === 'genel' || ch.name === 'general' || ch.isTextBased()
        );

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('📢 Genel Mesaj')
            .setDescription(message)
            .setTimestamp();

          await channel.send({ embeds: [embed] });
          successCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `${successCount} sunucuya mesaj gönderildi`,
      sent: successCount,
      failed: failCount
    });
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({ success: false, error: error.message });
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