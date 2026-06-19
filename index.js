require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v3.0 - TICKET & DESTEK SİSTEMİ
=================================================================

SLASH KOMUTLAR (/):
- /ticket        → Ticket kanalı aç (Kullanıcılar)
- /destek        → Destek kanalı aç (Kullanıcılar)
- /sunucubilgisi → Sunucu bilgilerini göster (Tüm)
- /rolver @user @role  → Rol ver (SADECE UMUT PAPA)
- /rolal @user @role   → Rol al (SADECE UMUT PAPA)

PREFIX KOMUTLARI (-):
- -kanal kilitle  → Kanalı yazılmaya kapalı yap (Kanal Yönetimi yetkisi gerekli)
- -kanal aç       → Kanalı yazılmaya açık yap (Kanal Yönetimi yetkisi gerekli)
- -kanal resetle  → Kanal mesajlarını toplu sil (Mesaj Yönetimi yetkisi gerekli)

YARDıM KOMUTLARI:
- z!yardım       → Tüm komutları göster
- -i veya -invite → Davet ettiklerinizi göster

TICKET/DESTEK AKIŞI:
1. /ticket veya /destek komutu → Buton göster
2. Butona tıkla → Kanal oluştur
3. Talebi Üstlen → Tarafından üstlenildi göster
4. Kapat → Kanali 5 sn sonra sil

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
const ticketsFile = './tickets.json';
const supportsFile = './supports.json';
const stockFile = './stock.json';
const owoUsersFile = './owo-users.json';

function initFiles() {
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(supportsFile)) fs.writeFileSync(supportsFile, JSON.stringify({}));
  if (!fs.existsSync(stockFile)) fs.writeFileSync(stockFile, JSON.stringify({}));
  if (!fs.existsSync(owoUsersFile)) fs.writeFileSync(owoUsersFile, JSON.stringify({}));
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

function getStock() {
  return JSON.parse(fs.readFileSync(stockFile, 'utf8'));
}

function saveStock(data) {
  fs.writeFileSync(stockFile, JSON.stringify(data, null, 2));
}

function getOwoUsers() {
  return JSON.parse(fs.readFileSync(owoUsersFile, 'utf8'));
}

function saveOwoUsers(data) {
  fs.writeFileSync(owoUsersFile, JSON.stringify(data, null, 2));
}

initFiles();

