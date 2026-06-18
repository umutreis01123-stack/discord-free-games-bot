require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
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
const ticketsFile = './tickets.json';
const supportsFile = './supports.json';

function initFiles() {
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(supportsFile)) fs.writeFileSync(supportsFile, JSON.stringify({}));
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

initFiles();

// Bot ready
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  console.log('📊 Toplam Sunucu: ' + client.guilds.cache.size);
  updateBotStatus();

  // Slash komutları kur
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



// SLASH KOMUT HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, customId, user } = interaction;

  try {
    // BUTTON HANDLER
    if (interaction.isButton()) {
      // Ticket kapatma
      if (customId === 'close_ticket') {
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
      else if (customId.startsWith('close_support_')) {
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

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Ticket Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(closeButton);

          const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('🎫 Ticket Oluşturuldu')
            .setDescription(`Merhaba ${user.username}! Sorununuzu açıklayın.`)
            .setFooter({ text: 'Ticket kapamak için aşağıdaki buton kullanın' })
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

      // DESTEK KOMUTU
      else if (commandName === 'destek') {
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
            .setCustomId(`close_support_${user.id}`)
            .setLabel('🔒 Destek Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

          const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📞 Destek Talebi')
            .setDescription(`${user.username} destek talep ediyor`)
            .addFields(
              { name: '👤 Talep Eden', value: user.tag, inline: true },
              { name: '⏰ Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
            )
            .setFooter({ text: 'Umut Papa talebinizi görecek' })
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

      // SUNUCU BİLGİSİ KOMUTU
      else if (commandName === 'sunucubilgisi') {
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

// PREFIX KOMUTLARI (- ve z!)
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
        { name: '📌 Prefix Komutlar (-)', value: '`-invite` - Bot davet et\n`-kanal kilitle` - Kanalı kilitler\n`-kanal aç` - Kanalı açar\n`-kanal sıfırla` - İzinleri sıfırlar\n`-rolver @user @role` - Rol ver (Umut Papa)\n`-rolal @user @role` - Rol al (Umut Papa)', inline: false },
        { name: '❓ Yardım', value: '`z!yardım` - Bu mesajı göster', inline: false }
      )
      .setFooter({ text: 'Umut Papa Bot | v2.0' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return;
  }

  // - PREFIX KOMUTLAR
  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  // INVITE KOMUTU
  if (command === 'invite') {
    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`;
    
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🔗 Bot Davet Et')
      .setDescription(`[Botu Sunucuya Davet Et](${inviteLink})`);
    
    await message.reply({ embeds: [embed] });
    return;
  }

  // KANAL KOMUTLARI (Sadece Umut Papa)
  if (command === 'kanal') {
    if (!isOwner(message.author.id)) {
      return await message.reply('❌ Bu komutu sadece Umut Papa kullanabilir!');
    }

    const action = args[0]?.toLowerCase();
    const channel = message.channel;

    if (action === 'kilitle') {
      try {
        await channel.permissionOverwrites.edit(message.guild.id, {
          SendMessages: false,
        });
        await message.reply('🔒 Kanal kilitlendi!');
      } catch (error) {
        await message.reply('❌ Hata: ' + error.message);
      }
    }

    else if (action === 'aç') {
      try {
        await channel.permissionOverwrites.edit(message.guild.id, {
          SendMessages: null,
        });
        await message.reply('🔓 Kanal açıldı!');
      } catch (error) {
        await message.reply('❌ Hata: ' + error.message);
      }
    }

    else if (action === 'sıfırla') {
      try {
        await channel.permissionOverwrites.delete(message.guild.id);
        await message.reply('♻️ Kanal izinleri sıfırlandı!');
      } catch (error) {
        await message.reply('❌ Hata: ' + error.message);
      }
    }

    else {
      await message.reply('❌ Kullanım: `-kanal kilitle/aç/sıfırla`');
    }
  }

  // ROL VER (Sadece Umut Papa)
  else if (command === 'rolver') {
    if (!isOwner(message.author.id)) {
      return await message.reply('❌ Bu komutu sadece Umut Papa kullanabilir!');
    }

    const user = message.mentions.users.first();
    const role = message.mentions.roles.first();

    if (!user || !role) {
      return await message.reply('❌ Kullanım: `-rolver @user @role`');
    }

    try {
      const member = await message.guild.members.fetch(user.id);
      if (member.roles.cache.has(role.id)) {
        return await message.reply('❌ Kullanıcıda zaten bu rol var!');
      }
      
      await member.roles.add(role);
      await message.reply(`✅ ${user.tag} kullanıcısına ${role.name} rolü verildi!`);
    } catch (error) {
      await message.reply('❌ Hata: ' + error.message);
    }
  }

  // ROL AL (Sadece Umut Papa)
  else if (command === 'rolal') {
    if (!isOwner(message.author.id)) {
      return await message.reply('❌ Bu komutu sadece Umut Papa kullanabilir!');
    }

    const user = message.mentions.users.first();
    const role = message.mentions.roles.first();

    if (!user || !role) {
      return await message.reply('❌ Kullanım: `-rolal @user @role`');
    }

    try {
      const member = await message.guild.members.fetch(user.id);
      if (!member.roles.cache.has(role.id)) {
        return await message.reply('❌ Kullanıcıda bu rol yok!');
      }
      
      await member.roles.remove(role);
      await message.reply(`✅ ${user.tag} kullanıcısından ${role.name} rolü alındı!`);
    } catch (error) {
      await message.reply('❌ Hata: ' + error.message);
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
