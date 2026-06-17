require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
const stockFile = './stock.json';
const countdownsFile = './countdowns.json';
const supportChannelsFile = './support-channels.json';
const pendingPaymentsFile = './pending-payments.json';

function initFiles() {
  if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, JSON.stringify({}));
  if (!fs.existsSync(stockFile)) fs.writeFileSync(stockFile, JSON.stringify({}));
  if (!fs.existsSync(countdownsFile)) fs.writeFileSync(countdownsFile, JSON.stringify({}));
  if (!fs.existsSync(supportChannelsFile)) fs.writeFileSync(supportChannelsFile, JSON.stringify({}));
  if (!fs.existsSync(pendingPaymentsFile)) fs.writeFileSync(pendingPaymentsFile, JSON.stringify({}));
}

function getTickets() {
  return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
}

function saveTickets(data) {
  fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
}

function getStock() {
  return JSON.parse(fs.readFileSync(stockFile, 'utf8'));
}

function saveStock(data) {
  fs.writeFileSync(stockFile, JSON.stringify(data, null, 2));
}

function getCountdowns() {
  return JSON.parse(fs.readFileSync(countdownsFile, 'utf8'));
}

function saveCountdowns(data) {
  fs.writeFileSync(countdownsFile, JSON.stringify(data, null, 2));
}

function getSupportChannels() {
  return JSON.parse(fs.readFileSync(supportChannelsFile, 'utf8'));
}

function saveSupportChannels(data) {
  fs.writeFileSync(supportChannelsFile, JSON.stringify(data, null, 2));
}

function getPendingPayments() {
  return JSON.parse(fs.readFileSync(pendingPaymentsFile, 'utf8'));
}

function savePendingPayments(data) {
  fs.writeFileSync(pendingPaymentsFile, JSON.stringify(data, null, 2));
}

initFiles();

// Bot ready
client.once('ready', () => {
  console.log('Bot logged in: ' + client.user.tag);
  console.log('Active in ' + client.guilds.cache.size + ' servers');
  updateBotStatus();
});

function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(serverCount + ' sunucuda aktif', { type: 3 });
}

client.on('guildCreate', () => {
  updateBotStatus();
  console.log('New guild joined! Total: ' + client.guilds.cache.size);
});

client.on('guildDelete', () => {
  updateBotStatus();
  console.log('Guild removed. Total: ' + client.guilds.cache.size);
});

// KOMUTLARI KURGULA
client.on('ready', async () => {
  try {
    console.log('Komutlar temizleniyor ve yenileniyor...');

    // Mevcut komutları temizle
    const allGlobalCommands = await client.application.commands.fetch();
    console.log('Siliniyor: ' + allGlobalCommands.size + ' komut');
    
    for (const command of allGlobalCommands.values()) {
      try {
        await command.delete();
        console.log('Silindi: ' + command.name);
      } catch (error) {
        console.error('Hata: ' + command.name);
      }
    }

    console.log('Sunucu komutlari temizleniyor...');
    for (const guild of client.guilds.cache.values()) {
      try {
        const guildCommands = await guild.commands.fetch();
        for (const cmd of guildCommands.values()) {
          try {
            await cmd.delete();
          } catch (error) {
            // skip
          }
        }
      } catch (error) {
        // skip
      }
    }

    // Yeni komutları ekle
    const commands = [
      new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket kanalı oluştur'),
      
      new SlashCommandBuilder()
        .setName('destekaç')
        .setDescription('Destek kanalı oluştur'),
      
      new SlashCommandBuilder()
        .setName('sunucuhakkındabilgi')
        .setDescription('Sunucu hakkında bilgileri göster'),
      
      new SlashCommandBuilder()
        .setName('rolver')
        .setDescription('Kullanıcıya rol ver')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Rol verilecek kullanıcı')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('rol')
            .setDescription('Verilecek rol')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('rolal')
        .setDescription('Kullanıcıdan rol al')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Rolü alınacak kullanıcı')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('rol')
            .setDescription('Alınacak rol')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('gerisayım')
        .setDescription('Geri sayım başlat')
        .addIntegerOption(option =>
          option.setName('dakika')
            .setDescription('Geri sayım dakikası')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(60)),
      
      new SlashCommandBuilder()
        .setName('owoileöde')
        .setDescription('OWO ile ödeme yap'),
    ];

    await client.application.commands.set(commands);
    console.log('Yeni komutlar eklendi: 7');
    
  } catch (error) {
    console.error('Komut hatasi:', error);
  }
});

