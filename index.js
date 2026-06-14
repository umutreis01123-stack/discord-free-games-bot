require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');

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

// Log sistemi için veri yapısı
let logs = {
  messages: [], // { userId, username, channelId, channelName, content, timestamp }
  voice: [], // { userId, username, channelId, channelName, action: 'join'/'leave', timestamp }
  ratings: {} // { userId: { totalScore, ratingCount, ratings: [{from, score, timestamp}] } }
};

// Log dosyasını yükle
function loadLogs() {
  try {
    if (fs.existsSync('logs.json')) {
      logs = JSON.parse(fs.readFileSync('logs.json', 'utf8'));
    }
  } catch (error) {
    console.error('Log yükleme hatası:', error);
  }
}

// Log dosyasını kaydet
function saveLogs() {
  try {
    fs.writeFileSync('logs.json', JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Log kaydetme hatası:', error);
  }
}

// Bot hazır olduğunda
client.once('ready', async () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  console.log(`🎮 ${client.guilds.cache.size} sunucuda aktif`);
  
  loadLogs();
  
  // Slash komutlarını kaydet
  await registerSlashCommands();
  
  client.user.setActivity('Loglar kaydediliyor...', { type: 3 }); // 3 = WATCHING
});

// 7/24 Mesaj Loglama
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Her mesajı logla
  logs.messages.push({
    userId: message.author.id,
    username: message.author.username,
    channelId: message.channel.id,
    channelName: message.channel.name,
    content: message.content,
    timestamp: new Date().toISOString()
  });

  // Son 10000 mesajı sakla (performans için)
  if (logs.messages.length > 10000) {
    logs.messages = logs.messages.slice(-10000);
  }

  saveLogs();
});

// 7/24 Ses Loglama
client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member;

  // Ses kanalına giriş
  if (!oldState.channel && newState.channel) {
    logs.voice.push({
      userId: member.id,
      username: member.user.username,
      channelId: newState.channel.id,
      channelName: newState.channel.name,
      action: 'join',
      timestamp: new Date().toISOString()
    });
  }

  // Ses kanalından çıkış
  if (oldState.channel && !newState.channel) {
    logs.voice.push({
      userId: member.id,
      username: member.user.username,
      channelId: oldState.channel.id,
      channelName: oldState.channel.name,
      action: 'leave',
      timestamp: new Date().toISOString()
    });
  }

  // Kanal değiştirme
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    logs.voice.push({
      userId: member.id,
      username: member.user.username,
      channelId: oldState.channel.id,
      channelName: oldState.channel.name,
      action: 'leave',
      timestamp: new Date().toISOString()
    });
    logs.voice.push({
      userId: member.id,
      username: member.user.username,
      channelId: newState.channel.id,
      channelName: newState.channel.name,
      action: 'join',
      timestamp: new Date().toISOString()
    });
  }

  // Son 5000 ses logunu sakla
  if (logs.voice.length > 5000) {
    logs.voice = logs.voice.slice(-5000);
  }

  saveLogs();
});

