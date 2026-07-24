require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
SHDW BOT v10.1 - YENİ DESTEK SİSTEMİ
=================================================================

SLASH KOMUTLAR:
- /profil [@user]          → Kullanıcı istatistikleri
- /rank [@user]            → Seviye göster
- /roller                  → Sunucudaki rollerin listesi
- /sıralama                → Sunucu istatistik sıralaması
- /sunucu                  → Sunucu hakkında bilgi
- /davet-sıralama          → Sunucunun davet sıralaması
- /davetler [@user]        → Üyenin davetlerini göster
- /davetleri-sıfırla       → Davet sayılarını sıfırla
- /fatura-oluştur          → Yeni bir fatura oluştur
- /kurucu                  → Sunucunun kurucusunu göster
- /leaderboard             → En iyi 10 seviyesini listele
- /ping                    → Bot gecikme ölçer

MESAJ KOMUTLAR:
- z!yardım                 → Komut listesi

DESTEK SİSTEMİ:
- Destek talebi açma (butonlar)
- Reklam paketleri bilgisi
- Ceza itirazı
- Çekiliş kazandım
- Soru var, soru soracağım
- Discord hakkında soru

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
    GatewayIntentBits.GuildInvites,
  ],
});

const OWNER_ID = '1403495996138323989';

// JSON FILES
const ticketsFile = './tickets.json';
const invitesFile = './invites.json';
const levelsFile = './levels.json';
const invoicesFile = './invoices.json';
const xpConfigFile = './xp-config.json';
const supportConfigFile = './support-config.json';

function initFiles() {
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(invitesFile)) fs.writeFileSync(invitesFile, JSON.stringify({}));
  if (!fs.existsSync(levelsFile)) fs.writeFileSync(levelsFile, JSON.stringify({}));
  if (!fs.existsSync(invoicesFile)) fs.writeFileSync(invoicesFile, JSON.stringify({}));
  if (!fs.existsSync(xpConfigFile)) fs.writeFileSync(xpConfigFile, JSON.stringify({}));
  if (!fs.existsSync(supportConfigFile)) fs.writeFileSync(supportConfigFile, JSON.stringify({}));
}

initFiles();

function getTickets() {
  return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
}

function saveTickets(data) {
  fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
}

function getInvites() {
  return JSON.parse(fs.readFileSync(invitesFile, 'utf8'));
}

function saveInvites(data) {
  fs.writeFileSync(invitesFile, JSON.stringify(data, null, 2));
}

function getLevels() {
  return JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
}

function saveLevels(data) {
  fs.writeFileSync(levelsFile, JSON.stringify(data, null, 2));
}

function getInvoices() {
  return JSON.parse(fs.readFileSync(invoicesFile, 'utf8'));
}

function saveInvoices(data) {
  fs.writeFileSync(invoicesFile, JSON.stringify(data, null, 2));
}

function getXpConfig() {
  return JSON.parse(fs.readFileSync(xpConfigFile, 'utf8'));
}

function saveXpConfig(data) {
  fs.writeFileSync(xpConfigFile, JSON.stringify(data, null, 2));
}

function getSupportConfig() {
  return JSON.parse(fs.readFileSync(supportConfigFile, 'utf8'));
}

function saveSupportConfig(data) {
  fs.writeFileSync(supportConfigFile, JSON.stringify(data, null, 2));
}

