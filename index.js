require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v4.0 - MODERASYON & YÖNETİM + TİCKET/DESTEK
=================================================================

PREFIX KOMUTLARI (-):
- -kanal kilitle       → Kanalı yazılmaya kapalı yap
- -kanal aç            → Kanalı yazılmaya açık yap
- -kanal resetle       → Tüm mesajları sil
- -mute @user sebep zaman  → Kullanıcıyı sustur
- -uyarı @user mesaj   → Uyarı ver (1-5 arası, 5=oto-mute)
- -i                   → Davet ettiğin kişileri göster
- -botdavet            → Bot davet linki
- -yardım              → Tüm komutları göster

SLASH KOMUTLARI (/):
- /ticket              → Ticket sistemi
- /destek              → Destek sistemi
- /rolver @user @role  → Rol ver (Admin gerekli)
- /rolal @user @role   → Rol al (Admin gerekli)

TİCKET/DESTEK AKIŞI:
1. /ticket veya /destek komutu → Buton göster
2. Butona tıkla → Kanal oluştur
3. Talebi Üstlen → Tarafından üstlenildi göster
4. Kapat → Kanali 5 sn sonra sil

WEB PANELİ:
- DM gönderme
- Rol ver/al
- Sohbet/Uyarı/Mute logları

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

// DM HISTORY IN-MEMORY
let dmHistoryMemory = {};

// JSON FILES
const muteLogFile = './mute-log.json';
const warnLogFile = './warn-log.json';
const chatLogFile = './chat-log.json';
const ticketsFile = './tickets.json';
const supportsFile = './supports.json';
const dmHistoryFile = './dm-history.json';
const permissionsFile = './permissions.json';

function initFiles() {
  if (!fs.existsSync(muteLogFile)) fs.writeFileSync(muteLogFile, JSON.stringify({}));
  if (!fs.existsSync(warnLogFile)) fs.writeFileSync(warnLogFile, JSON.stringify({}));
  if (!fs.existsSync(chatLogFile)) fs.writeFileSync(chatLogFile, JSON.stringify({}));
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(supportsFile)) fs.writeFileSync(supportsFile, JSON.stringify({}));
  if (!fs.existsSync(dmHistoryFile)) fs.writeFileSync(dmHistoryFile, JSON.stringify({}));
  if (!fs.existsSync(permissionsFile)) fs.writeFileSync(permissionsFile, JSON.stringify({}));
}

function getPermissions() {
  return JSON.parse(fs.readFileSync(permissionsFile, 'utf8'));
}

