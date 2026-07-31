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
async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Transcript - ${channel.name}</title>
<style>
  body{background:#36393f;color:#dcddde;font-family:Whitney,Helvetica Neue,sans-serif;padding:20px}
  .msg{display:flex;gap:12px;padding:4px 0 4px 0;margin-bottom:2px}
  .avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0}
  .meta{font-size:.75rem;color:#72767d;margin-bottom:2px}
  .username{color:#fff;font-weight:600;margin-right:6px}
  .content{font-size:.9375rem;line-height:1.375}
  h2{color:#fff;border-bottom:1px solid #4f545c;padding-bottom:8px}
</style></head><body>
<h2>#${channel.name} — Transcript</h2>
<p style="color:#72767d">Toplam ${sorted.length} mesaj</p>`;

  for (const msg of sorted) {
    if (msg.author.bot && msg.embeds.length && !msg.content) continue;
    const time = msg.createdAt.toLocaleString('tr-TR');
    html += `<div class="msg">
  <img class="avatar" src="${msg.author.displayAvatarURL({ size: 64 })}">
  <div>
    <div class="meta"><span class="username">${msg.author.username}</span>${time}</div>
    <div class="content">${msg.content.replace(/</g,'&lt;').replace(/>/g,'&gt;') || '<em>[embed/attachment]</em>'}</div>
  </div></div>`;
  }
  html += '</body></html>';
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

        await interaction.reply({ content: '⏳ Ticket kapatılıyor, transcript alınıyor...', ephemeral: false });
        await closeTicket(channel, guild, ticketData, user);
      }

      // ── Transcript al ─────────────────────────────────────
      else if (customId === 'ticket_transcript') {
        await interaction.deferReply({ ephemeral: true });
        try {
          const buf  = await buildTranscript(channel);
          const file = new AttachmentBuilder(buf, { name: `transcript-${channel.name}.html` });
          await interaction.editReply({ content: '📄 Transcript:', files: [file] });
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
  try { transcriptBuf = await buildTranscript(channel); } catch {}

  // Kullanıcıya DM
  const ticketOwner = await client.users.fetch(ticketData.userId).catch(() => null);
  if (ticketOwner) {
    const dmEmbed = new EmbedBuilder()
      .setColor(COLOR.RED)
      .setTitle('🔒 Ticket Kapatıldı')
      .setDescription(
        `**${guild.name}** sunucusundaki ticket'ın kapatıldı.\n\n` +
        `**Kategori:** ${meta.label}\n` +
        `**Kapatıldı:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
        `**Kapatan:** ${closedBy.username}\n\n` +
        `Transcript aşağıda ektedir. Başka sorun için sunucuya dönebilirsin.`
      )
      .setTimestamp();

    const dmPayload = { embeds: [dmEmbed] };
    if (transcriptBuf) dmPayload.files = [new AttachmentBuilder(transcriptBuf, { name: `transcript-${channel.name}.html` })];
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
  if (transcriptBuf) logPayload.files = [new AttachmentBuilder(transcriptBuf, { name: `transcript-${channel.name}.html` })];
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