// Slash Komutları
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // /tiketkur
  if (commandName === 'tiketkur') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bu komutu kullanmak için yönetici olmalısın!', ephemeral: true });
    }

    try {
      // Ticket kategorisi oluştur
      const category = await interaction.guild.channels.create({
        name: '📩 DESTEK',
        type: ChannelType.GuildCategory,
        position: 0
      });

      // Ticket açma kanalı oluştur
      const ticketChannel = await interaction.guild.channels.create({
        name: '📩・ticket-aç',
        type: ChannelType.GuildText,
        parent: category.id,
        topic: 'Destek talebi oluşturmak için butona tıklayın'
      });

      // Ticket açma mesajı
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎫 Destek Sistemi')
        .setDescription('Destek talebi oluşturmak için aşağıdaki butona tıklayın.\n\nYetkili ekibimiz en kısa sürede size yardımcı olacaktır.')
        .addFields(
          { name: '⏰ Yanıt Süresi', value: 'Ortalama 5-10 dakika', inline: true },
          { name: '📊 Durum', value: 'Aktif', inline: true }
        )
        .setFooter({ text: 'Destek Sistemi' })
        .setTimestamp();

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('🎫 Ticket Aç')
          .setStyle(ButtonStyle.Success)
      );

      await ticketChannel.send({ embeds: [embed], components: [button] });

      interaction.reply({ content: `✅ Ticket sistemi kuruldu! Kanal: ${ticketChannel}`, ephemeral: true });
    } catch (error) {
      console.error('Ticket kurulum hatası:', error);
      interaction.reply({ content: '❌ Hata: ' + error.message, ephemeral: true });
    }
  }

  // /destekkur
  if (commandName === 'destekkur') {
    try {
      // Kullanıcıya özel ticket kanalı oluştur
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        topic: `Destek talebi: ${interaction.user.tag}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: OWNER_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎫 Destek Talebi')
        .setDescription(`Merhaba ${interaction.user}, \n\nDestek talebiniz oluşturuldu. Lütfen sorununuzu detaylı bir şekilde açıklayın.\n\nYetkili ekibimiz en kısa sürede size dönüş yapacaktır.`)
        .addFields(
          { name: '👤 Kullanıcı', value: interaction.user.tag, inline: true },
          { name: '🆔 ID', value: interaction.user.id, inline: true },
          { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
        )
        .setFooter({ text: 'Destek talebi kapatmak için yöneticiye bildirin' })
        .setTimestamp();

      await ticketChannel.send({ content: `${interaction.user} | <@${OWNER_ID}>`, embeds: [embed] });

      interaction.reply({ content: `✅ Destek talebiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });
    } catch (error) {
      console.error('Destek kurulum hatası:', error);
      interaction.reply({ content: '❌ Hata: ' + error.message, ephemeral: true });
    }
  }

  // /log
  if (commandName === 'log') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bu komutu kullanmak için yönetici olmalısın!', ephemeral: true });
    }

    const userId = interaction.options.getUser('kullanici')?.id;

    try {
      // Log kanalı oluştur
      const logChannel = await interaction.guild.channels.create({
        name: `📊-log-${userId ? 'user' : 'genel'}`,
        type: ChannelType.GuildText,
        topic: 'Sunucu logları',
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: OWNER_ID,
            allow: [PermissionFlagsBits.ViewChannel]
          }
        ]
      });

      // Mesaj logları
      let messageLogs = logs.messages;
      if (userId) {
        messageLogs = messageLogs.filter(m => m.userId === userId);
      }

      const recentMessages = messageLogs.slice(-50); // Son 50 mesaj
      const messageText = recentMessages.map(m => 
        `[${new Date(m.timestamp).toLocaleString('tr-TR')}] ${m.username} (#${m.channelName}): ${m.content}`
      ).join('\n') || 'Mesaj logu yok';

      // Ses logları
      let voiceLogs = logs.voice;
      if (userId) {
        voiceLogs = voiceLogs.filter(v => v.userId === userId);
      }

      const recentVoice = voiceLogs.slice(-30); // Son 30 ses hareketi
      const voiceText = recentVoice.map(v => 
        `[${new Date(v.timestamp).toLocaleString('tr-TR')}] ${v.username} - ${v.action === 'join' ? '🟢 Girdi' : '🔴 Çıktı'} - ${v.channelName}`
      ).join('\n') || 'Ses logu yok';

      // Logları dosya olarak kaydet
      const logContent = `=== MESAJ LOGLARI ===\n${messageText}\n\n=== SES LOGLARI ===\n${voiceText}`;
      fs.writeFileSync('temp_log.txt', logContent);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('📊 Sunucu Logları')
        .setDescription(userId ? `Kullanıcı: <@${userId}>` : 'Tüm sunucu logları')
        .addFields(
          { name: '📨 Toplam Mesaj', value: messageLogs.length.toString(), inline: true },
          { name: '🎙️ Toplam Ses Hareketi', value: voiceLogs.length.toString(), inline: true },
          { name: '📂 Kanal', value: logChannel.toString(), inline: true }
        )
        .setFooter({ text: 'Detaylı loglar dosya olarak gönderildi' })
        .setTimestamp();

      await logChannel.send({ embeds: [embed], files: ['temp_log.txt'] });
      fs.unlinkSync('temp_log.txt');

      interaction.reply({ content: `✅ Loglar oluşturuldu: ${logChannel}`, ephemeral: true });
    } catch (error) {
      console.error('Log oluşturma hatası:', error);
      interaction.reply({ content: '❌ Hata: ' + error.message, ephemeral: true });
    }
  }

  // /puanla
  if (commandName === 'puanla') {
    const targetUser = interaction.options.getUser('kullanici');
    const score = interaction.options.getInteger('puan');

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Kendine puan veremezsin!', ephemeral: true });
    }

    if (score < 1 || score > 10) {
      return interaction.reply({ content: '❌ Puan 1-10 arasında olmalı!', ephemeral: true });
    }

    // Puanlama sistemi
    if (!logs.ratings[targetUser.id]) {
      logs.ratings[targetUser.id] = {
        totalScore: 0,
        ratingCount: 0,
        ratings: []
      };
    }

    logs.ratings[targetUser.id].totalScore += score;
    logs.ratings[targetUser.id].ratingCount += 1;
    logs.ratings[targetUser.id].ratings.push({
      from: interaction.user.id,
      fromUsername: interaction.user.username,
      score: score,
      timestamp: new Date().toISOString()
    });

    saveLogs();

    const avgScore = (logs.ratings[targetUser.id].totalScore / logs.ratings[targetUser.id].ratingCount).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('⭐ Puanlama Sistemi')
      .setDescription(`${interaction.user} → ${targetUser} kullanıcısını puanladı!`)
      .addFields(
        { name: '🎯 Verilen Puan', value: `${score}/10`, inline: true },
        { name: '📊 Ortalama Puan', value: `${avgScore}/10`, inline: true },
        { name: '🔢 Toplam Değerlendirme', value: logs.ratings[targetUser.id].ratingCount.toString(), inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `${targetUser.username} - Puanlama Sistemi` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }

  // /shiple
  if (commandName === 'shiple') {
    const user1 = interaction.options.getUser('kullanici1');
    const user2 = interaction.options.getUser('kullanici2');

    if (user1.id === user2.id) {
      return interaction.reply({ content: '❌ Aynı kişiyi kendisiyle shipleyemezsin!', ephemeral: true });
    }

    // Ship skoru hesapla (pseudo-random ama tutarlı)
    const seed = parseInt(user1.id) + parseInt(user2.id);
    const shipScore = ((seed % 100) + 1); // 1-100 arası

    // Ship ismi oluştur (Marpelin tarzı)
    const name1 = user1.username.substring(0, Math.ceil(user1.username.length / 2));
    const name2 = user2.username.substring(Math.floor(user2.username.length / 2));
    const shipName = name1 + name2;

    // Ship durumu
    let shipStatus = '';
    let shipEmoji = '';
    let shipColor = 0xff0000;

    if (shipScore >= 80) {
      shipStatus = 'Mükemmel Uyum! 💕';
      shipEmoji = '❤️❤️❤️';
      shipColor = 0xe91e63;
    } else if (shipScore >= 60) {
      shipStatus = 'Güzel Uyum! 💖';
      shipEmoji = '❤️❤️';
      shipColor = 0xf48fb1;
    } else if (shipScore >= 40) {
      shipStatus = 'Orta Uyum 💛';
      shipEmoji = '❤️';
      shipColor = 0xffeb3b;
    } else if (shipScore >= 20) {
      shipStatus = 'Zayıf Uyum 💔';
      shipEmoji = '💔';
      shipColor = 0xff9800;
    } else {
      shipStatus = 'Uyumsuz 😢';
      shipEmoji = '💔💔';
      shipColor = 0x607d8b;
    }

    // Ship bar oluştur
    const filledBars = Math.floor(shipScore / 10);
    const emptyBars = 10 - filledBars;
    const shipBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

    const embed = new EmbedBuilder()
      .setColor(shipColor)
      .setTitle('💕 Ship Hesaplayıcı')
      .setDescription(`${user1} ${shipEmoji} ${user2}`)
      .addFields(
        { name: '💑 Ship İsmi', value: `**${shipName}**`, inline: true },
        { name: '💯 Uyum Oranı', value: `**%${shipScore}**`, inline: true },
        { name: '📊 Durum', value: shipStatus, inline: true },
        { name: '📈 Uyum Barı', value: `\`${shipBar}\` ${shipScore}%`, inline: false }
      )
      .setFooter({ text: 'Marpelin Ship Sistemi' })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
});