// BOT READY
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  console.log(`📊 ${client.guilds.cache.size} sunucuda aktif`);
  console.log(`👥 ${client.users.cache.size} kullanıcıya hizmet veriyor`);
  
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('profil')
        .setDescription('👤 Bir kullanıcının istatistiklerini görüntüle')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Profili görüntülenecek kullanıcı')
            .setRequired(false)),

      new SlashCommandBuilder()
        .setName('rank')
        .setDescription('📊 Seviyeni gösterir')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Seviyesi görüntülenecek kullanıcı')
            .setRequired(false)),

      new SlashCommandBuilder()
        .setName('roller')
        .setDescription('🎭 Sunucudaki rollerin listesini ve üye sayılarını gösterir'),

      new SlashCommandBuilder()
        .setName('sıralama')
        .setDescription('📈 Sunucu istatistik sıralamasını görüntüle'),

      new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('📋 Sunucu hakkında bilgi verir'),

      new SlashCommandBuilder()
        .setName('davet-sıralama')
        .setDescription('📊 Sunucunun davet sıralamasını gösterir'),

      new SlashCommandBuilder()
        .setName('davetler')
        .setDescription('🎫 Üyenin davetlerini gösterir')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Davetleri görüntülenecek kullanıcı')
            .setRequired(false)),

      new SlashCommandBuilder()
        .setName('davetleri-sıfırla')
        .setDescription('🗑️ Sunucudaki herkesin davet sayılarını sıfırlar'),

      new SlashCommandBuilder()
        .setName('kurucu')
        .setDescription('👑 Sunucunun kurucusunu gösterir'),

      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Sunucunun en iyi 10 seviyesini listeler'),

      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Botun gecikme süresini gösterir'),

      new SlashCommandBuilder()
        .setName('mesaj')
        .setDescription('📢 Sunuculara mesaj gönder (Owner)')
        .addStringOption(option =>
          option.setName('sunucu')
            .setDescription('Hangi sunucuya mesaj gönderilecek?')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('mesaj')
            .setDescription('Gönderilecek mesaj')
            .setRequired(true)),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
    // Bot activity status ayarla
    client.user.setActivity('z!yardım | SHDW Bot', { type: 0 });
    console.log('🎮 Bot aktivitesi ayarlandı');
    console.log('🚀 SHDW Bot v10.1 tamamen hazır!');
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

