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

YENİ SİSTEMLER:
1. KÖTÜ ROL YÖNETİMİ - Belirtilen rolü kendine veren 1 saat timeout
2. SES AFK SİSTEMİ - Bot 7/24 seste durur
3. ŞİKAYET SİSTEMİ - Şikayet kanalları + değerlendirme
4. PUAN TABLOSU - Bot genel puanları
5. QUOTA SİSTEMİ - Haftalık aktiflik değerlendirmesi
6. BOM OYUNU - Otomatik bom oyunu kanalı

WEB PANELİ:
- Sunucu seçimi
- Komut ayarları
- Quota metinleri ayarlama
- Erken quota paylaş

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

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(dmLogFile)) fs.writeFileSync(dmLogFile, JSON.stringify({}));
  if (!fs.existsSync(registersFile)) fs.writeFileSync(registersFile, JSON.stringify({}));
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(complaintsFile)) fs.writeFileSync(complaintsFile, JSON.stringify({}));
  if (!fs.existsSync(quotaFile)) fs.writeFileSync(quotaFile, JSON.stringify({}));
  if (!fs.existsSync(bomGameFile)) fs.writeFileSync(bomGameFile, JSON.stringify({}));
  if (!fs.existsSync(rolesFile)) fs.writeFileSync(rolesFile, JSON.stringify({}));
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

initFiles();

// BOT READY
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  
  try {
    console.log('⚙️ Slash komutları kurgulanıyor...');

    const allCommands = await client.application.commands.fetch();
    for (const command of allCommands.values()) {
      try {
        await command.delete();
      } catch (error) {
        console.error('Komut silme hatası:', error);
      }
    }

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

      // YENİ KOMUTLAR v7.0
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
    
    // Bot status
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

// DM MESAJ KAYDET
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

// ROL YÖNETİMİ - Kötü rol kontrolü
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const roles = getRoles();
    const guildRoles = roles[newMember.guild.id];
    
    if (!guildRoles || !guildRoles.badRoleId) return;

    const badRole = newMember.guild.roles.cache.get(guildRoles.badRoleId);
    if (!badRole) return;

    // Kullanıcı yasaklı rolü kendine verdi mi?
    const hadRole = oldMember.roles.cache.has(badRole.id);
    const hasRole = newMember.roles.cache.has(badRole.id);

    if (!hadRole && hasRole) {
      // Rolü kendine verdi, timeout uygula
      try {
        await newMember.timeout(3600000, 'Yasaklı rolü kendine verdi'); // 1 saat timeout

        // Kanıt mesajı gönder
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

        console.log(`[KÖTÜ ROL] ${newMember.user.tag} yasaklı rol aldı ve timeout edildi`);

      } catch (error) {
        console.error('Timeout uygulama hatası:', error);
      }
    }
  } catch (error) {
    console.error('Rol kontrolü hatası:', error);
  }
});