// Bot ready
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  console.log('📊 Toplam Sunucu: ' + client.guilds.cache.size);
  updateBotStatus();

  // Register slash commands
  try {
    console.log('⚙️ Slash komutları kurgulanıyor...');

    const allCommands = await client.application.commands.fetch();
    console.log('Mevcut komutlar siliniyoruu: ' + allCommands.size);
    
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
        .setName('sunucubilgisi')
        .setDescription('ℹ️ Sunucu hakkında bilgi göster'),
      
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
  client.user.setActivity(`${serverCount} sunucuda | z!yardım`, { type: 2 });
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



// INTERACTION HANDLER - BUTTONS AND SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const { commandName, customId, user } = interaction;

  try {
    // Timeout yok - Defer etme (respond hızlı olmalı)
    
    // BUTTON HANDLER
    if (interaction.isButton()) {
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
            .setLabel('� Talebi Üstlen')
            .setStyle(ButtonStyle.Primary);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('� Ticket Kapat')
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

    // SLASH COMMANDS
    else if (interaction.isChatInputCommand()) {
      
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
              { name: 'Ticket Nedir?', value: 'Özel bir kanal açıp Umut Papa ile direkt iletişim kurabilirsiniz.' },
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
              { name: 'Destek Nedir?', value: 'Probleminiz hakkında Umut Papa ile direkt konuşabilirsiniz.' },
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

      // SUNUCU BİLGİSİ KOMUTU
      else if (commandName === 'sunucubilgisi') {
        try {
          const guild = interaction.guild;
          const owner = await guild.fetchOwner();

          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('ℹ️ Sunucu Bilgileri')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
              { name: '📌 Sunucu Adı', value: guild.name, inline: true },
              { name: '🆔 Sunucu ID', value: guild.id, inline: true },
              { name: '👥 Üye Sayısı', value: guild.memberCount.toString(), inline: true },
              { name: '#️⃣ Kanal Sayısı', value: guild.channels.cache.size.toString(), inline: true },
              { name: '🏷️ Rol Sayısı', value: guild.roles.cache.size.toString(), inline: true },
              { name: '👑 Sunucu Sahibi', value: owner.user.tag, inline: true },
              { name: '📅 Oluşturulma', value: guild.createdAt.toLocaleDateString('tr-TR'), inline: true },
              { name: '🔐 Doğrulama', value: guild.verificationLevel.toString(), inline: true }
            )
            .setFooter({ text: 'Sunucu Bilgileri' })
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          console.error('Sunucu bilgisi hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // ROL VER (Sadece Umut Papa)
      else if (commandName === 'rolver') {
        if (!isOwner(interaction.user.id)) {
          return await interaction.reply({ content: '❌ Bu komutu sadece Umut Papa kullanabilir!', ephemeral: true });
        }

        try {
          const targetUser = interaction.options.getUser('kullanici');
          const role = interaction.options.getRole('rol');
          const member = await interaction.guild.members.fetch(targetUser.id);

          if (member.roles.cache.has(role.id)) {
            return await interaction.reply({ content: `❌ ${targetUser.tag} kullanıcısında zaten ${role.name} rolü var!`, ephemeral: true });
          }

          await member.roles.add(role);
          await interaction.reply({ content: `✅ ${targetUser.tag} kullanıcısına ${role.name} rolü verildi!` });
        } catch (error) {
          console.error('Rol ver hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // ROL AL (Sadece Umut Papa)
      else if (commandName === 'rolal') {
        if (!isOwner(interaction.user.id)) {
          return await interaction.reply({ content: '❌ Bu komutu sadece Umut Papa kullanabilir!', ephemeral: true });
        }

        try {
          const targetUser = interaction.options.getUser('kullanici');
          const role = interaction.options.getRole('rol');
          const member = await interaction.guild.members.fetch(targetUser.id);

          if (!member.roles.cache.has(role.id)) {
            return await interaction.reply({ content: `❌ ${targetUser.tag} kullanıcısında ${role.name} rolü yok!`, ephemeral: true });
          }

          await member.roles.remove(role);
          await interaction.reply({ content: `✅ ${targetUser.tag} kullanıcısından ${role.name} rolü alındı!` });
        } catch (error) {
          console.error('Rol al hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
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

// PREFIX KOMUTLARI - z! VE - İLE BAŞLAYAN KOMUTLAR
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Z! YARDIM KOMUTU
  if (message.content === 'z!yardım') {
    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('📚 Bot Komutları')
      .setDescription('Botun tüm komutları')
      .addFields(
        { name: '🎫 Slash Komutlar (/)', value: '`/ticket` - Ticket kanalı aç\n`/destek` - Destek talebinde bulun\n`/sunucubilgisi` - Sunucu bilgilerini göster', inline: false },
        { name: '👑 Sadece Umut Papa (/)', value: '`/rolver @user @role` - Rol ver\n`/rolal @user @role` - Rol al', inline: false },
        { name: '🔧 Kanal Komutları (-)', value: '`-kanal kilitle` - Kanalı yazılmaya kapalı yap\n`-kanal aç` - Kanalı yazılmaya açık yap\n`-kanal resetle` - Kanal mesajlarını sil', inline: false },
        { name: '❓ Diğer', value: '`-i` veya `-invite` - Davet ettiklerinizi göster', inline: false }
      )
      .setFooter({ text: 'ZWOZ Bot | v3.0' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
  }

  // SAYFAYA İTİŞ KOMUTU (-i)
  if (message.content === '-i' || message.content === '-invite') {
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
            name: `Davet ${inv.uses}`,
            value: `**Bağlantı:** ${inv.url}`,
            inline: false
          })).slice(0, 25)
        )
        .setFooter({ text: 'Davetleriniz' })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Invite hatası:', error);
      await message.reply('❌ Davetleriniz getirilemedi!');
    }
    return;
  }

  // -  İLE BAŞLAYAN KOMUTLAR
  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  // KANAL KİLİT KOMUTU
  if (command === 'kanal' && args[0] === 'kilitle') {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await message.reply('❌ Kanal yönetme yetkisine sahip değilsiniz!');
      }

      const channel = message.channel;
      await channel.permissionOverwrites.edit(channel.guild.id, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🔒 Kanal Kilitlendi')
        .setDescription(`${channel.name} kanalı yazılmaya kapalı hale getirildi`)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Kanal kilitleme hatası:', error);
      await message.reply('❌ Kanal kilitlenirken hata oluştu!');
    }
  }

  // KANAL AÇ KOMUTU
  else if (command === 'kanal' && args[0] === 'aç') {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await message.reply('❌ Kanal yönetme yetkisine sahip değilsiniz!');
      }

      const channel = message.channel;
      await channel.permissionOverwrites.edit(channel.guild.id, {
        SendMessages: true,
      });

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🔓 Kanal Açıldı')
        .setDescription(`${channel.name} kanalı yazılmaya açık hale getirildi`)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Kanal açma hatası:', error);
      await message.reply('❌ Kanal açılırken hata oluştu!');
    }
  }

  // KANAL RESETLE KOMUTU (Mesajları sil)
  else if (command === 'kanal' && args[0] === 'resetle') {
    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return await message.reply('❌ Mesaj yönetme yetkisine sahip değilsiniz!');
      }

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
      await message.reply('❌ Kanal resetlenirken hata oluştu!');
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