function savePermissions(data) {
  fs.writeFileSync(permissionsFile, JSON.stringify(data, null, 2));
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

function getTickets() {
  return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
}

function saveTickets(data) {
  fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
}

function getSupports() {
  return JSON.parse(fs.readFileSync(supportsFile, 'utf8'));
}

function saveSupports(data) {
  fs.writeFileSync(supportsFile, JSON.stringify(data, null, 2));
}

function getDMHistory() {
  return JSON.parse(fs.readFileSync(dmHistoryFile, 'utf8'));
}

function saveDMHistory(data) {
  fs.writeFileSync(dmHistoryFile, JSON.stringify(data, null, 2));
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
        .setName('ticket')
        .setDescription('🎫 Ticket kanalı aç'),
      
      new SlashCommandBuilder()
        .setName('destek')
        .setDescription('📞 Destek talebinde bulun'),

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
  console.log(`[MESAJ] ${message.author.tag}: "${message.content.substring(0, 50)}" | Guild: ${message.guild?.name || 'DM'}`);
  
  if (message.author.bot) {
    console.log('[SKIP] Bot mesajı');
    return;
  }

  try {
    // DM'leri takip et - eğer guild yoksa DM'dir
    if (!message.guild) {
      console.log(`[DM] ${message.author.tag} DM gönderdi: "${message.content}"`);
      const userId = message.author.id;
      
      if (!dmHistoryMemory[userId]) {
        dmHistoryMemory[userId] = {
          username: message.author.tag,
          avatar: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
          messages: []
        };
        console.log(`[DM-NEW] Yeni kullanıcı: ${message.author.tag}`);
      }

      dmHistoryMemory[userId].messages.push({
        author: 'user',
        content: message.content,
        timestamp: new Date().toISOString()
      });

      if (dmHistoryMemory[userId].messages.length > 100) {
        dmHistoryMemory[userId].messages = dmHistoryMemory[userId].messages.slice(-100);
      }

      console.log(`[DM-SAVED] ${message.author.tag} için ${dmHistoryMemory[userId].messages.length} mesaj var`);
      return;
    }
  } catch (error) {
    console.error('[DM-ERROR] DM takip hatası:', error);
  }

  // Sunucu mesajlarını logla
  try {
    if (!message.guild) return;

    const chatLog = getChatLog();
    const guildId = message.guild.id;
    
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
  } catch (error) {
    console.error('[CHAT-ERROR] Chat log hatası:', error);
  }

  // PREFIX KOMUTLARI
  if (!message.content.startsWith('-') && !message.content.startsWith('z!')) return;

  // z! YARDIM KOMUTU
  if (message.content === 'z!yardım') {
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece umutpapa123 kullanabilir!');
    }

    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📚 ZWOZ Bot - Komut Rehberi')
      .setDescription('v5.0 - Sadece umutpapa123 kullanabilir')
      .addFields(
        { name: 'z!yardım', value: 'Bu mesajı göster' },
        { name: '-logkanal', value: 'Log kanalı oluştur (Rol, ses, mute olayları)' },
        { name: '-kanal kilitle', value: 'Kanalı yazılmaya kapalı yap' },
        { name: '-kanal aç', value: 'Kanalı yazılmaya açık yap' },
        { name: '-kanal resetle', value: 'Kanal mesajlarını sil' },
        { name: '-mute @user sebep zaman', value: 'Kullanıcıyı sustur (1s, 5m, 1h)' },
        { name: '-uyarı @user mesaj', value: 'Uyarı ver (1-5, 5=mute)' },
        { name: '/ticket', value: 'Ticket sistemi' },
        { name: '/destek', value: 'Destek sistemi' }
      )
      .setFooter({ text: 'WEB PANELİ: ID gir → Komut seç → Çalıştır' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
  }

  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  // Tüm prefix komutları için owner check
  if (message.author.id !== OWNER_ID) {
    return await message.reply('❌ Sadece umutpapa123 komutları kullanabilir!');
  }

  try {
    // LOG KANAL KOMUTU
    if (command === 'logkanal') {
      try {
        const guild = message.guild;
        if (!guild) return await message.reply('❌ Bu komut sadece sunucuda kullanılabilir!');

        const logChannel = await guild.channels.create({
          name: '📋-log',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel],
            },
            {
              id: OWNER_ID,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
          ],
        });

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Log Kanalı Oluşturuldu')
          .setDescription(`${logChannel} kanalında olaylar loglanacak`)
          .addFields(
            { name: 'Loglanacak Olaylar', value: '• Rol ver/al\n• Mute/Uyarı\n• Ses giriş/çıkış\n• Kötü mesajlar' }
          )
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      } catch (error) {
        console.error('Log kanal hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
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
    if (command === 'kanal' && args[0] === 'aç') {
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
    if (command === 'kanal' && args[0] === 'resetle') {
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
    if (command === 'mute') {
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
    if (command === 'uyarı') {
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
    if (command === 'i') {
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
    if (command === 'botdavet') {
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
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      
      // TICKET KOMUTU
      if (commandName === 'ticket') {
        try {
          const ticketButton = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('🎫 Ticket Aç')
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(ticketButton);

          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('🎫 Ticket Sistemi')
            .setDescription('Aşağıdaki buton ile ticket kanalı açabilirsiniz')
            .addFields(
              { name: 'Ticket Nedir?', value: 'Özel bir kanal açıp admin ile direkt iletişim kurabilirsiniz.' },
              { name: 'Not', value: 'Her ticket dilediğiniz zaman kapatılabilir.' }
            )
            .setFooter({ text: 'Ticket Sistemi' })
            .setTimestamp();

          await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            ephemeral: false
          });

        } catch (error) {
          console.error('Ticket komutu hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // DESTEK KOMUTU
      else if (commandName === 'destek') {
        try {
          const supportButton = new ButtonBuilder()
            .setCustomId('create_support')
            .setLabel('📞 Destek Aç')
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(supportButton);

          const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📞 Destek Sistemi')
            .setDescription('Aşağıdaki buton ile destek kanalı açabilirsiniz')
            .addFields(
              { name: 'Destek Nedir?', value: 'Probleminiz hakkında admin ile direkt konuşabilirsiniz.' },
              { name: 'Not', value: 'Her destek talebi dilediğiniz zaman kapatılabilir.' }
            )
            .setFooter({ text: 'Destek Sistemi' })
            .setTimestamp();

          await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            ephemeral: false
          });

        } catch (error) {
          console.error('Destek komutu hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // ROL VER
      else if (commandName === 'rolver') {
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
    }

    // BUTTON HANDLER
    else if (interaction.isButton()) {
      const { customId } = interaction;

      // Ticket oluştur
      if (customId === 'create_ticket') {
        const guild = interaction.guild;
        const tickets = getTickets();
        
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
                id: OWNER_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              }
            ],
          });

          tickets[guild.id][ticketChannel.id] = {
            userId: user.id,
            createdAt: Date.now()
          };
          saveTickets(tickets);

          const claimButton = new ButtonBuilder()
            .setCustomId(`claim_ticket_${user.id}`)
            .setLabel('👤 Talebi Üstlen')
            .setStyle(ButtonStyle.Primary);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Ticket Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('🎫 Ticket Oluşturuldu')
            .setDescription(`Merhaba ${user.username}! Sorununuzu açıklayın.`)
            .addFields(
              { name: 'Ticket ID', value: ticketChannel.id, inline: true },
              { name: 'Oluşturulma', value: new Date().toLocaleString('tr-TR'), inline: true }
            )
            .setFooter({ text: 'Ticket kapamak için Kapat butonuna basın' })
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

      // Destek oluştur
      else if (customId === 'create_support') {
        const guild = interaction.guild;
        const supports = getSupports();
        
        if (!supports[guild.id]) supports[guild.id] = {};

        try {
          const supportChannel = await guild.channels.create({
            name: `📞-destek-${user.username}`,
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
                id: OWNER_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              }
            ],
          });

          supports[guild.id][supportChannel.id] = {
            userId: user.id,
            createdAt: Date.now()
          };
          saveSupports(supports);

          const claimButton = new ButtonBuilder()
            .setCustomId(`claim_support_${user.id}`)
            .setLabel('👤 Talebi Üstlen')
            .setStyle(ButtonStyle.Primary);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_support')
            .setLabel('🔒 Destek Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

          const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📞 Destek Talebi Açıldı')
            .setDescription(`${user.username} destek talep ediyor.`)
            .addFields(
              { name: '👤 Talep Eden', value: user.tag, inline: true },
              { name: '⏰ Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
            )
            .setFooter({ text: 'Destek Sistemi' })
            .setTimestamp();

          await supportChannel.send({ embeds: [embed], components: [row] });
          
          await interaction.reply({ 
            content: `✅ Destek kanalı oluşturuldu: ${supportChannel}`, 
            ephemeral: true 
          });

        } catch (error) {
          console.error('Destek kanalı oluşturma hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // Ticket kapatma
      else if (customId === 'close_ticket') {
        try {
          const channel = interaction.channel;
          const tickets = getTickets();
          
          Object.keys(tickets).forEach(guildId => {
            if (tickets[guildId] && tickets[guildId][channel.id]) {
              delete tickets[guildId][channel.id];
            }
          });
          saveTickets(tickets);

          const closeEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔒 Ticket Kapatılıyor')
            .setDescription('Bu kanal 5 saniye sonra silinecek');

          await interaction.update({ embeds: [closeEmbed], components: [] });
          
          setTimeout(async () => {
            try {
              await channel.delete();
            } catch (error) {
              console.error('Kanal silme hatası:', error);
            }
          }, 5000);

        } catch (error) {
          console.error('Ticket kapatma hatası:', error);
        }
      }

      // Destek kapatma
      else if (customId === 'close_support') {
        try {
          const channel = interaction.channel;
          const supports = getSupports();
          
          Object.keys(supports).forEach(guildId => {
            if (supports[guildId] && supports[guildId][channel.id]) {
              delete supports[guildId][channel.id];
            }
          });
          saveSupports(supports);

          const closeEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔒 Destek Kapatılıyor')
            .setDescription('Bu kanal 5 saniye sonra silinecek');

          await interaction.update({ embeds: [closeEmbed], components: [] });
          
          setTimeout(async () => {
            try {
              await channel.delete();
            } catch (error) {
              console.error('Kanal silme hatası:', error);
            }
          }, 5000);

        } catch (error) {
          console.error('Destek kapatma hatası:', error);
        }
      }

      // Ticket talebi üstlenme
      else if (customId.startsWith('claim_ticket_')) {
        try {
          const userId = customId.split('_')[2];
          const claimedUser = await client.users.fetch(userId);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Ticket Üstlenildi')
            .setDescription(`${user.tag} tarafından üstlenildi`)
            .addFields(
              { name: '👤 Ticket Açan', value: claimedUser.tag, inline: true },
              { name: '👨‍💼 Üstlenen', value: user.tag, inline: true },
              { name: '⏰ Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
            )
            .setTimestamp();

          await interaction.update({ embeds: [embed], components: [] });

        } catch (error) {
          console.error('Ticket üstlenme hatası:', error);
        }
      }

      // Destek talebi üstlenme
      else if (customId.startsWith('claim_support_')) {
        try {
          const userId = customId.split('_')[2];
          const claimedUser = await client.users.fetch(userId);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Destek Talebi Üstlenildi')
            .setDescription(`${user.tag} tarafından üstlenildi`)
            .addFields(
              { name: '👤 Talep Eden', value: claimedUser.tag, inline: true },
              { name: '👨‍💼 Üstlenen', value: user.tag, inline: true },
              { name: '⏰ Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
            )
            .setTimestamp();

          await interaction.update({ embeds: [embed], components: [] });

        } catch (error) {
          console.error('Destek üstlenme hatası:', error);
        }
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

// KOMUT İZİNLERİ API
app.get('/api/permissions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = getPermissions();
    
    if (!permissions[userId]) {
      return res.json({ userId, commands: [] });
    }
    
    res.json(permissions[userId]);
  } catch (error) {
    console.error('Komut izni getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// KOMUT İZNİ KAYDET
app.post('/api/permissions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { commands } = req.body;

    if (!commands || !Array.isArray(commands)) {
      return res.status(400).json({ error: 'commands array gerekli' });
    }

    const permissions = getPermissions();
    permissions[userId] = {
      userId,
      commands,
      updatedAt: new Date().toISOString()
    };

    savePermissions(permissions);
    res.json({ success: true, message: 'İzinler kaydedildi' });
  } catch (error) {
    console.error('Komut izni kaydetme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// TÜM İZİNLER
app.get('/api/all-permissions', (req, res) => {
  try {
    const permissions = getPermissions();
    res.json(permissions);
  } catch (error) {
    console.error('Tüm izinleri getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// SUNUCULAR API
app.get('/api/guilds', (req, res) => {
  try {
    const guilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ dynamic: true, size: 256 })
    }));
    res.json(guilds);
  } catch (error) {
    console.error('Sunucu listeleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// SUNUCUDAKI KULLANICILAR API
app.get('/api/guilds/:guildId/members', async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Sunucu bulunamadı' });
    }

    const members = await guild.members.fetch();
    const memberList = members
      .filter(m => !m.user.bot)
      .map(m => ({
        id: m.id,
        username: m.user.username,
        tag: m.user.tag,
        avatar: m.user.displayAvatarURL({ dynamic: true, size: 256 })
      }))
      .sort((a, b) => a.username.localeCompare(b.username));

    res.json(memberList);
  } catch (error) {
    console.error('Kullanıcı listeleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// SUNUCUDAKI ROLLER API
app.get('/api/guilds/:guildId/roles', (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'Sunucu bulunamadı' });
    }

    const roles = guild.roles.cache
      .filter(role => role.id !== guild.id)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor
      }))
      .sort((a, b) => b.name.localeCompare(a.name));

    res.json(roles);
  } catch (error) {
    console.error('Rol listeleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// BOT'A YAZANLAR (DM KUTUSU)
app.get('/api/dm-users', (req, res) => {
  try {
    console.log(`[API] /dm-users çağrıldı. Toplam DM: ${Object.keys(dmHistoryMemory).length}`);
    
    const users = Object.entries(dmHistoryMemory).map(([userId, data]) => ({
      id: userId,
      username: data.username,
      avatar: data.avatar,
      messageCount: data.messages.length,
      lastMessage: data.messages.length > 0 ? data.messages[data.messages.length - 1].timestamp : null
    }));

    // Son mesajlara göre sırala
    users.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));
    console.log(`[API] ${users.length} kullanıcı gönderiliyor`);
    res.json(users);
  } catch (error) {
    console.error('[API-ERROR] DM kullanıcıları getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// BİR KULLANICIYLA CHAT GEÇMIŞI
app.get('/api/dm-history/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!dmHistoryMemory[userId]) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json(dmHistoryMemory[userId]);
  } catch (error) {
    console.error('DM geçmişi getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DM YANIT GÖNDER
app.post('/api/send-dm-reply', async (req, res) => {
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

    // DM history'ye kaydet
    if (!dmHistoryMemory[userId]) {
      dmHistoryMemory[userId] = {
        username: user.tag,
        avatar: user.displayAvatarURL({ dynamic: true, size: 256 }),
        messages: []
      };
    }

    dmHistoryMemory[userId].messages.push({
      author: 'bot',
      content: message,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Mesaj gönderildi' });
  } catch (error) {
    console.error('DM gönderme hatası:', error);
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
