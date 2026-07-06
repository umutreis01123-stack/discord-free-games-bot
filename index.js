require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v6.1 - TICKET & DM LOG & KAYIT SİSTEMİ
=================================================================

KOMUTLAR (/):
- /sorumlu @user     → Ticket sorumlusu belirle
- /dmlogkur          → DM log kanalı ayarla
- /kayıtolkur        → Kayıt sistemi butonunu göster
- /ticket            → Ticket sistemi

TİCKET SİSTEMİ:
1. Talep Üstlen → Sorumlu atanır
2. Ticket Kapat → Kanal 5s sonra silinir

DM LOG SİSTEMİ:
- Bot DM alırsa → Log kanalına kaydedilir

KAYIT SİSTEMİ:
- /kayıtolkur ile buton gösterilir
- Butona tıkla → DM'de isim sorusu
- İsim + Yaş girişi
- Sunucuda isim & yaş gösterilir

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

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(dmLogFile)) fs.writeFileSync(dmLogFile, JSON.stringify({}));
  if (!fs.existsSync(registersFile)) fs.writeFileSync(registersFile, JSON.stringify({}));
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
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

// DM MESSAGE HANDLER
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

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

    res.json({
      servers: client.guilds.cache.size,
      users: Object.keys(registers).length,
      dmLogEnabled: !!config.dmLogChannelId,
      registrationEnabled: !!config.registrationEnabled
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