// Ticket button handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    try {
      // Ticket kanalı oluştur
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        topic: `Destek talebi: ${interaction.user.tag}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: OWNER_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎫 Destek Talebi')
        .setDescription(`Merhaba ${interaction.user}, \n\nDestek talebiniz oluşturuldu. Lütfen sorununuzu detaylı bir şekilde açıklayın.\n\nYetkili ekibimiz en kısa sürede size dönüş yapacaktır.`)
        .addFields(
          { name: '👤 Kullanıcı', value: interaction.user.tag, inline: true },
          { name: '🆔 ID', value: interaction.user.id, inline: true },
          { name: '📅 Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
        )
        .setFooter({ text: 'Destek talebi kapatmak için yöneticiye bildirin' })
        .setTimestamp();

      await ticketChannel.send({ content: `${interaction.user} | <@${OWNER_ID}>`, embeds: [embed] });

      interaction.reply({ content: `✅ Destek talebiniz oluşturuldu: ${ticketChannel}`, ephemeral: true });
    } catch (error) {
      console.error('Ticket oluşturma hatası:', error);
      interaction.reply({ content: '❌ Hata: ' + error.message, ephemeral: true });
    }
  }
});

// Slash komutlarını kaydet
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('tiketkur')
      .setDescription('Ticket sistemi kurar (Admin)'),
    
    new SlashCommandBuilder()
      .setName('destekkur')
      .setDescription('Destek talebi oluşturur'),
    
    new SlashCommandBuilder()
      .setName('log')
      .setDescription('Sunucu loglarını gösterir (Admin)')
      .addUserOption(option =>
        option.setName('kullanici')
          .setDescription('Belirli bir kullanıcının loglarını göster (opsiyonel)')
          .setRequired(false)),
    
    new SlashCommandBuilder()
      .setName('puanla')
      .setDescription('Kullanıcıya puan ver (1-10)')
      .addUserOption(option =>
        option.setName('kullanici')
          .setDescription('Puanlanacak kullanıcı')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('puan')
          .setDescription('Puan (1-10 arası)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName('shiple')
      .setDescription('İki kullanıcı arasındaki uyum oranını hesapla')
      .addUserOption(option =>
        option.setName('kullanici1')
          .setDescription('İlk kullanıcı')
          .setRequired(true))
      .addUserOption(option =>
        option.setName('kullanici2')
          .setDescription('İkinci kullanıcı')
          .setRequired(true))
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Slash komutları kaydediliyor...');
    
    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands }
      );
    }
    
    console.log('✅ Slash komutları kaydedildi!');
  } catch (error) {
    console.error('Slash komut kaydı hatası:', error);
  }
}

// Bot'u başlat
client.login(process.env.DISCORD_TOKEN);
