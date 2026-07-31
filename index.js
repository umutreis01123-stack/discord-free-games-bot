require('dotenv').config();
const {
  Client, GatewayIntentBits, EmbedBuilder, ChannelType,
  PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder,
  ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  AttachmentBuilder, ActivityType
} = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
  SHDW TICKET BOT v2.0
  - Profesyonel Ticket Sistemi
  - Şikayet Sistemi (Modal Form)
  - Staff Claim / Unclaim
  - Transcript (Kanal log kaydı)
  - Ticket Rating (1-5 yıldız)
  - Log Kanalı
  - Slash Komutlar: /ticket-kur, /ticket-ayarlar, /ticket-istatistik
=================================================================
*/

// ── Web server (Railway keep-alive) ──────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🌐 Web server: port ${PORT}`));

// ── Discord Client ────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Sabitler ─────────────────────────────────────────────────
const OWNER_ID = process.env.OWNER_ID || '1403495996138323989';
const COLOR = {
  BRAND:   0x5865F2,
  GREEN:   0x2ECC71,
  RED:     0xE74C3C,
  YELLOW:  0xF1C40F,
  ORANGE:  0xE67E22,
  DARK:    0x2C2F33,
};

// ── JSON Yardımcıları ─────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}

function readJSON(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) { try { fs.writeFileSync(fp, '{}'); } catch {} return {}; }
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return {}; }
}

function writeJSON(file, data) {
  try { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)); } catch (e) { console.error('[writeJSON]', e); }
}

// data/config.json   → guild ayarları
// data/tickets.json  → açık/kapalı ticket kayıtları
// data/stats.json    → istatistikler

// ── Config Helpers ────────────────────────────────────────────
function getConfig(guildId) {
  const cfg = readJSON('config.json');
  return cfg[guildId] || {};
}

function setConfig(guildId, data) {
  const cfg = readJSON('config.json');
  cfg[guildId] = { ...(cfg[guildId] || {}), ...data };
  writeJSON('config.json', cfg);
}

function getTickets() { return readJSON('tickets.json'); }
function saveTickets(d) { writeJSON('tickets.json', d); }
function getStats() { return readJSON('stats.json'); }

function bumpStat(guildId, key, amount = 1) {
  const s = getStats();
  if (!s[guildId]) s[guildId] = {};
  s[guildId][key] = (s[guildId][key] || 0) + amount;
  writeJSON('stats.json', s);
}

// ── Ticket numarası üret ──────────────────────────────────────
function nextTicketNumber(guildId) {
  const s = getStats();
  const n = ((s[guildId] || {}).totalCreated || 0) + 1;
  return String(n).padStart(4, '0');
}