// Yardımcı fonksiyonlar
function isOwner(userId) {
  return userId === OWNER_ID;
}

// SLASH KOMUT HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const { commandName, customId, user } = interaction;

  try {
    // BUTTON HANDLER
    if (interaction.isButton()) {
      // Ticket kapatma
      if (customId === 'close_ticket') {
        try {
          const channel = interaction.channel;
          const tickets = getTickets();
          
          console.log(`[TICKET] Kapatılıyor: ${channel.name}`);

          // Ticket verilerini güncelle
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
              console.log(`[TICKET] Kanal silindi: ${channel.name}`);
            } catch (error) {
              console.error('[TICKET] Kanal silme hatası:', error);
            }
          }, 5000);

        } catch (error) {
          console.error('[TICKET] Kapatma hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // Destek kapatma
      else if (customId.startsWith('close_support_')) {
        try {
          const channel = interaction.channel;
          const supportChannels = getSupportChannels();
          
          console.log(`[DESTEK] Kapatılıyor: ${channel.name}`);

          // Destek verilerini güncelle
          Object.keys(supportChannels).forEach(guildId => {
            if (supportChannels[guildId] && supportChannels[guildId][channel.id]) {
              delete supportChannels[guildId][channel.id];
            }
          });
          saveSupportChannels(supportChannels);

          const closeEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔒 Destek Kapatılıyor')
            .setDescription('Bu kanal 5 saniye sonra silinecek');

          await interaction.update({ embeds: [closeEmbed], components: [] });
          
          setTimeout(async () => {
            try {
              await channel.delete();
              console.log(`[DESTEK] Kanal silindi: ${channel.name}`);
            } catch (error) {
              console.error('[DESTEK] Kanal silme hatası:', error);
            }
          }, 5000);

        } catch (error) {
          console.error('[DESTEK] Kapatma hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // Destek talebi üstlenme
      else if (customId.startsWith('claim_support_')) {
        try {
          const userId = customId.split('_')[2];
          const claimedUser = await client.users.fetch(userId);
          const channel = interaction.channel;

          console.log(`[DESTEK] Üstlenildi: ${user.tag} tarafından - Talep: ${claimedUser.tag}`);

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
          console.error('[DESTEK] Üstlenme hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      // OWO ödeme confirm/reject
      else if (customId.startsWith('owo_confirm_') || customId.startsWith('owo_reject_')) {
        if (!isOwner(user.id)) {
          return await interaction.reply({ 
            content: 'Bu işlemi sadece bot sahibi yapabilir!', 
            ephemeral: true 
          });
        }

        const isConfirm = customId.startsWith('owo_confirm_');
        const paymentId = customId.split('_')[2];
        
        console.log(`[OWO] Ödeme ${isConfirm ? 'onaylandı' : 'reddedildi'}: ${paymentId}`);
        
        const pendingPayments = getPendingPayments();
        const payment = pendingPayments[paymentId];

        if (!payment) {
          console.log(`[OWO] Ödeme bulunamadı: ${paymentId}`);
          return await interaction.reply({ 
            content: 'Ödeme bulunamadı!', 
            ephemeral: true 
          });
        }

        if (isConfirm) {
          // Ödeme onaylandı - ürün gönder
          console.log(`[OWO] Ürün gönderiliyor...`);
          
          const stock = getStock();
          const selectedStock = stock[payment.stockId];

          if (!selectedStock) {
            console.log(`[OWO] Stok bulunamadı: ${payment.stockId}`);
            return await interaction.reply({ 
              content: 'Stok bulunamadı!', 
              ephemeral: true 
            });
          }

          if (!selectedStock.products || selectedStock.products.length === 0) {
            console.log(`[OWO] Stokta ürün yok`);
            return await interaction.reply({ 
              content: 'Stokta ürün yok!', 
              ephemeral: true 
            });
          }

          const randomProduct = selectedStock.products[Math.floor(Math.random() * selectedStock.products.length)];
          
          console.log(`[OWO] Seçilen ürün: ${randomProduct.name}`);
          
          try {
            const buyer = await client.users.fetch(payment.userId);
            
            const productEmbed = new EmbedBuilder()
              .setColor('#2ecc71')
              .setTitle('✅ Satın Alma Başarılı!')
              .setDescription('OWO ile ödemeniz onaylandı ve hesap bilgileri aşağıdadır')
              .addFields(
                { name: '📦 Ürün Adı', value: randomProduct.name || 'Bilinmiyor', inline: false },
                { name: '👤 Hesap Kullanıcı Adı', value: randomProduct.username || 'Yok', inline: true },
                { name: '🔑 Hesap Şifresi', value: randomProduct.password || 'Yok', inline: true }
              );

            if (randomProduct.link) {
              productEmbed.addFields({ name: '🔗 Bağlantı', value: randomProduct.link, inline: false });
            }
            if (randomProduct.description) {
              productEmbed.addFields({ name: '📝 Açıklama', value: randomProduct.description, inline: false });
            }

            await buyer.send({ embeds: [productEmbed] });
            console.log(`[OWO] Ürün DM ile gönderildi: ${buyer.tag}`);

            // Ürünü stoktan çıkar
            const productIndex = selectedStock.products.indexOf(randomProduct);
            if (productIndex > -1) {
              selectedStock.products.splice(productIndex, 1);
              saveStock(stock);
              console.log(`[OWO] Ürün stoktan çıkarıldı`);
            }

            const successEmbed = new EmbedBuilder()
              .setColor('#2ecc71')
              .setTitle('✅ Ödeme Onaylandı')
              .setDescription(`Ürün başarıyla ${buyer.tag} adlı kullanıcıya DM ile gönderildi`)
              .addFields(
                { name: 'Ürün', value: randomProduct.name, inline: true },
                { name: 'Kullanıcı', value: buyer.tag, inline: true },
                { name: 'İşlem Zamanı', value: new Date().toLocaleString('tr-TR'), inline: false }
              )
              .setTimestamp();

            await interaction.update({ embeds: [successEmbed], components: [] });

          } catch (error) {
            console.error('[OWO] DM gönderme hatası:', error);
            await interaction.reply({ 
              content: `❌ Hata: ${error.message}`, 
              ephemeral: true 
            });
          }
        } else {
          // Ödeme reddedildi
          console.log(`[OWO] Ödeme reddedildi`);
          
          const rejectEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Ödeme Reddedildi')
            .setDescription('OWO göndermediniz - İşlem iptal edildi');

          await interaction.update({ embeds: [rejectEmbed], components: [] });

          // Kullanıcıya bildir
          try {
            const buyer = await client.users.fetch(payment.userId);
            const notifyEmbed = new EmbedBuilder()
              .setColor('#e74c3c')
              .setTitle('❌ Ödemeniz Reddedildi')
              .setDescription('Gönderdiğiniz OWO kabul edilmedi. Lütfen tekrar deneyin.');
            
            await buyer.send({ embeds: [notifyEmbed] });
          } catch (error) {
            console.log('[OWO] Kullanıcıya bilgilendirme gönderilemedi');
          }
        }

        // Pending payment'ı sil
        delete pendingPayments[paymentId];
        savePendingPayments(pendingPayments);
      }
    }

    // SELECT MENU HANDLER
    else if (interaction.isStringSelectMenu() && customId.startsWith('stock_select_')) {
      const selectedStockId = interaction.values[0];
      const stock = getStock();
      const selectedStock = stock[selectedStockId];

      console.log(`[OWO] Stok seçildi: ${selectedStockId}`);

      if (!selectedStock) {
        return await interaction.reply({ 
          content: '❌ Stok bulunamadı!', 
          ephemeral: true 
        });
      }

      // Payment ID oluştur ve kaydet
      const paymentId = Date.now().toString() + '_' + user.id;
      const pendingPayments = getPendingPayments();
      pendingPayments[paymentId] = {
        userId: user.id,
        stockId: selectedStockId,
        credits: selectedStock.credits,
        timestamp: Date.now(),
        userName: user.tag
      };
      savePendingPayments(pendingPayments);

      console.log(`[OWO] Payment oluşturuldu - ID: ${paymentId}, Miktar: ${selectedStock.credits}`);

      const embed = new EmbedBuilder()
        .setColor('#f5576c')
        .setTitle('💳 OWO Ödeme Talimatı')
        .setDescription(`**${selectedStock.name}** için aşağıdaki komutu tam olarak yazın`)
        .addFields(
          { name: '📋 Ürün', value: selectedStock.name, inline: true },
          { name: '💰 Gerekli OWO', value: `**${selectedStock.credits} OWO**`, inline: true },
          { name: '✍️ Komut', value: `\`owo send 1403495996138323989 ${selectedStock.credits}\``, inline: false },
          { name: '⚠️ ÖNEMLİ', value: 'Yukardaki komutu **tam olarak** yazmalısınız!\nBoşluk, yazım hatası olmamalı!', inline: false }
        )
        .setFooter({ text: `Payment ID: ${paymentId}` })
        .setTimestamp();

      await interaction.update({ 
        embeds: [embed], 
        components: []
      });
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
            name: `ticket-${user.username}`,
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
            .setDescription(`Merhaba ${user.username}! Sorununuzu açıklayın. Umut Papa ticket'ı görecek.`)
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

      // DESTEK AÇ KOMUTU
      else if (commandName === 'destekaç') {
        const guild = interaction.guild;
        const supportChannels = getSupportChannels();
        
        if (!supportChannels[guild.id]) supportChannels[guild.id] = {};

        try {
          const supportChannel = await guild.channels.create({
            name: `destek-${user.username}`,
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

          supportChannels[guild.id][supportChannel.id] = {
            userId: user.id,
            createdAt: Date.now()
          };
          saveSupportChannels(supportChannels);

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
            .setTitle('📞 Destek Talebi Oluşturuldu')
            .setDescription(`${user.username} destek talep ediyor`)
            .addFields(
              { name: '👤 Talep Eden', value: user.tag, inline: true },
              { name: '⏰ Zaman', value: new Date().toLocaleString('tr-TR'), inline: true }
            )
            .setFooter({ text: 'Umut Papa destek talebinizi görecek' })
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

      // SUNUCU HAKKINDA BİLGİ KOMUTU
      else if (commandName === 'sunucuhakkındabilgi') {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('Sunucu Bilgileri')
          .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: 'Sunucu Adı', value: guild.name, inline: true },
            { name: 'Sunucu ID', value: guild.id, inline: true },
            { name: 'Üye Sayısı', value: guild.memberCount.toString(), inline: true },
            { name: 'Kanal Sayısı', value: guild.channels.cache.size.toString(), inline: true },
            { name: 'Rol Sayısı', value: guild.roles.cache.size.toString(), inline: true },
            { name: 'Sunucu Sahibi', value: owner.user.tag, inline: true },
            { name: 'Oluşturulma Tarihi', value: guild.createdAt.toLocaleDateString('tr-TR'), inline: true },
            { name: 'Doğrulama Seviyesi', value: guild.verificationLevel.toString(), inline: true }
          )
          .setFooter({ text: 'Sunucu Bilgileri' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // ROL VER KOMUTU
      else if (commandName === 'rolver') {
        if (!isOwner(user.id)) {
          return await interaction.reply({ 
            content: 'Bu komutu sadece bot sahibi kullanabilir!', 
            ephemeral: true 
          });
        }

        const targetUser = interaction.options.getUser('kullanıcı');
        const role = interaction.options.getRole('rol');
        
        try {
          const member = await interaction.guild.members.fetch(targetUser.id);
          
          if (member.roles.cache.has(role.id)) {
            return await interaction.reply({ 
              content: 'Bu kullanıcıda zaten bu rol var!', 
              ephemeral: true 
            });
          }

          await member.roles.add(role);
          
          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('Rol Verildi')
            .addFields(
              { name: 'Kullanıcı', value: targetUser.tag, inline: true },
              { name: 'Rol', value: role.name, inline: true },
              { name: 'Veren', value: user.tag, inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });

        } catch (error) {
          console.error('Rol verme hatası:', error);
          await interaction.reply({ content: 'Rol verilemedi!', ephemeral: true });
        }
      }

      // ROL AL KOMUTU
      else if (commandName === 'rolal') {
        if (!isOwner(user.id)) {
          return await interaction.reply({ 
            content: 'Bu komutu sadece bot sahibi kullanabilir!', 
            ephemeral: true 
          });
        }

        const targetUser = interaction.options.getUser('kullanıcı');
        const role = interaction.options.getRole('rol');
        
        try {
          const member = await interaction.guild.members.fetch(targetUser.id);
          
          if (!member.roles.cache.has(role.id)) {
            return await interaction.reply({ 
              content: 'Bu kullanıcıda bu rol yok!', 
              ephemeral: true 
            });
          }

          await member.roles.remove(role);
          
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('Rol Alındı')
            .addFields(
              { name: 'Kullanıcı', value: targetUser.tag, inline: true },
              { name: 'Rol', value: role.name, inline: true },
              { name: 'Alan', value: user.tag, inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });

        } catch (error) {
          console.error('Rol alma hatası:', error);
          await interaction.reply({ content: 'Rol alınamadı!', ephemeral: true });
        }
      }

      // GERİ SAYIM KOMUTU
      else if (commandName === 'gerisayım') {
        const minutes = interaction.options.getInteger('dakika');
        const totalSeconds = minutes * 60;

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('Geri Sayım Başlatıldı')
          .setDescription(`**${minutes} dakika** geri sayım başladı`)
          .addFields(
            { name: 'Kalan Süre', value: `${minutes}:00`, inline: true },
            { name: 'Başlatan', value: user.tag, inline: true }
          )
          .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Geri sayımı kaydet
        const countdowns = getCountdowns();
        countdowns[message.id] = {
          startTime: Date.now(),
          totalSeconds: totalSeconds,
          channelId: interaction.channel.id,
          guildId: interaction.guild.id
        };
        saveCountdowns(countdowns);

        // Geri sayım döngüsü
        let remainingTime = totalSeconds;
        const interval = setInterval(async () => {
          remainingTime -= 1;

          if (remainingTime <= 0) {
            clearInterval(interval);
            
            const finishedEmbed = new EmbedBuilder()
              .setColor('#e74c3c')
              .setTitle('Geri Sayım Bitti!')
              .setDescription('Süre doldu!')
              .addFields(
                { name: 'Başlatan', value: user.tag, inline: true },
                { name: 'Toplam Süre', value: `${minutes} dakika`, inline: true }
              )
              .setTimestamp();

            try {
              await message.edit({ embeds: [finishedEmbed] });
            } catch (error) {
              console.error('Geri sayım mesajı güncellenemedi:', error);
            }

            // Kayıttan sil
            delete countdowns[message.id];
            saveCountdowns(countdowns);
            return;
          }

          const remainingMinutes = Math.floor(remainingTime / 60);
          const remainingSeconds = remainingTime % 60;
          const timeString = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;

          const updatedEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('Geri Sayım Devam Ediyor')
            .setDescription(`**${minutes} dakika** geri sayım başladı`)
            .addFields(
              { name: 'Kalan Süre', value: timeString, inline: true },
              { name: 'Başlatan', value: user.tag, inline: true }
            )
            .setTimestamp();

          try {
            await message.edit({ embeds: [updatedEmbed] });
          } catch (error) {
            console.error('Geri sayım güncellenemiyor:', error);
            clearInterval(interval);
          }
        }, 1000);
      }

      // OWO İLE ÖDE KOMUTU
      else if (commandName === 'owoileöde') {
        const stock = getStock();
        
        // Sadece stock type'ı olan öğeleri al
        const stocks = Object.entries(stock).filter(([id, item]) => 
          item.type === 'stock' && item.credits > 0 && item.products && item.products.length > 0
        );
        
        console.log(`[OWO] Komut çalıştı - Stok sayısı: ${stocks.length}`);
        
        if (stocks.length === 0) {
          return await interaction.reply({ 
            content: '❌ Stokta ürün yok!', 
            ephemeral: true 
          });
        }

        // Select menu oluştur
        const selectOptions = stocks.slice(0, 25).map(([id, item]) => ({
          label: item.name.substring(0, 100),
          value: id,
          description: `${item.credits} OWO - ${item.products?.length || 0} ürün`.substring(0, 100)
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('stock_select_' + user.id)
          .setPlaceholder('Stok seçin...')
          .addOptions(selectOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setColor('#f093fb')
          .setTitle('💰 OWO Ödeme Sistemi')
          .setDescription('Lütfen bir stok seçin ve OWO gönderin')
          .addFields(
            { name: '📋 Stok Sayısı', value: stocks.length.toString(), inline: true },
            { name: '⚠️ Uyarı', value: 'Seçim yaptıktan sonra tam olarak belirtilen OWO miktarını gönderiniz', inline: false }
          )
          .setTimestamp();

        await interaction.reply({ 
          embeds: [embed], 
          components: [row],
          ephemeral: true 
        });
      }
    }
    
  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Hata oluştu!', ephemeral: true });
    }
  }
});


// MESAJ EVENT - OWO TESPİTİ
client.on('messageCreate', async (message) => {
  // Sadece DM'lerde çalış
  if (!message.isDMChannel()) return;
  
  // Bot mesajlarını yoksay
  if (message.author.bot) return;

  console.log(`[OWO] Mesaj alındı: ${message.author.tag} - ${message.content.substring(0, 50)}`);

  // Pending payments var mı kontrol et
  const pendingPayments = getPendingPayments();
  if (Object.keys(pendingPayments).length === 0) {
    console.log('[OWO] Bekleyen ödeme yok');
    return;
  }

  // OWO botundan gelen mesaj olup olmadığını kontrol et
  // OWO bot ID: 408785106942164992
  // Mesaj embed içinde olabilir
  
  let owoAmount = null;
  let hasOWOTransfer = false;

  // Embeds içinde kontrol et
  if (message.embeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      const description = embed.description || '';
      const title = embed.title || '';
      const content = `${title} ${description}`.toLowerCase();

      console.log(`[OWO] Embed kontrol: ${content.substring(0, 100)}`);

      // OWO transferi tespiti
      if (content.includes('sent') || content.includes('gönderdi')) {
        hasOWOTransfer = true;
        
        // Miktar bulma
        const amounts = content.match(/\d+/g);
        if (amounts && amounts.length > 0) {
          owoAmount = parseInt(amounts[amounts.length - 1]);
          console.log(`[OWO] Tespit edilen miktar: ${owoAmount}`);
        }
      }
    }
  }

  // Mesaj içeriğinde de kontrol et
  const contentLower = message.content.toLowerCase();
  if (contentLower.includes('sent') && (contentLower.includes('owo') || contentLower.includes('cowoncy'))) {
    hasOWOTransfer = true;
    
    const amounts = message.content.match(/\d+/g);
    if (amounts && amounts.length > 0) {
      owoAmount = parseInt(amounts[amounts.length - 1]);
      console.log(`[OWO] Mesaj içeriğinden miktar: ${owoAmount}`);
    }
  }

  if (!hasOWOTransfer) {
    console.log('[OWO] OWO transferi bulunamadı');
    return;
  }

  console.log(`[OWO] Transfer tespit edildi - Miktar: ${owoAmount}, Kullanıcı: ${message.author.tag}`);

  // Ödeme eşleştir
  let matchingPayment = null;
  let paymentId = null;

  for (const [id, payment] of Object.entries(pendingPayments)) {
    console.log(`[OWO] Kontrol - Payment ID: ${id}, userId: ${payment.userId}, credits: ${payment.credits}`);
    
    if (payment.userId === message.author.id && payment.credits === owoAmount) {
      matchingPayment = payment;
      paymentId = id;
      console.log(`[OWO] Ödeme eşleşti! Payment ID: ${paymentId}`);
      break;
    }
  }

  if (!matchingPayment) {
    console.log(`[OWO] Eşleşen ödeme bulunamadı. Miktar: ${owoAmount}, Kullanıcı ID: ${message.author.id}`);
    return;
  }

  try {
    // Owner'a onay mesajı gönder
    const owner = await client.users.fetch(OWNER_ID);
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`owo_confirm_${paymentId}`)
      .setLabel('✅ Onayla')
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId(`owo_reject_${paymentId}`)
      .setLabel('❌ Reddet')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmButton, rejectButton);

    const stock = getStock();
    const selectedStock = stock[matchingPayment.stockId];

    const confirmEmbed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('✅ OWO ÖDEME TESPİT EDİLDİ!')
      .setDescription('Bir kullanıcı OWO gönderdi - Lütfen onaylayın veya reddedin')
      .addFields(
        { name: '👤 Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: false },
        { name: '💰 Miktar', value: `${owoAmount} OWO`, inline: true },
        { name: '📦 Stok', value: selectedStock?.name || 'Bilinmiyor', inline: true },
        { name: '⏰ Zaman', value: new Date().toLocaleString('tr-TR'), inline: false }
      )
      .setTimestamp()
      .setFooter({ text: `Payment ID: ${paymentId}` });

    await owner.send({ embeds: [confirmEmbed], components: [row] });
    console.log(`[OWO] Owner'a onay mesajı gönderildi`);

  } catch (error) {
    console.error('[OWO] Tespit hatası:', error);
  }
});

// MESAJ SILME LOGLAMA - Artık kullanılmıyor
// client.on('messageDelete', async (message) => {
//   console.log('Mesaj silindi:', message.content);
// });

// MESAJ DUZENLE LOGLAMA - Artık kullanılmıyor 
// client.on('messageUpdate', async (oldMessage, newMessage) => {
//   console.log('Mesaj düzenlendi');
// });

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
        founder: null
      });
    }

    let founderData = null;
    try {
      const founder = await client.users.fetch(OWNER_ID);
      founderData = {
        username: founder.username,
        tag: founder.tag,
        id: founder.id,
        avatar: founder.displayAvatarURL({ dynamic: true, size: 128 }),
        status: 'online'
      };
    } catch (error) {
      console.error('Kurucu bilgisi hatasi:', error);
    }

    res.json({
      status: 'online',
      servers: client.guilds.cache.size,
      bot: {
        username: client.user.username,
        tag: client.user.tag,
        id: client.user.id,
        avatar: client.user.displayAvatarURL({ dynamic: true, size: 256 })
      },
      founder: founderData
    });
  } catch (error) {
    console.error('Bot stats API hatasi:', error);
    res.status(500).json({ error: 'Hata' });
  }
});

app.post('/api/stock/add', express.json(), (req, res) => {
  const { id, name, link, image, credits, type, description, products } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID ve isim gerekli' });
  }

  const stock = getStock();
  stock[id] = { 
    name, 
    link: link || '', 
    image: image || '', 
    credits: credits || 0, 
    type: type || 'stock',
    description: description || '',
    products: products || []
  };
  saveStock(stock);

  res.json({ success: true, message: 'Stok eklendi' });
});

// Ürün ekle API
app.post('/api/stock/add-product', express.json(), (req, res) => {
  const { stockId, name, username, password, link, description } = req.body;

  if (!stockId || !name || !username || !password) {
    return res.status(400).json({ error: 'Stok ID, ürün adı, kullanıcı adı ve şifre gerekli' });
  }

  const stock = getStock();
  if (!stock[stockId]) {
    return res.status(404).json({ error: 'Stok bulunamadı' });
  }

  if (!stock[stockId].products) {
    stock[stockId].products = [];
  }

  stock[stockId].products.push({
    name,
    username,
    password,
    link: link || '',
    description: description || ''
  });

  saveStock(stock);
  res.json({ success: true, message: 'Ürün eklendi' });
});

app.get('/api/stock', (req, res) => {
  const stock = getStock();
  res.json(stock);
});

app.listen(PORT, () => {
  console.log('Web server port ' + PORT);
});

client.login(process.env.DISCORD_TOKEN);