// MESAJ KOMUTLARI
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // XP SİSTEMİ - HER MESAJDA XP KAZAN (OwO gibi)
  if (!content.startsWith('z!')) {
    const levels = getLevels();
    const userId = message.author.id;
    
    if (!levels[userId]) {
      levels[userId] = { level: 0, xp: 0, lastMessage: 0 };
    }

    // Cooldown - 60 saniyede bir XP ver
    const now = Date.now();
    if (now - levels[userId].lastMessage < 60000) {
      // Cooldown aktif, XP verme
    } else {
      // Random XP ver (15-25 arası)
      const xpGained = Math.floor(Math.random() * 11) + 15;
      levels[userId].xp += xpGained;
      levels[userId].lastMessage = now;

      // Seviye atladı mı kontrol et
      const xpNeeded = (levels[userId].level + 1) * 100;
      
      if (levels[userId].xp >= xpNeeded) {
        levels[userId].level++;
        levels[userId].xp = levels[userId].xp - xpNeeded;

        // XP kanalını kontrol et
        const xpConfig = getXpConfig();
        const xpChannelId = xpConfig[message.guild.id]?.channelId;
        
        if (xpChannelId) {
          const xpChannel = message.guild.channels.cache.get(xpChannelId);
          
          if (xpChannel) {
            // Seviye atlama embed'i (fotoğraftaki gibi)
            const embed = new EmbedBuilder()
              .setColor('#ff4444')
              .setTitle('🔥 SEVİYE ATLADI!')
              .setDescription(`**${message.author.username}**\n\nSeviye ${levels[userId].level - 1} → **Seviye ${levels[userId].level}**`)
              .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
              .addFields(
                { name: 'SEVİYE', value: `${levels[userId].level}`, inline: true }
              )
              .setFooter({ text: `@${message.author.username}` })
              .setTimestamp();

            await xpChannel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
          }
        }
      }

      saveLevels(levels);
    }
  }

  // SA-AS SİSTEMİ
  if (content === 'sa' || content === 'selamünaleyküm' || content === 'selam') {
    await message.reply('**Aleyküm selam** kardeşim! 🙏');
  }

  // Z!XPYERI AYARLA
  if (content.startsWith('z!xpyeri ayarla') || content.startsWith('z!xpyeri')) {
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece owner kullanabilir!');
    }

    const xpConfig = getXpConfig();
    xpConfig[message.guild.id] = {
      channelId: message.channel.id,
      enabled: true
    };
    saveXpConfig(xpConfig);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ XP Yeri Ayarlandı')
      .setDescription(`Seviye atlama bildirimleri bu kanalda gösterilecek!\n\n**Kanal:** ${message.channel}`)
      .addFields(
        { name: '📊 Sistem', value: 'OwO tarzı XP sistemi aktif', inline: true },
        { name: '⏱️ Cooldown', value: '60 saniye', inline: true },
        { name: '💎 XP/Mesaj', value: '15-25 arası', inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // Z!DESTEKKATEGORI AYARLA
  if (content.startsWith('z!destekkategori ayarla') || content.startsWith('z!destekkategori')) {
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece owner kullanabilir!');
    }

    // Kanal kategorisini al
    const channel = message.channel;
    if (channel.parent) {
      const supportConfig = getSupportConfig();
      supportConfig[message.guild.id] = {
        categoryId: channel.parentId,
        categoryName: channel.parent.name
      };
      saveSupportConfig(supportConfig);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Destek Kategorisi Ayarlandı')
        .setDescription(`Destek kanalları **${channel.parent.name}** kategorisinde oluşturulacak!\n\n**Kategori ID:** ${channel.parentId}`)
        .addFields(
          { name: '📁 Kategori', value: channel.parent.name, inline: true },
          { name: '🔧 Durum', value: 'Aktif', inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } else {
      await message.reply('❌ Bu kanal bir kategori altında değil! Lütfen kategori içindeki bir kanalda bu komutu kullanın.');
    }
  }

  // Z!YREKLAMKUR - DESTEK TALEBİ SİSTEMİ
  if (content === 'z!yreklamkur') {
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece owner kullanabilir!');
    }

    // Butonları oluştur
    const button1 = new ButtonBuilder()
      .setCustomId('support_reklam')
      .setLabel('📦 Reklam paketleri hakkında bilgi alacağım.')
      .setStyle(ButtonStyle.Secondary);

    const button2 = new ButtonBuilder()
      .setCustomId('support_ceza')
      .setLabel('📝 Ceza itirazı yapacağım.')
      .setStyle(ButtonStyle.Secondary);

    const button3 = new ButtonBuilder()
      .setCustomId('support_cekilis')
      .setLabel('🎁 Çekiliş kazandım, ödülümü alacağım.')
      .setStyle(ButtonStyle.Secondary);

    const button4 = new ButtonBuilder()
      .setCustomId('support_soru')
      .setLabel('❓ Soru var, soru soracağım.')
      .setStyle(ButtonStyle.Secondary);

    const button5 = new ButtonBuilder()
      .setCustomId('support_discord')
      .setLabel('🔧 Discord hakkında sorun yaşıyorum.')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(button1);
    const row2 = new ActionRowBuilder().addComponents(button2);
    const row3 = new ActionRowBuilder().addComponents(button3);
    const row4 = new ActionRowBuilder().addComponents(button4);
    const row5 = new ActionRowBuilder().addComponents(button5);

    // Embed oluştur
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('🎫 SHDW Destek Sistemi')
      .setDescription('Aklınıza takılan ve sormak istediğin her sorunuz/sorununuz için destek talebi açabilirsiniz. Talep kategorilerini doğru seçiniz ve sorunuzu açık bir dil ile ifade ediniz. Yetkililer en kısa süre içerisinde dönüş sağlayacaktır. Bu süre zarfında beklediğiniz için teşekkürler.')
      .setFooter({ text: 'Talep açmak istediğiniz konuyu seçin.' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed], components: [row1, row2, row3, row4, row5] });
    await message.delete().catch(() => {});
  }

  // Z!YARDIM - KOMUT LİSTESİ
  if (content === 'z!yardım' || content === 'z!help' || content === 'z!komutlar') {
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('🤖 SHDW Bot - Komut Listesi')
      .setDescription('**Tüm komutlar ve özellikleri:**')
      .addFields(
        { name: '👤 KULLANICI KOMUTLARI', value: '`/profil` - Kullanıcı istatistikleri\n`/rank` - Seviye göster\n`/davetler` - Davet bilgileri', inline: false },
        { name: '📊 SUNUCU KOMUTLARI', value: '`/sunucu` - Sunucu bilgileri\n`/roller` - Rol listesi\n`/sıralama` - İstatistik sıralaması\n`/leaderboard` - En iyi 10 seviye', inline: false },
        { name: '🎫 DAVET SİSTEMİ', value: '`/davet-sıralama` - Davet sıralaması\n`/davetleri-sıfırla` - Davetleri sıfırla (Owner)', inline: false },
        { name: '🛠️ OWNER KOMUTLARI', value: '`z!yreklamkur` - Destek talebi sistemi kur\n`z!destekkategori ayarla` - Destek kategori ayarla\n`z!xpyeri ayarla` - XP bildirimi kanalı\n`/mesaj` - Sunuculara mesaj gönder\n`/kurucu` - Sunucu kurucusu', inline: false },
        { name: '⭐ XP SİSTEMİ', value: 'Her mesajda 15-25 XP kazan\n100 XP = 1 Seviye\nCooldown: 60 saniye', inline: false },
        { name: '💬 GENEL KOMUTLAR', value: '`sa` - Selam ver\n`z!yardım` - Bu menüyü göster\n`/ping` - Bot gecikmesi', inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'SHDW Bot v10.1 | OwO Tarzı XP Sistemi' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
});

// SLASH COMMANDS VE BUTTONLAR
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    if (interaction.isChatInputCommand()) {
      
      // PING KOMUTU
      if (commandName === 'ping') {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🏓 Pong!')
          .addFields(
            { name: '📶 Bot Gecikmesi', value: `${client.ws.ping}ms`, inline: true },
            { name: '⏱️ API Gecikmesi', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // SUNUCU KOMUTU
      else if (commandName === 'sunucu') {
        const embed = new EmbedBuilder()
          .setColor('#5865f2')
          .setTitle(`📋 ${interaction.guild.name} - Sunucu Bilgileri`)
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .addFields(
            { name: '👑 Sahip', value: `<@${interaction.guild.ownerId}>`, inline: true },
            { name: '👥 Üye Sayısı', value: `${interaction.guild.memberCount}`, inline: true },
            { name: '📅 Kuruluş', value: interaction.guild.createdAt.toLocaleDateString('tr-TR'), inline: true },
            { name: '💬 Kanal Sayısı', value: `${interaction.guild.channels.cache.size}`, inline: true },
            { name: '🎭 Rol Sayısı', value: `${interaction.guild.roles.cache.size}`, inline: true },
            { name: '🌍 Bölge', value: 'Otomatik', inline: true }
          )
          .setFooter({ text: `Sunucu ID: ${interaction.guild.id}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // PROFIL KOMUTU
      else if (commandName === 'profil') {
        const targetUser = interaction.options.getUser('kullanıcı') || user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`👤 ${targetUser.username} - Kullanıcı Profili`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏷️ Tag', value: `${targetUser.username}#${targetUser.discriminator}`, inline: true },
            { name: '🆔 ID', value: targetUser.id, inline: true },
            { name: '🤖 Bot mu?', value: targetUser.bot ? 'Evet' : 'Hayır', inline: true },
            { name: '📅 Discord\'a Katılma', value: targetUser.createdAt.toLocaleDateString('tr-TR'), inline: true },
            { name: '📅 Sunucuya Katılma', value: targetMember.joinedAt.toLocaleDateString('tr-TR'), inline: true },
            { name: '🎭 Roller', value: `${targetMember.roles.cache.size - 1} rol`, inline: true }
          )
          .setFooter({ text: `İstendi: ${user.username}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // RANK KOMUTU
      else if (commandName === 'rank') {
        const targetUser = interaction.options.getUser('kullanıcı') || user;
        const levels = getLevels();
        const userLevel = levels[targetUser.id] || { level: 1, xp: 0 };

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('📊 Seviye Bilgisi')
          .setDescription(`**${targetUser.username}** kullanıcısının seviyesi`)
          .addFields(
            { name: '⭐ Seviye', value: `${userLevel.level}`, inline: true },
            { name: '💎 XP', value: `${userLevel.xp}`, inline: true },
            { name: '🎯 Sonraki Seviye', value: `${(userLevel.level + 1) * 100} XP`, inline: true }
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // ROLLER KOMUTU
      else if (commandName === 'roller') {
        const roles = interaction.guild.roles.cache
          .filter(role => role.name !== '@everyone')
          .sort((a, b) => b.position - a.position)
          .map(role => `${role} - ${role.members.size} üye`)
          .slice(0, 25);

        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle('🎭 Sunucu Rolleri')
          .setDescription(roles.join('\n') || 'Rol bulunamadı')
          .setFooter({ text: `Toplam ${interaction.guild.roles.cache.size - 1} rol` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // KURUCU KOMUTU
      else if (commandName === 'kurucu') {
        const owner = await interaction.guild.fetchOwner();

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('👑 Sunucu Kurucusu')
          .setDescription(`**${owner.user.username}** bu sunucunun kurucusudur!`)
          .setThumbnail(owner.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${owner.user.id}>`, inline: true },
            { name: '🆔 ID', value: owner.user.id, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // LEADERBOARD KOMUTU
      else if (commandName === 'leaderboard') {
        const levels = getLevels();
        const sorted = Object.entries(levels)
          .sort(([,a], [,b]) => (b.level * 1000 + b.xp) - (a.level * 1000 + a.xp))
          .slice(0, 10);

        let description = '';
        for (let i = 0; i < sorted.length; i++) {
          const [userId, data] = sorted[i];
          try {
            const user = await client.users.fetch(userId);
            description += `**${i + 1}.** ${user.username} - Seviye ${data.level} (${data.xp} XP)\n`;
          } catch {
            description += `**${i + 1}.** Bilinmeyen Kullanıcı - Seviye ${data.level}\n`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#ffd700')
          .setTitle('🏆 Liderlik Tablosu')
          .setDescription(description || 'Henüz veri yok')
          .setFooter({ text: 'Sunucunun en iyi 10 seviyesi' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // DAVETLER KOMUTU
      else if (commandName === 'davetler') {
        const targetUser = interaction.options.getUser('kullanıcı') || user;
        const invites = getInvites();
        const userInvites = invites[targetUser.id] || { regular: 0, bonus: 0, fake: 0, left: 0 };
        const total = userInvites.regular + userInvites.bonus - userInvites.fake - userInvites.left;

        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle('🎫 Davet İstatistikleri')
          .setDescription(`**${targetUser.username}** kullanıcısının davet bilgileri`)
          .addFields(
            { name: '📊 Toplam Davet', value: `${total}`, inline: true },
            { name: '✅ Normal', value: `${userInvites.regular}`, inline: true },
            { name: '🎁 Bonus', value: `${userInvites.bonus}`, inline: true },
            { name: '❌ Sahte', value: `${userInvites.fake}`, inline: true },
            { name: '👋 Ayrıldı', value: `${userInvites.left}`, inline: true }
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // DAVET SIRALAMA KOMUTU
      else if (commandName === 'davet-sıralama') {
        const invites = getInvites();
        const sorted = Object.entries(invites)
          .map(([userId, data]) => ({
            userId,
            total: data.regular + data.bonus - data.fake - data.left
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        let description = '';
        for (let i = 0; i < sorted.length; i++) {
          try {
            const user = await client.users.fetch(sorted[i].userId);
            description += `**${i + 1}.** ${user.username} - ${sorted[i].total} davet\n`;
          } catch {
            description += `**${i + 1}.** Bilinmeyen - ${sorted[i].total} davet\n`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('📊 Davet Sıralaması')
          .setDescription(description || 'Henüz davet yok')
          .setFooter({ text: 'En çok davet eden 10 kişi' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // DAVETLERI SIFIRLA KOMUTU (SADECE OWNER)
      else if (commandName === 'davetleri-sıfırla') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        saveInvites({});
        
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🗑️ Davetler Sıfırlandı')
          .setDescription('Sunucudaki herkesin davet sayıları sıfırlandı!')
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // SIRALAMA KOMUTU
      else if (commandName === 'sıralama') {
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle('📈 Sunucu İstatistik Sıralaması')
          .setDescription('Sunucu istatistikleri')
          .addFields(
            { name: '👥 Toplam Üye', value: `${interaction.guild.memberCount}`, inline: true },
            { name: '📊 Çevrimiçi', value: `${interaction.guild.members.cache.filter(m => m.presence?.status !== 'offline').size}`, inline: true },
            { name: '🤖 Botlar', value: `${interaction.guild.members.cache.filter(m => m.user.bot).size}`, inline: true },
            { name: '💬 Kanallar', value: `${interaction.guild.channels.cache.size}`, inline: true },
            { name: '🎭 Roller', value: `${interaction.guild.roles.cache.size}`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // MESAJ GÖNDER KOMUTU (OWNER)
      else if (commandName === 'mesaj') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const serverName = interaction.options.getString('sunucu');
        const messageText = interaction.options.getString('mesaj');

        // Sunucuyu bul
        const guild = client.guilds.cache.find(g => g.name === serverName || g.id === serverName);

        if (!guild) {
          return await interaction.reply({ content: '❌ Sunucu bulunamadı!', ephemeral: true });
        }

        // İlk metin kanalını bul
        const channel = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages));

        if (!channel) {
          return await interaction.reply({ content: '❌ Mesaj gönderilebilecek kanal bulunamadı!', ephemeral: true });
        }

        try {
          await channel.send(messageText);

          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Mesaj Gönderildi')
            .setDescription(`**Sunucu:** ${guild.name}\n**Kanal:** ${channel.name}\n**Mesaj:** ${messageText}`)
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
          console.error('Mesaj gönderme hatası:', error);
          await interaction.reply({ content: '❌ Mesaj gönderilemedi!', ephemeral: true });
        }
      }
    }

    // AUTOCOMPLETE HANDLER - SUNUCU LİSTESİ
    else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'sunucu') {
        const choices = client.guilds.cache.map(guild => ({
          name: `${guild.name} (${guild.memberCount} üye)`,
          value: guild.id
        })).slice(0, 25);

        await interaction.respond(choices);
      }
    }

    // BUTTON HANDLER - DESTEK TALEBİ SİSTEMİ
    else if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith('support_')) {
        const category = customId.replace('support_', '');
        let categoryName = '';
        let categoryEmoji = '';

        switch(category) {
          case 'reklam':
            categoryName = 'Reklam Paketleri';
            categoryEmoji = '📦';
            break;
          case 'ceza':
            categoryName = 'Ceza İtirazı';
            categoryEmoji = '📝';
            break;
          case 'cekilis':
            categoryName = 'Çekiliş Ödülü';
            categoryEmoji = '🎁';
            break;
          case 'soru':
            categoryName = 'Genel Soru';
            categoryEmoji = '❓';
            break;
          case 'discord':
            categoryName = 'Discord Sorunu';
            categoryEmoji = '🔧';
            break;
        }

        try {
          // Destek konfigürasyonunu al
          const supportConfig = getSupportConfig();
          const guildConfig = supportConfig[interaction.guild.id];
          
          // Destek kanalı oluştur
          const channelOptions = {
            name: `${categoryEmoji}-${categoryName.toLowerCase()}-${user.username}`,
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
          };

          // Eğer kategori ayarlanmışsa, kategori altında oluştur
          if (guildConfig && guildConfig.categoryId) {
            channelOptions.parent = guildConfig.categoryId;
          }

          const supportChannel = await interaction.guild.channels.create(channelOptions);

          // Destek kanalına hoş geldin mesajı
          const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`${categoryEmoji} ${categoryName} - Destek Talebi`)
            .setDescription(`Merhaba ${user.username}!\n\n**Kategori:** ${categoryName}\n\n**Lütfen sorununuzu detaylı bir şekilde açıklayın.**\nYetkililer en kısa sürede size dönüş yapacaktır.`)
            .setFooter({ text: 'SHDW Destek Sistemi' })
            .setTimestamp();

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🗑️ Talebi Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(closeButton);

          await supportChannel.send({ content: `${user} <@${OWNER_ID}>`, embeds: [welcomeEmbed], components: [row] });

          await interaction.reply({ 
            content: `✅ Destek talebiniz oluşturuldu: ${supportChannel}`, 
            ephemeral: true 
          });

        } catch (error) {
          console.error('Destek kanalı oluşturma hatası:', error);
          await interaction.reply({ content: '❌ Destek kanalı oluşturulamadı!', ephemeral: true });
        }
      }

      // Ticket kapatma
      else if (customId === 'close_ticket') {
        await interaction.reply({ content: '⏳ Destek talebi 5 saniye içinde kapatılacak...', ephemeral: true });
        
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error('Kanal silme hatası:', error);
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