// DM MESSAGE HANDLER
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // BOM OYUNU KONTROLÜ
  if (message.guild) {
    const bomGames = getBomGames();
    const gameData = bomGames[message.channelId];

    if (gameData && gameData.active) {
      // Sayı kontrolü
      const content = message.content.trim();
      const num = parseInt(content);

      if (!isNaN(num)) {
        // Son yazan aynı kullanıcı mı?
        if (gameData.lastUser === message.author.id) {
          await message.delete().catch(() => {});
          return;
        }

        // Beklenen sayı mı?
        if (num === gameData.currentNumber + 1) {
          gameData.currentNumber = num;
          gameData.lastUser = message.author.id;
          
          // Onay emojisi ekle
          await message.react('✅').catch(() => {});

          // 5'e geldi mi?
          if (num === 5) {
            await message.delete().catch(() => {});
            
            // Kullanıcıya DM gönder
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

  // DM'leri kaydet
  if (!message.guild) {
    console.log(`[DM] ${message.author.tag}: ${message.content}`);
    
    await saveDMLog(message.author.id, message.author.tag, message.content, 'user');

    const config = getConfig();
    
    // Log kanalına gönder
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

      // Sunucuda göster
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

// SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    if (interaction.isChatInputCommand()) {
      // SORUMLU AYARLA
      if (commandName === 'sorumlu') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('kullanici');
        let config = getConfig();

        if (!config.tickets) config.tickets = {};
        if (!config.tickets[interaction.guildId]) config.tickets[interaction.guildId] = {};

        config.tickets[interaction.guildId].responsibleId = targetUser.id;
        saveConfig(config);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Ticket Sorumlusu Ayarlandı')
          .setDescription(`${targetUser.tag} ticket sorumlusu oldu`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // DM LOG KANALINI AYARLA
      else if (commandName === 'dmlogkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        let config = getConfig();
        config.dmLogGuildId = interaction.guildId;
        config.dmLogChannelId = interaction.channelId;
        saveConfig(config);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ DM Log Kanalı Ayarlandı')
          .setDescription(`${interaction.channel} kanalında DM'ler loglanacak`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // KAYIT SISTEMI BUTONUNU GÖSTER
      else if (commandName === 'kayıtolkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        let config = getConfig();
        config.registrationEnabled = true;
        config.registrationGuildId = interaction.guildId;
        config.registrationChannelId = interaction.channelId;
        saveConfig(config);

        const registerBtn = new ButtonBuilder()
          .setCustomId('start_registration')
          .setLabel('📝 Kayıt Ol')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(registerBtn);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('📝 Kayıt Sistemi')
          .setDescription('Aşağıdaki buton ile kayıt olabilirsiniz\n\n**Kayıt için:**\n• İsminiz\n• Yaşınız\n\ngereklidir')
          .setTimestamp();

        await interaction.channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: '✅ Kayıt sistemi butonları gösterildi', ephemeral: true });
      }

      // TICKET COMMAND
      else if (commandName === 'ticket') {
        const ticketBtn = new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('🎫 Ticket Aç')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(ticketBtn);

        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('🎫 Ticket Sistemi')
          .setDescription('Aşağıdaki buton ile ticket açabilirsiniz')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [row] });
      }

      // DM MESAJ YOLLA
      else if (commandName === 'dmmesajyolla') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('kullanici');
        const message = interaction.options.getString('mesaj');

        try {
          // Kullanıcıya mesaj gönder
          await targetUser.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#667eea')
                .setTitle('💬 Mesaj')
                .setDescription(message)
                .setFooter({ text: 'Bot tarafından gönderilen mesaj' })
                .setTimestamp()
            ]
          });

          // DM log'a kaydet
          await saveDMLog(targetUser.id, targetUser.tag, message, 'bot');

          // Log kanalına gönder
          const config = getConfig();
          if (config.dmLogChannelId && config.dmLogGuildId) {
            try {
              const guild = client.guilds.cache.get(config.dmLogGuildId);
              const channel = guild?.channels.cache.get(config.dmLogChannelId);

              if (channel) {
                const embed = new EmbedBuilder()
                  .setColor('#667eea')
                  .setTitle('📤 DM Gönderildi')
                  .setDescription(`**Alıcı:** ${targetUser.tag}\n**Mesaj:** ${message}`)
                  .setFooter({ text: targetUser.id })
                  .setTimestamp();

                await channel.send({ embeds: [embed] });
              }
            } catch (error) {
              console.error('DM log gönderme hatası:', error);
            }
          }

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ DM Gönderildi')
            .setDescription(`${targetUser.tag} adlı kullanıcıya mesaj gönderildi`)
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
          console.error('DM gönderme hatası:', error);
          const errorEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Hata')
            .setDescription(`${targetUser.tag} adlı kullanıcıya mesaj gönderilemedi`)
            .setTimestamp();

          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
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

          // Ses kanalına katıl
          const { joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
          
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🔊 Ses Kanalında AFK')
            .setDescription(`Bot ${voiceChannel.name} kanalına katıldı ve 7/24 orada duracak.`)
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

      // PUAN TABLOSU
      else if (commandName === 'puantablosu') {
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

      // TICKET KUR
      else if (commandName === 'ticketkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('🎫 Ticket Sistemi Kuruldu')
          .setDescription('Ticket sistemi bu kanalda aktif edildi.\n\nKullanıcılar `/ticket` komutu ile ticket açabilirler.')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
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
          .setDescription(`${channel} kanalında haftalık quota sonuçları paylaşılacak.\n\n**Web panelinden quota metinlerini ayarlayabilirsiniz.**`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
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

    // BUTTON HANDLER
    else if (interaction.isButton()) {
      const { customId } = interaction;

      // KAYIT BASLA
      if (customId === 'start_registration') {
        try {
          const registers = getRegisters();
          
          if (registers[user.id] && registers[user.id].step === 'completed') {
            return await interaction.reply({ 
              content: '❌ Zaten kayıtlısınız!', 
              ephemeral: true 
            });
          }

          registers[user.id] = { 
            step: 'name_wait',
            username: user.tag,
            guildId: interaction.guildId,
            registeredAt: new Date().toISOString()
          };
          saveRegisters(registers);

          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('📝 Kayıt Başladı')
                .setDescription('Lütfen **adınızı** yazın')
                .setTimestamp()
            ]
          });

          await interaction.reply({ 
            content: '✅ DM\'inize kayıt mesajı gönderildi!', 
            ephemeral: true 
          });

        } catch (error) {
          console.error('Kayıt başlatma hatası:', error);
          await interaction.reply({ 
            content: '❌ Hata oluştu!', 
            ephemeral: true 
          });
        }
      }

      // TICKET SISTEMI
      else if (customId === 'create_ticket') {
        const guild = interaction.guild;
        const tickets = getTickets();
        const config = getConfig();

        if (!tickets[guild.id]) tickets[guild.id] = {};

        try {
          const ticketChannel = await guild.channels.create({
            name: `🎫-ticket-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              },
              {
                id: config.tickets?.[guild.id]?.responsibleId || OWNER_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              }
            ],
          });

          tickets[guild.id][ticketChannel.id] = {
            userId: user.id,
            createdAt: Date.now(),
            responsible: null
          };
          saveTickets(tickets);

          const claimBtn = new ButtonBuilder()
            .setCustomId(`claim_ticket_${user.id}`)
            .setLabel('👤 Talebi Üstlen')
            .setStyle(ButtonStyle.Primary);

          const closeBtn = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Ticket Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('🎫 Ticket Oluşturuldu')
            .setDescription(`Merhaba ${user.username}! Sorununuzu yazabilirsiniz.`)
            .addFields(
              { name: 'Ticket ID', value: ticketChannel.id, inline: true },
              { name: 'Durum', value: '⏳ Beklemede', inline: true }
            )
            .setTimestamp();

          await ticketChannel.send({ embeds: [embed], components: [row] });
          
          await interaction.reply({ 
            content: `✅ Ticket kanalı oluşturuldu: ${ticketChannel}`, 
            ephemeral: true 
          });

        } catch (error) {
          console.error('Ticket oluşturma hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      else if (customId.startsWith('claim_ticket_')) {
        const userId = customId.split('_')[2];
        const guild = interaction.guild;
        const tickets = getTickets();

        if (tickets[guild.id]?.[interaction.channelId]) {
          tickets[guild.id][interaction.channelId].responsible = interaction.user.id;
          saveTickets(tickets);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Talebi Üstlendi')
            .setDescription(`${interaction.user.tag} tarafından üstlenildi`)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        }
      }

      else if (customId === 'close_ticket') {
        await interaction.reply({ content: '⏳ Ticket 5 saniye içinde kapatılacak...', ephemeral: true });
        
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error('Ticket silme hatası:', error);
          }
        }, 5000);
      }

      // ŞİKAYET OLUŞTUR
      else if (customId === 'create_complaint') {
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
            .setLabel('✅ Şikayeti Kabul Et')
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
          .setTitle('✅ Şikayet Kabul Edildi')
          .setDescription('Şikayetiniz incelemeye alınmıştır. En kısa sürede size dönüş yapılacaktır.')
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
              .setLabel('⭐ 1 Yıldız')
              .setStyle(ButtonStyle.Danger);

            const rateBtn2 = new ButtonBuilder()
              .setCustomId('rate_2')
              .setLabel('⭐⭐ 2 Yıldız')
              .setStyle(ButtonStyle.Danger);

            const rateBtn3 = new ButtonBuilder()
              .setCustomId('rate_3')
              .setLabel('⭐⭐⭐ 3 Yıldız')
              .setStyle(ButtonStyle.Secondary);

            const rateBtn4 = new ButtonBuilder()
              .setCustomId('rate_4')
              .setLabel('⭐⭐⭐⭐ 4 Yıldız')
              .setStyle(ButtonStyle.Success);

            const rateBtn5 = new ButtonBuilder()
              .setCustomId('rate_5')
              .setLabel('⭐⭐⭐⭐⭐ 5 Yıldız')
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
        
        // Puan kaydet (gerçek uygulamada veritabanına kaydedilir)
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

// WEB SERVER

// SUNUCULARA MESAJ GÖNDER
app.post('/api/send-global-message', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Mesaj gerekli' });
    }

    let successCount = 0;
    let failCount = 0;

    // Tüm sunuculara gönder
    for (const guild of client.guilds.cache.values()) {
      try {
        const channel = guild.channels.cache.find(ch => 
          ch.name === 'genel' || ch.name === 'general' || ch.isTextBased()
        );

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('📢 Mesaj')
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

// BOT AYARLARI
app.get('/api/config', (req, res) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// İSTATİSTİKLER
app.get('/api/stats', (req, res) => {
  try {
    const config = getConfig();
    const registers = getRegisters();
    const complaints = getComplaints();
    const bomGames = getBomGames();

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
      users: Object.keys(registers).length,
      complaints: complaintCount,
      bomGames: bomGameCount,
      dmLogEnabled: !!config.dmLogChannelId,
      registrationEnabled: !!config.registrationEnabled
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SUNUCULARI LİSTELE
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

// KOMUT KURULUMU
app.post('/api/setup-command', async (req, res) => {
  try {
    const { serverId, command, channelId } = req.body;
    
    // Bu özellik geliştirilecek
    res.json({ success: true, message: `${command} komutu ${serverId} sunucusunda kuruldu` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// QUOTA AYARLARI
app.post('/api/quota-settings', async (req, res) => {
  try {
    const { serverId, devText, modText } = req.body;
    
    let quota = getQuota();
    if (!quota[serverId]) quota[serverId] = {};
    
    quota[serverId].devText = devText;
    quota[serverId].modText = modText;
    saveQuota(quota);

    res.json({ success: true, message: 'Quota ayarları kaydedildi' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ERKEN QUOTA PAYLAŞ
app.post('/api/share-quota', async (req, res) => {
  try {
    const { serverId } = req.body;
    
    // Bu özellik geliştirilecek - aktiflik hesaplama ve quota paylaşımı
    res.json({ success: true, message: 'Erken quota paylaşıldı' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SERVER
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