// ── Transcript oluştur ────────────────────────────────────────
async function buildTranscript(channel, ticketData) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();
  const meta = TICKET_TYPES[ticketData?.type] || TICKET_TYPES.diger;

  let html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — ${channel.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#313338;color:#dbdee1;font-family:'gg sans','Noto Sans',Helvetica Neue,Helvetica,Arial,sans-serif;font-size:16px}
  .header{background:#1e1f22;padding:20px 32px;display:flex;align-items:center;gap:16px;border-bottom:2px solid #5865f2}
  .header img{width:52px;height:52px;border-radius:50%}
  .header-info h1{font-size:1.2rem;color:#fff;font-weight:700}
  .header-info p{font-size:.8rem;color:#949ba4;margin-top:3px}
  .badge{display:inline-block;background:#5865f2;color:#fff;font-size:.7rem;padding:2px 8px;border-radius:10px;margin-left:8px;vertical-align:middle}
  .badge.red{background:#ed4245}
  .badge.green{background:#2ecc71}
  .meta-bar{background:#2b2d31;padding:12px 32px;display:flex;gap:24px;flex-wrap:wrap;border-bottom:1px solid #3f4147}
  .meta-bar .item{font-size:.8rem;color:#949ba4}
  .meta-bar .item span{color:#dbdee1;font-weight:600}
  .messages{padding:16px 32px}
  .msg{display:flex;gap:12px;padding:2px 0;margin-bottom:4px;border-radius:4px}
  .msg:hover{background:#2e3035}
  .avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;margin-top:2px}
  .msg-body{flex:1;min-width:0}
  .msg-header{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
  .author{font-weight:600;color:#fff;font-size:.95rem}
  .author.bot{color:#5865f2}
  .timestamp{font-size:.72rem;color:#949ba4}
  .content{font-size:.9375rem;line-height:1.5;word-break:break-word;color:#dbdee1}
  .divider{border:none;border-top:1px solid #3f4147;margin:16px 0}
  .footer{background:#1e1f22;padding:16px 32px;text-align:center;font-size:.75rem;color:#949ba4;border-top:2px solid #3f4147}
</style>
</head>
<body>
<div class="header">
  <div class="header-info">
    <h1>#${channel.name} <span class="badge red">KAPATILDI</span></h1>
    <p>${meta.label} • Toplam ${sorted.filter(m => !m.author.bot).length} mesaj • Kapatılma: ${new Date().toLocaleString('tr-TR')}</p>
  </div>
</div>
<div class="meta-bar">
  <div class="item">Ticket ID: <span>${ticketData?.id || channel.name}</span></div>
  <div class="item">Kategori: <span>${meta.label}</span></div>
  <div class="item">Toplam Mesaj: <span>${sorted.length}</span></div>
</div>
<div class="messages">`;

  let lastAuthor = null;
  for (const msg of sorted) {
    const isSameAuthor = lastAuthor === msg.author.id;
    const time = msg.createdAt.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    if (!isSameAuthor) {
      html += `<div class="msg">
  <img class="avatar" src="${msg.author.displayAvatarURL({ size: 64, extension: 'png' })}">
  <div class="msg-body">
    <div class="msg-header">
      <span class="author${msg.author.bot ? ' bot' : ''}">${msg.author.username}${msg.author.bot ? ' [BOT]' : ''}</span>
      <span class="timestamp">${time}</span>
    </div>
    <div class="content">${msg.content ? msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') : msg.embeds.length ? '<em>[Embed]</em>' : '<em>[Dosya/Ekler]</em>'}</div>
  </div>
</div>`;
    } else {
      html += `<div class="msg" style="padding-left:52px;margin-top:-6px">
  <div class="content" style="font-size:.9375rem;line-height:1.5;color:#dbdee1">${msg.content ? msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') : msg.embeds.length ? '<em>[Embed]</em>' : '<em>[Dosya/Ekler]</em>'}</div>
</div>`;
    }
    lastAuthor = msg.author.id;
  }

  html += `</div>
<div class="footer">Bu transcript otomatik oluşturulmuştur • ${new Date().toLocaleString('tr-TR')}</div>
</body></html>`;
  return Buffer.from(html, 'utf8');
}

// ── Log gönder ────────────────────────────────────────────────
async function sendLog(guild, embed, files = []) {
  const cfg = getConfig(guild.id);
  if (!cfg.logChannelId) return;
  const ch = guild.channels.cache.get(cfg.logChannelId);
  if (ch) await ch.send({ embeds: [embed], files }).catch(() => {});
}

// ── Ticket kanalı oluştur ─────────────────────────────────────
async function createTicketChannel(guild, user, type, ticketNum, staffRoleId, categoryId) {
  // Bot'un kendi ID'sini al
  const botId = guild.members.me?.id || client.user.id;

  const overwrites = [
    // @everyone göremez
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    // Ticket sahibi görebilir, yazabilir
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    // Bot her şeyi yapabilmeli
    {
      id: botId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  // Staff rolü varsa ekle
  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  const channelOptions = {
    name: `ticket-${ticketNum}`,
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
    topic: `Ticket sahibi: ${user.tag} | Tür: ${type} | ID: ${user.id}`,
  };

  // Kategori varsa ve geçerliyse ekle
  if (categoryId) {
    const cat = guild.channels.cache.get(categoryId);
    if (cat && cat.type === ChannelType.GuildCategory) {
      channelOptions.parent = categoryId;
    }
  }

  return guild.channels.create(channelOptions);
}

// ── Ticket içi buton satırı ───────────────────────────────────
function ticketActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('📌 Üstlen').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Kapat').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('📄 Transcript').setStyle(ButtonStyle.Secondary),
  );
}

// ── Ticket türü metadata ──────────────────────────────────────
const TICKET_TYPES = {
  destek:    { label: '❓ Genel Destek',       color: COLOR.BRAND,  emoji: '❓' },
  sikayet:   { label: '📢 Şikayet',            color: COLOR.RED,    emoji: '📢' },
  oneri:     { label: '💡 Öneri',              color: COLOR.YELLOW, emoji: '💡' },
  odeme:     { label: '💳 Ödeme / Satın Alma', color: COLOR.GREEN,  emoji: '💳' },
  itiraz:    { label: '⚖️ Ceza İtirazı',       color: COLOR.ORANGE, emoji: '⚖️' },
  diger:     { label: '📋 Diğer',              color: COLOR.DARK,   emoji: '📋' },
};

// ── BOT READY ─────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} aktif`);
  console.log(`📊 ${client.guilds.cache.size} sunucuda çalışıyor`);

  const commands = [
    new SlashCommandBuilder()
      .setName('ticket-kur')
      .setDescription('🎫 Ticket açma panelini bu kanala gönderir')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName('ticket-ayarlar')
      .setDescription('⚙️ Ticket bot ayarlarını yapılandır')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption(o => o.setName('staff-rol').setDescription('Ticket yetkilileri rolü').setRequired(false))
      .addChannelOption(o => o.setName('log-kanal').setDescription('Log mesajlarının gönderileceği kanal').setRequired(false))
      .addChannelOption(o => o.setName('kategori').setDescription('Ticket kanallarının açılacağı kategori').setRequired(false)),

    new SlashCommandBuilder()
      .setName('ticket-istatistik')
      .setDescription('📊 Ticket istatistiklerini gösterir'),

    new SlashCommandBuilder()
      .setName('ticket-kapat')
      .setDescription('🔒 Bulunduğunuz ticket\'ı kapatır'),

    new SlashCommandBuilder()
      .setName('ticket-ekle')
      .setDescription('➕ Ticket\'a kullanıcı ekle')
      .addUserOption(o => o.setName('kullanıcı').setDescription('Eklenecek kullanıcı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ticket-çıkar')
      .setDescription('➖ Ticket\'tan kullanıcı çıkar')
      .addUserOption(o => o.setName('kullanıcı').setDescription('Çıkarılacak kullanıcı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ticketsorumlusu')
      .setDescription('👮 Ticket sorumlusu rolünü ayarla')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption(o => o.setName('rol').setDescription('Ticket sorumlusu rolü').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('🏓 Bot gecikmesini gösterir'),
  ];

  await client.application.commands.set(commands).catch(console.error);
  console.log(`✅ ${commands.length} slash komut yüklendi`);
  client.user.setActivity('🎫 Ticket Bot | /ticket-kur', { type: ActivityType.Watching });
});

// ── INTERACTION HANDLER ───────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  try {
    // ── Slash komutlar ────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const { commandName, guild, user } = interaction;

      // /ping
      if (commandName === 'ping') {
        const embed = new EmbedBuilder()
          .setColor(COLOR.GREEN)
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Bot Gecikmesi', value: `\`${client.ws.ping}ms\``, inline: true },
            { name: 'API Gecikmesi', value: `\`${Date.now() - interaction.createdTimestamp}ms\``, inline: true },
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // /ticketsorumlusu
      if (commandName === 'ticketsorumlusu') {
        const rol = interaction.options.getRole('rol');
        setConfig(guild.id, { staffRoleId: rol.id });
        const embed = new EmbedBuilder()
          .setColor(COLOR.GREEN)
          .setTitle('✅ Ticket Sorumlusu Rolü Ayarlandı')
          .setDescription(`👮 **${rol.name}** rolü artık ticket sorumlusudur.\n\nBu role sahip kişiler:\n- Ticketları üstlenebilir\n- Ticketları kapatabilir\n- Transcript alabilir`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // /ticket-ayarlar
      if (commandName === 'ticket-ayarlar') {
        const staffRole    = interaction.options.getRole('staff-rol');
        const logChannel   = interaction.options.getChannel('log-kanal');
        const category     = interaction.options.getChannel('kategori');

        const updates = {};
        if (staffRole)  updates.staffRoleId    = staffRole.id;
        if (logChannel) updates.logChannelId   = logChannel.id;
        if (category)   updates.categoryId     = category.id;

        if (Object.keys(updates).length === 0) {
          const cfg = getConfig(guild.id);
          const embed = new EmbedBuilder()
            .setColor(COLOR.BRAND)
            .setTitle('⚙️ Mevcut Ayarlar')
            .addFields(
              { name: '👮 Staff Rolü',   value: cfg.staffRoleId  ? `<@&${cfg.staffRoleId}>` : 'Ayarlanmamış', inline: true },
              { name: '📋 Log Kanalı',   value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Ayarlanmamış', inline: true },
              { name: '📁 Kategori',     value: cfg.categoryId   ? `<#${cfg.categoryId}>`   : 'Ayarlanmamış', inline: true },
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        setConfig(guild.id, updates);
        const embed = new EmbedBuilder()
          .setColor(COLOR.GREEN)
          .setTitle('✅ Ayarlar Güncellendi')
          .setDescription(Object.entries(updates).map(([k, v]) => `**${k}:** \`${v}\``).join('\n'))
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // /ticket-kur
      if (commandName === 'ticket-kur') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket_open_select')
          .setPlaceholder('📂 Ticket türünü seç...')
          .addOptions(
            Object.entries(TICKET_TYPES).map(([value, { label }]) =>
              new StringSelectMenuOptionBuilder().setLabel(label).setValue(value)
            )
          );

        const embed = new EmbedBuilder()
          .setColor(COLOR.BRAND)
          .setTitle('🎫 Destek & Şikayet Merkezi')
          .setDescription(
            '**Yardıma mı ihtiyacın var?**\n\n' +
            'Aşağıdaki menüden uygun kategoriyi seçerek ticket açabilirsin.\n' +
            'Yetkililer en kısa sürede sana dönüş yapacaktır.\n\n' +
            '❓ **Genel Destek** — Her türlü sorun\n' +
            '📢 **Şikayet** — Kullanıcı/yetkili şikayeti\n' +
            '💡 **Öneri** — Sunucu için fikir/öneri\n' +
            '💳 **Ödeme / Satın Alma** — Ödeme sorunları\n' +
            '⚖️ **Ceza İtirazı** — Ban/mute itirazı\n' +
            '📋 **Diğer** — Diğer konular'
          )
          .setFooter({ text: guild.name + ' • Destek Sistemi' })
          .setTimestamp();

        await interaction.channel.send({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(menu)],
        });
        return interaction.reply({ content: '✅ Panel gönderildi.', ephemeral: true });
      }

      // /ticket-istatistik
      if (commandName === 'ticket-istatistik') {
        const s = (getStats())[guild.id] || {};
        const embed = new EmbedBuilder()
          .setColor(COLOR.BRAND)
          .setTitle('📊 Ticket İstatistikleri')
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .addFields(
            { name: '📬 Toplam Açılan',   value: `${s.totalCreated  || 0}`, inline: true },
            { name: '🔒 Kapatılan',        value: `${s.totalClosed   || 0}`, inline: true },
            { name: '📄 Transcript',       value: `${s.transcripts   || 0}`, inline: true },
            { name: '⭐ Ort. Puan',        value: s.ratingCount ? `${(s.ratingTotal / s.ratingCount).toFixed(1)}/5` : 'Henüz yok', inline: true },
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      // /ticket-ekle
      if (commandName === 'ticket-ekle') {
        const target = interaction.options.getUser('kullanıcı');
        await interaction.channel.permissionOverwrites.edit(target.id, {
          ViewChannel: true, SendMessages: true,
        });
        return interaction.reply({ content: `✅ **${target.username}** ticketa eklendi.`, ephemeral: false });
      }

      // /ticket-çıkar
      if (commandName === 'ticket-çıkar') {
        const target = interaction.options.getUser('kullanıcı');
        await interaction.channel.permissionOverwrites.edit(target.id, {
          ViewChannel: false, SendMessages: false,
        });
        return interaction.reply({ content: `✅ **${target.username}** tickettan çıkarıldı.`, ephemeral: false });
      }

      // /ticket-kapat
      if (commandName === 'ticket-kapat') {
        const tickets = getTickets();
        const ticketData = Object.values(tickets).find(t => t.channelId === interaction.channel.id && t.status === 'open');
        if (!ticketData) return interaction.reply({ content: '❌ Bu bir ticket kanalı değil.', ephemeral: true });
        await interaction.reply({ content: '⏳ Ticket kapatılıyor...', ephemeral: true });
        await closeTicket(interaction.channel, guild, ticketData, user);
      }
    }

    // ── Select Menu — ticket tür seçimi ──────────────────────
    else if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_open_select') {
      const type = interaction.values[0];
      const { guild, user } = interaction;

      // Açık ticket var mı kontrol et
      const tickets = getTickets();
      const existing = Object.values(tickets).find(
        t => t.userId === user.id && t.guildId === guild.id && t.status === 'open'
      );
      if (existing) {
        return interaction.reply({
          content: `❌ Zaten açık bir ticket'ın var: <#${existing.channelId}>\nÖnce onu kapat.`,
          ephemeral: true,
        });
      }

      if (type === 'sikayet') {
        // Şikayet için Modal aç
        const modal = new ModalBuilder()
          .setCustomId('sikayet_modal')
          .setTitle('📢 Şikayet Formu');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('sikayet_kisi')
              .setLabel('Şikayet ettiğin kişinin adı / ID')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('sikayet_konu')
              .setLabel('Şikayet konusu')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(200)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('sikayet_aciklama')
              .setLabel('Olayı detaylıca anlat')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMinLength(20)
              .setMaxLength(1000)
          ),
        );
        return interaction.showModal(modal);
      }

      // Diğer türler için direkt ticket aç
      await interaction.deferReply({ ephemeral: true });
      await openTicket({ guild, user, type, interaction, deferred: true });
    }

    // ── Modal Submit — şikayet ────────────────────────────────
    else if (interaction.isModalSubmit() && interaction.customId === 'sikayet_modal') {
      const { guild, user } = interaction;
      const kisi      = interaction.fields.getTextInputValue('sikayet_kisi');
      const konu      = interaction.fields.getTextInputValue('sikayet_konu');
      const aciklama  = interaction.fields.getTextInputValue('sikayet_aciklama');

      await interaction.deferReply({ ephemeral: true });
      await openTicket({ guild, user, type: 'sikayet', interaction, extra: { kisi, konu, aciklama }, deferred: true });
    }

    // ── Butonlar ──────────────────────────────────────────────
    else if (interaction.isButton()) {
      const { customId, guild, user, channel } = interaction;

      // ── Claim ─────────────────────────────────────────────
      if (customId === 'ticket_claim') {
        const tickets = getTickets();
        const ticketData = Object.values(tickets).find(t => t.channelId === channel.id);
        if (!ticketData) return interaction.reply({ content: '❌ Ticket verisi bulunamadı.', ephemeral: true });

        // Sadece ticket sorumlusu rolüne sahip olanlar üstlenebilir
        const cfg = getConfig(guild.id);
        if (cfg.staffRoleId) {
          const member = await guild.members.fetch(user.id).catch(() => null);
          if (!member || !member.roles.cache.has(cfg.staffRoleId)) {
            return interaction.reply({
              content: `❌ Sadece <@&${cfg.staffRoleId}> rolüne sahip kişiler ticket üstlenebilir.`,
              ephemeral: true,
            });
          }
        }

        if (ticketData.claimedBy) {
          return interaction.reply({
            content: `❌ Bu ticket zaten <@${ticketData.claimedBy}> tarafından üstlenildi.`,
            ephemeral: true,
          });
        }

        ticketData.claimedBy = user.id;
        tickets[ticketData.id] = ticketData;
        saveTickets(tickets);

        const embed = new EmbedBuilder()
          .setColor(COLOR.GREEN)
          .setDescription(`📌 **${user.username}** bu ticketi üstlendi.`)
          .setTimestamp();

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('📌 Bırak').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Kapat').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_transcript').setLabel('📄 Transcript').setStyle(ButtonStyle.Secondary),
        );

        await interaction.update({ components: [newRow] });
        await channel.send({ embeds: [embed] });
      }

      // ── Unclaim ───────────────────────────────────────────
      else if (customId === 'ticket_unclaim') {
        const tickets = getTickets();
        const ticketData = Object.values(tickets).find(t => t.channelId === channel.id);
        if (!ticketData) return interaction.reply({ content: '❌ Ticket verisi bulunamadı.', ephemeral: true });

        ticketData.claimedBy = null;
        tickets[ticketData.id] = ticketData;
        saveTickets(tickets);

        await interaction.update({ components: [ticketActionRow()] });
        await channel.send({ embeds: [new EmbedBuilder().setColor(COLOR.YELLOW).setDescription(`📌 **${user.username}** ticketi bıraktı.`).setTimestamp()] });
      }

      // ── Ticket kapat ──────────────────────────────────────
      else if (customId === 'ticket_close') {
        const tickets = getTickets();
        const ticketData = Object.values(tickets).find(t => t.channelId === channel.id && t.status === 'open');
        if (!ticketData) return interaction.reply({ content: '❌ Bu kanal aktif bir ticket değil.', ephemeral: true });

        // Ticket sahibi veya sorumlu rolü kapatabilir
        const cfg = getConfig(guild.id);
        const isOwner = ticketData.userId === user.id;
        const member = await guild.members.fetch(user.id).catch(() => null);
        const isStaff = cfg.staffRoleId && member?.roles.cache.has(cfg.staffRoleId);
        if (!isOwner && !isStaff && !member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({ content: '❌ Ticketı sadece ticket sahibi veya sorumlular kapatabilir.', ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Ticket kapatılıyor, transcript alınıyor...', ephemeral: false });
        await closeTicket(channel, guild, ticketData, user);
      }

      // ── Transcript al ─────────────────────────────────────
      else if (customId === 'ticket_transcript') {
        await interaction.deferReply({ ephemeral: true });
        try {
          const buf  = await buildTranscript(channel, Object.values(getTickets()).find(t => t.channelId === channel.id));
          const file = new AttachmentBuilder(buf, { name: `yazismalar-${channel.name}.html` });
          await interaction.editReply({ content: '📄 Transcript hazır, dosyayı indirip tarayıcıda açabilirsin:', files: [file] });
          bumpStat(guild.id, 'transcripts');
        } catch (e) {
          console.error(e);
          await interaction.editReply({ content: '❌ Transcript alınamadı.' });
        }
      }

      // ── Rating butonları ──────────────────────────────────
      else if (customId.startsWith('rate_')) {
        const stars = parseInt(customId.split('_')[1]);
        const tickets = getTickets();
        const ticketData = Object.values(tickets).find(t => t.ratingChannelId === channel.id);
        if (!ticketData) return interaction.reply({ content: '❌ Geçersiz.', ephemeral: true });

        const s = getStats();
        if (!s[guild.id]) s[guild.id] = {};
        s[guild.id].ratingTotal = (s[guild.id].ratingTotal || 0) + stars;
        s[guild.id].ratingCount = (s[guild.id].ratingCount || 0) + 1;
        writeJSON('stats.json', s);

        const starsStr = '⭐'.repeat(stars) + '✩'.repeat(5 - stars);
        await interaction.update({
          content: `✅ **${stars}/5** puan verdin! ${starsStr}\nGeri bildiriminiz için teşekkürler.`,
          components: [],
        });
      }
    }

  } catch (err) {
    console.error('[Interaction Hatası]', err);
    const msg = { content: '❌ Beklenmeyen bir hata oluştu.', ephemeral: true };
    if (interaction.deferred) interaction.editReply(msg).catch(() => {});
    else if (!interaction.replied) interaction.reply(msg).catch(() => {});
  }
});

// ── openTicket ────────────────────────────────────────────────
async function openTicket({ guild, user, type, interaction, extra = {}, deferred = false }) {
  // Eğer daha önce defer edilmediyse et
  if (!deferred && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
  }
  const cfg      = getConfig(guild.id);
  const ticketNum = nextTicketNumber(guild.id);
  const ticketId  = `${guild.id}-${ticketNum}`;
  const meta      = TICKET_TYPES[type] || TICKET_TYPES.diger;

  let ch;
  try {
    ch = await createTicketChannel(guild, user, type, ticketNum, cfg.staffRoleId, cfg.categoryId);
  } catch (e) {
    console.error('[Kanal Oluşturma Hatası]', e.message || e);
    const errMsg = `❌ Kanal oluşturulamadı.\n\n**Hata:** \`${e.message || 'Bilinmeyen hata'}\`\n\nBotun **Kanalları Yönet** ve **Kanalları Görüntüle** yetkisi var mı kontrol et.`;
    try { return await interaction.editReply({ content: errMsg }); } catch { return; }
  }

  // Ticket verisini kaydet
  const tickets = getTickets();
  tickets[ticketId] = {
    id: ticketId,
    guildId: guild.id,
    userId: user.id,
    channelId: ch.id,
    type,
    status: 'open',
    claimedBy: null,
    openedAt: Date.now(),
    extra,
  };
  saveTickets(tickets);
  bumpStat(guild.id, 'totalCreated');

  // Hoşgeldin embed
  const openEmbed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${meta.label} — #${ticketNum}`)
    .setDescription(
      `Merhaba ${user}! 👋\n\n` +
      `**Ticket ID:** \`${ticketId}\`\n` +
      `**Kategori:** ${meta.label}\n` +
      `**Açılış:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
      (extra.konu ? `**Konu:** ${extra.konu}\n` : '') +
      (extra.kisi ? `**Şikayet Edilen:** ${extra.kisi}\n` : '') +
      (extra.aciklama ? `\n📝 **Açıklama:**\n${extra.aciklama}\n\n` : '\n') +
      `Lütfen sorununuzu **detaylıca** açıklayın.\nYetkililer en kısa sürede dönüş yapacaktır.`
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${guild.name} • Destek Sistemi` })
    .setTimestamp();

  const mention = cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : '';
  await ch.send({ content: `${user} ${mention}`, embeds: [openEmbed], components: [ticketActionRow()] });

  // Log
  const logEmbed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle('🎫 Yeni Ticket Açıldı')
    .addFields(
      { name: 'Kullanıcı', value: `${user} (\`${user.id}\`)`, inline: true },
      { name: 'Kategori',  value: meta.label,                  inline: true },
      { name: 'Kanal',     value: `${ch}`,                     inline: true },
      { name: 'Ticket ID', value: `\`${ticketId}\``,           inline: true },
    )
    .setTimestamp();
  await sendLog(guild, logEmbed);

  await interaction.editReply({ content: `✅ Ticket açıldı: ${ch}` });
}

// ── closeTicket ───────────────────────────────────────────────
async function closeTicket(channel, guild, ticketData, closedBy) {
  const tickets = getTickets();
  ticketData.status    = 'closed';
  ticketData.closedAt  = Date.now();
  ticketData.closedBy  = closedBy.id;
  tickets[ticketData.id] = ticketData;
  saveTickets(tickets);
  bumpStat(guild.id, 'totalClosed');

  const meta = TICKET_TYPES[ticketData.type] || TICKET_TYPES.diger;

  // Transcript
  let transcriptBuf;
  try { transcriptBuf = await buildTranscript(channel, ticketData); } catch (e) { console.error('[Transcript]', e); }

  // Kullanıcıya DM
  const ticketOwner = await client.users.fetch(ticketData.userId).catch(() => null);
  if (ticketOwner) {
    const dmEmbed = new EmbedBuilder()
      .setColor(COLOR.RED)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
      .setTitle('🔒 Ticketınız Kapatıldı')
      .setDescription(
        `Merhaba **${ticketOwner.username}**,\n\n` +
        `**${guild.name}** sunucusundaki ticketın kapatıldı.\n\n` +
        `> 📂 **Kategori:** ${meta.label}\n` +
        `> 👤 **Kapatan:** ${closedBy.username}\n` +
        `> 🕐 **Kapatılma:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `📎 Yazışmalarınıza bakmak için aşağıdaki **transcript dosyasını** indirebilirsiniz.\n` +
        `Dosyayı indirip tarayıcınızda açarak tüm yazışmaları görüntüleyebilirsiniz.\n\n` +
        `Başka bir sorunuz olursa sunucumuza gelerek yeni ticket açabilirsiniz.`
      )
      .setThumbnail(guild.iconURL({ dynamic: true }) ?? null)
      .setFooter({ text: `${guild.name} • Destek Sistemi`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    const dmPayload = { embeds: [dmEmbed] };
    if (transcriptBuf) {
      dmPayload.files = [new AttachmentBuilder(transcriptBuf, { name: `yazismalar-${channel.name}.html` })];
    }
    await ticketOwner.send(dmPayload).catch(() => {});
  }

  // Rating mesajı ticketa gönder
  const ratingRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rate_1').setLabel('1⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rate_2').setLabel('2⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rate_3').setLabel('3⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rate_4').setLabel('4⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rate_5').setLabel('5⭐').setStyle(ButtonStyle.Primary),
  );

  // ratingChannelId geçici olarak kaydet (rating butonu için)
  ticketData.ratingChannelId = channel.id;
  tickets[ticketData.id] = ticketData;
  saveTickets(tickets);

  try {
    await channel.send({
      content: `${ticketOwner || ''} Desteği nasıl buldun? Lütfen puan ver:`,
      components: [ratingRow],
    });
  } catch {}

  // Log
  const logEmbed = new EmbedBuilder()
    .setColor(COLOR.RED)
    .setTitle('🔒 Ticket Kapatıldı')
    .addFields(
      { name: 'Kullanıcı',  value: ticketOwner ? `${ticketOwner} (\`${ticketData.userId}\`)` : `\`${ticketData.userId}\``, inline: true },
      { name: 'Kategori',   value: meta.label,     inline: true },
      { name: 'Ticket ID',  value: `\`${ticketData.id}\``, inline: true },
      { name: 'Kapatan',    value: `${closedBy}`,  inline: true },
      { name: 'Süre',       value: `<t:${Math.floor(ticketData.openedAt / 1000)}:R>'den beri`, inline: true },
    )
    .setTimestamp();

  const logPayload = { embeds: [logEmbed] };
  if (transcriptBuf) logPayload.files = [new AttachmentBuilder(transcriptBuf, { name: `yazismalar-${channel.name}.html` })];
  await sendLog(guild, logEmbed, logPayload.files || []);

  // 10 saniye bekle, sonra sil
  setTimeout(async () => {
    await channel.delete().catch(() => {});
  }, 10_000);
}

// ── Bot Login ─────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Login hatası:', err);
  process.exit(1);
});
