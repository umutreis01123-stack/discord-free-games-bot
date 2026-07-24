require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
MCTR BOT v10.0 - YENİ DESTEK SİSTEMİ
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

function initFiles() {
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(invitesFile)) fs.writeFileSync(invitesFile, JSON.stringify({}));
  if (!fs.existsSync(levelsFile)) fs.writeFileSync(levelsFile, JSON.stringify({}));
  if (!fs.existsSync(invoicesFile)) fs.writeFileSync(invoicesFile, JSON.stringify({}));
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
        .setName('fatura-oluştur')
        .setDescription('🧾 Yeni bir fatura oluşturur'),

      new SlashCommandBuilder()
        .setName('kurucu')
        .setDescription('👑 Sunucunun kurucusunu gösterir'),

      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Sunucunun en iyi 10 seviyesini listeler'),

      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Botun gecikme süresini gösterir'),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
    // Bot activity status ayarla
    client.user.setActivity('z!yardım | MCTR Bot', { type: 0 });
    console.log('🎮 Bot aktivitesi ayarlandı');
    console.log('🚀 MCTR Bot v10.0 tamamen hazır!');
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

// MESAJ KOMUTLARI
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // SA-AS SİSTEMİ
  if (content === 'sa' || content === 'selamünaleyküm' || content === 'selam') {
    await message.reply('**Aleyküm selam** kardeşim! 🙏');
  }

  // Z!YARDIM - KOMUT LİSTESİ
  if (content === 'z!yardım' || content === 'z!help' || content === 'z!komutlar') {
    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('🤖 MCTR Bot - Komut Listesi')
      .setDescription('**Tüm komutlar ve özellikleri:**')
      .addFields(
        { name: '👤 KULLANICI KOMUTLARI', value: '`/profil` - Kullanıcı istatistikleri\n`/rank` - Seviye göster\n`/davetler` - Davet bilgileri', inline: false },
        { name: '📊 SUNUCU KOMUTLARI', value: '`/sunucu` - Sunucu bilgileri\n`/roller` - Rol listesi\n`/sıralama` - İstatistik sıralaması\n`/leaderboard` - En iyi 10 seviye', inline: false },
        { name: '🎫 DAVET SİSTEMİ', value: '`/davet-sıralama` - Davet sıralaması\n`/davetleri-sıfırla` - Davetleri sıfırla', inline: false },
        { name: '🛠️ DİĞER', value: '`/kurucu` - Sunucu kurucusu\n`/fatura-oluştur` - Yeni fatura\n`/ping` - Bot gecikmesi', inline: false },
        { name: '💬 GENEL KOMUTLAR', value: '`sa` - Selam ver\n`z!yardım` - Bu menüyü göster', inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'MCTR Bot v10.0' })
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

      // DAVETLERI SIFIRLA KOMUTU
      else if (commandName === 'davetleri-sıfırla') {
        if (user.id !== OWNER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return await interaction.reply({ content: '❌ Bu komutu kullanmak için yönetici olmalısınız!', ephemeral: true });
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

      // FATURA OLUŞTUR KOMUTU
      else if (commandName === 'fatura-oluştur') {
        if (user.id !== OWNER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return await interaction.reply({ content: '❌ Bu komutu kullanmak için yönetici olmalısınız!', ephemeral: true });
        }

        const invoiceId = `INV-${Date.now()}`;
        const invoices = getInvoices();
        invoices[invoiceId] = {
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };
        saveInvoices(invoices);

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🧾 Fatura Oluşturuldu')
          .setDescription(`**Fatura ID:** ${invoiceId}\n**Oluşturan:** ${user.username}\n**Durum:** Beklemede`)
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
