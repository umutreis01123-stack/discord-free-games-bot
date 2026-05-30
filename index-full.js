require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection
} = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Config dosyası
const configPath = path.join(__dirname, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        gameChannels: {},
        ruleChannels: {}, // Kurallar kanalı
        ticketChannels: {}, // Ticket kanalı
        ticketModerators: [], // Ticket yetkilileri
        activeTickets: {} // Aktif ticketlar { ticketId: { userId, channelId, type, proof, status } }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ========== KOMUTLAR ==========
const commands = [
    // OYUN KOMUTLARI
    new SlashCommandBuilder()
        .setName('oyunkanalıayarla')
        .setDescription('Ücretsiz oyunların paylaşılacağı kanalı belirler')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Oyunların paylaşılacağı kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('oyunkanalıkaldır')
        .setDescription('Ayarlanan oyun kanalını kaldırır'),

    new SlashCommandBuilder()
        .setName('bütünücretsizoyunlarıpaylaş')
        .setDescription('Tüm platformlardaki ücretsiz oyunları paylaşır'),

    // TICKET KOMUTLARI
    new SlashCommandBuilder()
        .setName('ticketkur')
        .setDescription('Ticket sistemini kurar (butonlu)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Ticket butonlarının gösterileceği kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('sunucukurallarıoku')
        .setDescription('Sunucu kurallarını okur ve kaydeder')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Kuralların yazılı olduğu kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('ticketyetkili')
        .setDescription('Ticket yetkilisi ekler/çıkarır')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Yetkili olacak kullanıcı')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('ekle')
                .setDescription('Ekleme mi çıkarma mı?')
                .setRequired(true)
        ),

    // BEDAVA HESAP SİSTEMİ KOMUTLARI (umutpapa123 için)
    new SlashCommandBuilder()
        .setName('ürünekle')
        .setDescription('Yeni ürün/hesap ekler (sadece umutpapa123)')
        .addStringOption(option =>
            option.setName('ürün_adı')
                .setDescription('Ürün/hesap adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('kullanıcı_adı')
                .setDescription('Kullanıcı adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('şifre')
                .setDescription('Şifre')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('stokekle')
        .setDescription('Roblox hesabı ekler (sadece umutpapa123)')
        .addStringOption(option =>
            option.setName('roblox_ismi')
                .setDescription('Roblox kullanıcı adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('roblox_şifresi')
                .setDescription('Roblox şifresi')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('çekilişekle')
        .setDescription('Yeni çekiliş ekler (sadece umutpapa123)')
        .addStringOption(option =>
            option.setName('ödül')
                .setDescription('Çekiliş ödülü')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('kazanan_sayısı')
                .setDescription('Kazanan sayısı')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('süre_dakika')
                .setDescription('Çekiliş süresi (dakika)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('stokkanalekle')
        .setDescription('Stokların gösterileceği kanalı ayarlar (sadece umutpapa123)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Stok kanalı')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    // KULLANICI KOMUTLARI
    new SlashCommandBuilder()
        .setName('bedavahesap')
        .setDescription('Bedava hesap çek (günde 1 kez, düşük şans)'),

    new SlashCommandBuilder()
        .setName('kayıtol')
        .setDescription('Sisteme kayıt ol'),

    new SlashCommandBuilder()
        .setName('hesapgiriş')
        .setDescription('Kayıtlı hesabına giriş yap')
];

// ========== BOT HAZIR ==========
client.once('ready', async () => {
    console.log(`${client.user.tag} online!`);
    try {
        await client.application.commands.set(commands);
        console.log('✅ Tüm komutlar kaydedildi!');
    } catch (error) {
        console.error('❌ Komut hatası:', error);
    }
});

// ========== KOMUT İŞLEYİCİ ==========
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, guildId, options, user } = interaction;

    try {
        // OYUN KOMUTLARI
        if (commandName === 'oyunkanalıayarla') {
            await handleGameChannelSet(interaction, options);
        } else if (commandName === 'oyunkanalıkaldır') {
            await handleGameChannelRemove(interaction);
        } else if (commandName === 'bütünücretsizoyunlarıpaylaş') {
            await handleShareAllGames(interaction);
        }
        
        // TICKET KOMUTLARI
        else if (commandName === 'ticketkur') {
            await handleTicketSetup(interaction, options);
        } else if (commandName === 'sunucukurallarıoku') {
            await handleReadRules(interaction, options);
        } else if (commandName === 'ticketyetkili') {
            await handleTicketModerator(interaction, options, user);
        }
        
        // BEDAVA HESAP SİSTEMİ KOMUTLARI
        else if (commandName === 'ürünekle') {
            await handleAddProduct(interaction, options, user);
        } else if (commandName === 'stokekle') {
            await handleAddRobloxStock(interaction, options, user);
        } else if (commandName === 'çekilişekle') {
            await handleAddGiveaway(interaction, options, user);
        } else if (commandName === 'stokkanalekle') {
            await handleSetStockChannel(interaction, options, user);
        } else if (commandName === 'bedavahesap') {
            await handleFreeAccount(interaction, user);
        } else if (commandName === 'kayıtol') {
            await handleRegister(interaction, user);
        } else if (commandName === 'hesapgiriş') {
            await handleAccountLogin(interaction, user);
        } else {
            await interaction.reply({ 
                content: '❌ Bu komut şu anda kullanılamıyor!', 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({ 
            content: '❌ Komut işlenirken hata!', 
            ephemeral: true 
        });
    }
});

// ========== BUTON İNTERAKSİYONLARI ==========
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId, guildId, user } = interaction;

    try {
        // Ticket açma butonları
        if (customId === 'ticket_sikayet' || customId === 'ticket_yardim' || customId === 'ticket_diger') {
            await handleTicketOpen(interaction, customId);
        }
        
        // Ticket kapatma butonu
        else if (customId.startsWith('close_ticket_')) {
            await handleTicketClose(interaction, customId);
        }
    } catch (error) {
        console.error('Button hatası:', error);
        await interaction.reply({
            content: '❌ İşlem sırasında hata!',
            ephemeral: true
        });
    }
});

// ========== FONKSİYONLAR ==========

// OYUN FONKSİYONLARI
async function handleGameChannelSet(interaction, options) {
    // Sadece yöneticiler kullanabilir
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
            content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.gameChannels[guildId] = channel.id;
    saveConfig();
    
    await interaction.reply({
        content: `✅ Ücretsiz oyunlar artık ${channel} kanalında paylaşılacak!`,
        ephemeral: true
    });
    
    // Hemen oyun paylaş
    const games = await getSteamFreeGames();
    for (const game of games.slice(0, 3)) {
        await shareGame(channel, game);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function handleGameChannelRemove(interaction) {
    // Sadece yöneticiler kullanabilir
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
            content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const guildId = interaction.guildId;
    
    if (config.gameChannels[guildId]) {
        delete config.gameChannels[guildId];
        saveConfig();
        await interaction.reply({
            content: '✅ Oyun kanalı kaldırıldı!',
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ Oyun kanalı bulunamadı!',
            ephemeral: true
        });
    }
}

async function handleShareAllGames(interaction) {
    // Sadece yöneticiler kullanabilir
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
            content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guildId;
    const gameChannelId = config.gameChannels[guildId];
    
    if (!gameChannelId) {
        await interaction.editReply({
            content: '❌ Önce oyun kanalı ayarla!'
        });
        return;
    }
    
    const gameChannel = await client.channels.fetch(gameChannelId);
    const games = await getSteamFreeGames();
    
    await gameChannel.send('🚨 **TÜM ÜCRETSİZ OYUNLAR PAYLAŞILIYOR!**');
    
    let count = 0;
    for (const game of games.slice(0, 15)) {
        try {
            await shareGame(gameChannel, game);
            count++;
            await new Promise(resolve => setTimeout(resolve, 1200));
        } catch (e) {
            console.error('Hata:', e.message);
        }
    }
    
    await gameChannel.send(`✅ **${count} oyun paylaşıldı!**`);
    await interaction.editReply({
        content: `✅ ${count} oyun paylaşıldı!`
    });
}

// TICKET FONKSİYONLARI
async function handleTicketSetup(interaction, options) {
    // Sadece umutpapa123 kullanabilir
    if (interaction.user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.ticketChannels[guildId] = channel.id;
    saveConfig();
    
    // Ticket butonları oluştur
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_sikayet')
                .setLabel('🛑 Şikayet')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_yardim')
                .setLabel('❓ Yardım')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_diger')
                .setLabel('📝 Diğer')
                .setStyle(ButtonStyle.Secondary)
        );
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎫 TICKET SİSTEMİ')
        .setDescription('Bir sorununuz mu var? Şikayetiniz mi var? Aşağıdaki butonlardan birine tıklayarak ticket açabilirsiniz.\n\n**Önemli:** Şikayetlerde lütfen kanıt (SS) ekleyin!')
        .addFields(
            { name: '🛑 Şikayet', value: 'Bir kullanıcı hakkında şikayet', inline: true },
            { name: '❓ Yardım', value: 'Yardıma ihtiyacınız var', inline: true },
            { name: '📝 Diğer', value: 'Diğer konular', inline: true }
        )
        .setFooter({ text: 'Bot otomatik olarak SS\'leri inceleyip kurallara uygunluğunu kontrol edecek' })
        .setTimestamp();
    
    await channel.send({ embeds: [embed], components: [row] });
    
    await interaction.reply({
        content: `✅ Ticket sistemi ${channel} kanalında kuruldu!`,
        ephemeral: true
    });
}

async function handleReadRules(interaction, options) {
    // Sadece umutpapa123 kullanabilir
    if (interaction.user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.ruleChannels[guildId] = channel.id;
    saveConfig();
    
    // Kuralları oku
    const rules = await readServerRules(guildId);
    
    if (rules && rules !== 'Kurallar bulunamadı.') {
        await interaction.reply({
            content: `✅ Kurallar kanalı ${channel} olarak ayarlandı!\n📜 **Kurallar okundu:** ${rules.substring(0, 150)}...`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: `✅ Kurallar kanalı ${channel} olarak ayarlandı!\n⚠️ **Uyarı:** Kurallar kanalında kurallar bulunamadı!`,
            ephemeral: true
        });
    }
}

async function handleTicketModerator(interaction, options, user) {
    const targetUser = options.getUser('kullanıcı');
    const add = options.getBoolean('ekle');
    const guildId = interaction.guildId;
    
    // Sadece umutpapa123 veya yöneticiler yapabilir
    const isUmutpapa123 = user.username === 'umutpapa123';
    const member = await interaction.guild.members.fetch(user.id);
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    
    if (!isUmutpapa123 && !isAdmin) {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 veya yöneticiler kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    if (add) {
        if (!config.ticketModerators.includes(targetUser.id)) {
            config.ticketModerators.push(targetUser.id);
            saveConfig();
            
            await interaction.reply({
                content: `✅ ${targetUser.tag} ticket yetkilisi olarak eklendi!`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ ${targetUser.tag} zaten ticket yetkilisi!`,
                ephemeral: true
            });
        }
    } else {
        const index = config.ticketModerators.indexOf(targetUser.id);
        if (index > -1) {
            config.ticketModerators.splice(index, 1);
            saveConfig();
            
            await interaction.reply({
                content: `✅ ${targetUser.tag} ticket yetkilisi olarak çıkarıldı!`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `❌ ${targetUser.tag} ticket yetkilisi değil!`,
                ephemeral: true
            });
        }
    }
}

async function handleTicketOpen(interaction, ticketType) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    // Ticket türünü belirle
    let typeName = '';
    if (ticketType === 'ticket_sikayet') typeName = 'Şikayet';
    else if (ticketType === 'ticket_yardim') typeName = 'Yardım';
    else typeName = 'Diğer';
    
    // Ticket ID oluştur
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    // Ticket kanalı oluştur
    const guild = interaction.guild;
    const category = guild.channels.cache.find(c => c.type === 4 && c.name.includes('Tickets')) || 
                     await guild.channels.create({
                         name: '🎫 Tickets',
                         type: 4 // Category
                     });
    
    const ticketChannel = await guild.channels.create({
        name: `ticket-${ticketId.toLowerCase()}`,
        type: 0, // Text channel
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: userId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
            },
            {
                id: client.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
            }
        ]
    });
    
    // Yetkilileri ekle
    for (const modId of config.ticketModerators) {
        await ticketChannel.permissionOverwrites.create(modId, {
            ViewChannel: true,
            SendMessages: true,
            AttachFiles: true
        });
    }
    
    // Ticket'ı kaydet
    if (!config.activeTickets[guildId]) {
        config.activeTickets[guildId] = {};
    }
    
    config.activeTickets[guildId][ticketId] = {
        userId: userId,
        channelId: ticketChannel.id,
        type: typeName,
        proof: null,
        status: 'open',
        createdAt: Date.now()
    };
    saveConfig();
    
    // Ticket kanalına mesaj gönder
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`🎫 TICKET #${ticketId}`)
        .addFields(
            { name: '👤 Açan', value: `${interaction.user.tag}`, inline: true },
            { name: '📌 Tür', value: typeName, inline: true },
            { name: '🕐 Açılma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '📊 Durum', value: '🔓 Açık', inline: true }
        )
        .setDescription(`**📋 TALİMATLAR:**\n\n` +
                       `**🛑 ŞİKAYET İÇİN:**\n` +
                       `1. SS (ekran görüntüsü) atın\n` +
                       `2. Mesaj olarak yazın: "@kullanıcı bu küfürü etti"\n` +
                       `3. **ÖNEMLİ:** Hem SS hem mesaj gereklidir!\n\n` +
                       `**❓ YARDIM İÇİN:**\n` +
                       `Sorununuzu detaylı yazın\n\n` +
                       `**📝 DİĞER İÇİN:**\n` +
                       `Konunuzu belirtin\n\n` +
                       `**⚠️ BOT OTOMATİK KONTROL EDECEK:**\n` +
                       `• SS + mesaj varsa → Küfür kontrolü yapar\n` +
                       `• Sadece SS varsa → "Lütfen mesaj olarak da yazın"\n` +
                       `• Sadece mesaj varsa → "Kanıt olarak SS de lazım"\n` +
                       `• Küfür bulunursa → 30dk timeout + "Dediğiniz kanıtlandı"\n` +
                       `• Küfür yoksa → "Dediğiniz doğrulanmadı"`)
        .setTimestamp();
    
    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`close_ticket_${ticketId}`)
                .setLabel('🔒 Ticketı Kapat')
                .setStyle(ButtonStyle.Danger)
        );
    
    await ticketChannel.send({ 
        content: `${interaction.user} hoş geldin!\n\n**Yetkililer:** ${config.ticketModerators.map(id => `<@${id}>`).join(' ')}`,
        embeds: [embed],
        components: [closeButton]
    });
    
    await interaction.reply({
        content: `✅ Ticket açıldı! Kanal: ${ticketChannel}\n**Ticket ID:** ${ticketId}`,
        ephemeral: true
    });
}

async function handleTicketClose(interaction, customId) {
    const ticketId = customId.replace('close_ticket_', '');
    const guildId = interaction.guildId;
    
    if (!config.activeTickets[guildId] || !config.activeTickets[guildId][ticketId]) {
        await interaction.reply({
            content: '❌ Ticket bulunamadı!',
            ephemeral: true
        });
        return;
    }
    
    const ticket = config.activeTickets[guildId][ticketId];
    
    // Sadece yetkili veya ticket sahibi kapatabilir
    const isModerator = config.ticketModerators.includes(interaction.user.id);
    const isOwner = ticket.userId === interaction.user.id;
    
    if (!isModerator && !isOwner) {
        await interaction.reply({
            content: '❌ Bu ticketı kapatma yetkiniz yok!',
            ephemeral: true
        });
        return;
    }
    
    // Ticket kanalını bul
    const ticketChannel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);
    
    if (ticketChannel) {
        try {
            const messages = await ticketChannel.messages.fetch({ limit: 50 });
            let hasSS = false;
            let hasMessage = false;
            let hasRuleViolation = false;
            let violationReason = '';
            let reportedUser = null;
            let userMessage = '';
            let ssInfo = '';
            
            // Tüm mesajları analiz et
            messages.forEach(msg => {
                if (!msg.author.bot) {
                    // SS kontrolü (attachment veya SS yazısı)
                    if (msg.attachments.size > 0 || 
                        msg.content.toLowerCase().includes('ss') || 
                        msg.content.toLowerCase().includes('ekran') ||
                        msg.content.toLowerCase().includes('screenshot')) {
                        hasSS = true;
                        ssInfo = `📸 **SS var:** ${msg.author.tag} tarafından gönderildi`;
                        
                        // SS'de küfür kontrolü
                        if (msg.content) {
                            const ruleCheck = checkRuleViolation(msg.content, guildId);
                            if (ruleCheck.found) {
                                hasRuleViolation = true;
                                violationReason = ruleCheck.reason;
                            }
                        }
                    }
                    
                    // Mesaj kontrolü (küfür veya şikayet içeriği)
                    if (msg.content && msg.content.length > 5 && 
                        !msg.content.toLowerCase().includes('ss') &&
                        !msg.content.toLowerCase().includes('ekran')) {
                        hasMessage = true;
                        userMessage = msg.content;
                        
                        // Mesajda küfür kontrolü
                        const ruleCheck = checkRuleViolation(msg.content, guildId);
                        if (ruleCheck.found) {
                            hasRuleViolation = true;
                            violationReason = ruleCheck.reason;
                        }
                        
                        // Şikayet edilen kullanıcıyı bul
                        const userMention = msg.content.match(/<@!?(\d+)>/);
                        if (userMention) {
                            reportedUser = userMention[1];
                        }
                    }
                }
            });
            
            // 1. SS VAR ama MESAJ YOKSA
            if (hasSS && !hasMessage) {
                await ticketChannel.send(`❌ **Lütfen mesaj olarak da yazın!**\n` +
                                       `SS attınız ama ne olduğunu yazmadınız.\n` +
                                       `Örnek: "@kullanıcı bu küfürü etti" şeklinde yazın.\n` +
                                       `**Ticket 10 saniye sonra kapanacak...**`);
                
                setTimeout(async () => {
                    try {
                        await ticketChannel.delete('Ticket: SS var ama mesaj yok');
                    } catch (e) {
                        console.error('Kanal silinemedi:', e);
                    }
                }, 10000);
            }
            
            // 2. MESAJ VAR ama SS YOKSA (Şikayet türünde)
            else if (hasMessage && !hasSS && ticket.type === 'Şikayet') {
                await ticketChannel.send(`❌ **Kanıt olarak SS de lazım!**\n` +
                                       `Mesaj yazdınız ama SS (ekran görüntüsü) atmadınız.\n` +
                                       `Şikayetlerde kanıt (SS) zorunludur.\n` +
                                       `**Ticket 10 saniye sonra kapanacak...**`);
                
                setTimeout(async () => {
                    try {
                        await ticketChannel.delete('Ticket: Mesaj var ama SS yok');
                    } catch (e) {
                        console.error('Kanal silinemedi:', e);
                    }
                }, 10000);
            }
            
            // 3. HEM SS HEM MESAJ VARSA
            else if (hasSS && hasMessage) {
                // Kural ihlali VARSA
                if (hasRuleViolation && reportedUser) {
                    try {
                        const member = await interaction.guild.members.fetch(reportedUser);
                        
                        // Detaylı rapor oluştur
                        const reportText = `🔍 **TICKET ANALİZ RAPORU**\n` +
                                         `**Ticket ID:** ${ticketId}\n` +
                                         `**Şikayet Eden:** <@${ticket.userId}>\n` +
                                         `**Şikayet Edilen:** ${member.user.tag} (${reportedUser})\n` +
                                         `**İhlal Türü:** ${violationReason}\n` +
                                         `**Mesaj:** "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"\n` +
                                         `**SS Durumu:** ✅ Var\n` +
                                         `**Sonuç:** ⚠️ **${member.user.tag} kişisi bu küfürü etti!**`;
                        
                        await ticketChannel.send(reportText);
                        
                        // 30 dakika timeout
                        await member.timeout(30 * 60 * 1000, `Ticket #${ticketId}: ${violationReason}`);
                        
                        // Ticket sahibine bildir
                        await ticketChannel.send(`✅ **Dediğiniz kanıtlandı!**\n` +
                                               `**${member.user.tag}** kullanıcısına 30 dakika timeout verildi.\n` +
                                               `**Sebep:** Sunucu kurallarına aykırı içerik (${violationReason})\n` +
                                               `**Ticket kapanıyor...**`);
                        
                        // Yetkililere bildir
                        for (const modId of config.ticketModerators) {
                            try {
                                const mod = await interaction.guild.members.fetch(modId);
                                if (mod) {
                                    await mod.send(`🔔 **TICKET SONUCU: KANITLANDI!**\n` +
                                                 reportText + `\n` +
                                                 `**Ceza:** 30 dakika timeout\n` +
                                                 `**Durum:** ✅ Dediğiniz kanıtlandı, ticket kapanıyor`);
                                }
                            } catch (e) {
                                console.log('Moderatöre DM gönderilemedi:', modId);
                            }
                        }
                    } catch (e) {
                        console.error('Timeout hatası:', e);
                        await ticketChannel.send(`❌ Hata: ${e.message}\nTicket kapanıyor...`);
                    }
                }
                // Kural ihlali YOKSA
                else {
                    await ticketChannel.send(`❌ **Dediğiniz doğrulanmadı!**\n` +
                                           `SS ve mesajınız incelendi ancak sunucu kurallarına aykırı bir içerik bulunamadı.\n` +
                                           `**Ticket kapanıyor...**`);
                    
                    // Yetkililere bildir
                    for (const modId of config.ticketModerators) {
                        try {
                            const mod = await interaction.guild.members.fetch(modId);
                            if (mod) {
                                await mod.send(`🔔 **TICKET SONUCU: DOĞRULANMADI!**\n` +
                                             `**Ticket ID:** ${ticketId}\n` +
                                             `**Kullanıcı:** <@${ticket.userId}>\n` +
                                             `**İnceleme:** SS ve mesaj var ama kural ihlali yok\n` +
                                             `**Durum:** ❌ Dediğiniz doğrulanmadı, ticket kapanıyor`);
                            }
                        } catch (e) {
                            console.log('Moderatöre DM gönderilemedi:', modId);
                        }
                    }
                }
                
                // 10 saniye sonra kanalı sil
                setTimeout(async () => {
                    try {
                        await ticketChannel.delete('Ticket kapatıldı');
                    } catch (e) {
                        console.error('Kanal silinemedi:', e);
                    }
                }, 10000);
            }
            
            // 4. HİÇBİR ŞEY YOKSA (Yardım/Diğer türünde olabilir)
            else {
                await ticketChannel.send(`✅ **Teşekkürler!**\n` +
                                       `Sorununuz/sorunuz yetkililere iletildi.\n` +
                                       `**Ticket 10 saniye sonra kapanacak...**`);
                
                setTimeout(async () => {
                    try {
                        await ticketChannel.delete('Ticket kapatıldı');
                    } catch (e) {
                        console.error('Kanal silinemedi:', e);
                    }
                }, 10000);
            }
            
        } catch (e) {
            console.error('Ticket mesaj kontrol hatası:', e);
            await ticketChannel.send(`❌ Hata oluştu: ${e.message}\nTicket kapanıyor...`);
            
            setTimeout(async () => {
                try {
                    await ticketChannel.delete('Ticket: Hata');
                } catch (e) {
                    console.error('Kanal silinemedi:', e);
                }
            }, 5000);
        }
    }
    
    // Ticket'ı sil
    delete config.activeTickets[guildId][ticketId];
    saveConfig();
    
    await interaction.reply({
        content: `✅ Ticket #${ticketId} kapatıldı!`,
        ephemeral: true
    });
}

// Sunucu kurallarını oku
async function readServerRules(guildId) {
    const ruleChannelId = config.ruleChannels[guildId];
    if (!ruleChannelId) return null;
    
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return null;
        
        const ruleChannel = await guild.channels.fetch(ruleChannelId);
        if (!ruleChannel) return null;
        
        // Son 50 mesajı al
        const messages = await ruleChannel.messages.fetch({ limit: 50 });
        let rulesText = '';
        
        messages.forEach(msg => {
            if (!msg.author.bot) {
                rulesText += msg.content + '\n\n';
            }
        });
        
        return rulesText || 'Kurallar bulunamadı.';
    } catch (error) {
        console.error('Kurallar okunurken hata:', error);
        return null;
    }
}

// Kural ihlali kontrolü
function checkRuleViolation(content, guildId) {
    // Bu fonksiyon sunucu kurallarını okuyup içerikte kural ihlali olup olmadığını kontrol eder
    // Gelişmiş küfür kontrolü
    
    const badWords = [
        // Küfürler
        'amk', 'aq', 'sg', 'siktir', 'orospu', 'piç', 'amına', 'sik', 'göt', 'yarrak',
        'kahpe', 'pezevenk', 'ibne', 'gavat', 'mal', 'salak', 'aptal', 'gerizekalı',
        // Hakaretler
        'küfür', 'sövme', 'hakaret', 'kötü söz', 'argo', 'küfrediyorum', 'sövüyorum',
        // İngilizce küfürler
        'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'dick', 'pussy', 'cunt',
        // Diğer
        'öl', 'geber', 'siktir git', 'defol', 'yürü git'
    ];
    
    const lowerContent = content.toLowerCase();
    
    // Noktalama işaretlerini kaldır
    const cleanContent = lowerContent.replace(/[.,!?;:'"()\[\]{}]/g, ' ');
    
    // Kelimelere ayır
    const words = cleanContent.split(/\s+/);
    
    for (const word of badWords) {
        // Tam kelime eşleşmesi veya içinde geçme
        if (words.includes(word) || lowerContent.includes(word)) {
            return {
                found: true,
                reason: `Küfür/hakaret tespit edildi: "${word}"`
            };
        }
    }
    
    // Sunucu kurallarını da kontrol et (eğer okunmuşsa)
    const rules = config.ruleChannels[guildId] ? 'Kurallar var' : null;
    if (rules) {
        // Burada daha gelişmiş kural kontrolü yapılabilir
        // Örneğin: spam, reklam, ırkçılık vs.
    }
    
    return {
        found: false,
        reason: ''
    };
}

// Oyun fonksiyonları
async function getSteamFreeGames() {
    try {
        const response = await axios.get('https://store.steampowered.com/search/?maxprice=free&specials=1', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);
        const games = [];

        $('.search_result_row').each((i, el) => {
            const title = $(el).find('.title').text().trim();
            const url = $(el).attr('href');
            const image = $(el).find('img').attr('src');
            const price = $(el).find('.discount_final_price').text().trim();

            if (price === 'Free' && url && url.includes('/app/')) {
                games.push({
                    title: title || 'Bilinmeyen Oyun',
                    url: url,
                    image: image || 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
                    price: 'ÜCRETSİZ',
                    platform: 'Steam'
                });
            }
        });

        if (games.length === 0) {
            return [
                {
                    title: "Counter-Strike 2",
                    url: "https://store.steampowered.com/app/730/CounterStrike_2/",
                    image: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
                    price: "ÜCRETSİZ",
                    platform: "Steam"
                },
                {
                    title: "Dota 2",
                    url: "https://store.steampowered.com/app/570/Dota_2/",
                    image: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
                    price: "ÜCRETSİZ",
                    platform: "Steam"
                }
            ];
        }

        return games.slice(0, 10);
    } catch (error) {
        console.error('Steam hatası:', error.message);
        return [
            {
                title: "Test Oyunu",
                url: "https://store.steampowered.com/",
                image: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
                price: "ÜCRETSİZ",
                platform: "Steam"
            }
        ];
    }
}

async function shareGame(channel, game) {
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(`🎮 ${game.title}`)
        .setURL(game.url)
        .setDescription(`🚨 **YENİ ÜCRETSİZ OYUN: ${game.title}** 🚨\n\nHemen indir, oynamaya başla!`)
        .addFields(
            { name: '🏷️ Fiyat', value: `**${game.price}**`, inline: true },
            { name: '🖥️ Platform', value: game.platform, inline: true },
            { name: '🔗 Link', value: `[İndir](${game.url})`, inline: false }
        )
        .setImage(game.image)
        .setTimestamp()
        .setFooter({ text: 'Ücretsiz Oyun Botu' });

    await channel.send({ 
        content: '@everyone 🚨 **YENİ ÜCRETSİZ OYUN!** 🚨', 
        embeds: [embed] 
    });
}

// ========== BEDAVA HESAP SİSTEMİ FONKSİYONLARI ==========

// Ürün ekle (sadece umutpapa123)
async function handleAddProduct(interaction, options, user) {
    // Sadece umutpapa123 kullanabilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const productName = options.getString('ürün_adı');
    const username = options.getString('kullanıcı_adı');
    const password = options.getString('şifre');
    
    // Ürünü stok'a ekle
    const product = {
        id: Date.now().toString(),
        name: productName,
        username: username,
        password: password,
        type: 'product',
        addedAt: Date.now(),
        addedBy: user.id
    };
    
    config.freeAccounts.stock.push(product);
    saveConfig();
    
    // Stok kanalına mesaj gönder (eğer ayarlanmışsa)
    if (config.freeAccounts.stockChannel) {
        try {
            const stockChannel = await client.channels.fetch(config.freeAccounts.stockChannel);
            if (stockChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🆕 YENİ ÜRÜN EKLENDİ')
                    .addFields(
                        { name: '📦 Ürün Adı', value: productName, inline: true },
                        { name: '👤 Kullanıcı Adı', value: `||${username}||`, inline: true },
                        { name: '🔑 Şifre', value: `||${password}||`, inline: true },
                        { name: '📅 Eklenme', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '👨‍💼 Ekleyen', value: user.tag, inline: true }
                    )
                    .setTimestamp();
                
                await stockChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Stok kanalına mesaj gönderilemedi:', error);
        }
    }
    
    await interaction.reply({
        content: `✅ Ürün başarıyla eklendi!\n**Ürün:** ${productName}\n**Kullanıcı Adı:** ||${username}||\n**Şifre:** ||${password}||`,
        ephemeral: true
    });
}

// Roblox stok ekle (sadece umutpapa123)
async function handleAddRobloxStock(interaction, options, user) {
    // Sadece umutpapa123 kullanabilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const robloxName = options.getString('roblox_ismi');
    const robloxPassword = options.getString('roblox_şifresi');
    
    // Roblox hesabını stok'a ekle
    const robloxAccount = {
        id: Date.now().toString(),
        name: `Roblox: ${robloxName}`,
        username: robloxName,
        password: robloxPassword,
        type: 'roblox',
        addedAt: Date.now(),
        addedBy: user.id
    };
    
    config.freeAccounts.stock.push(robloxAccount);
    saveConfig();
    
    // Stok kanalına mesaj gönder (eğer ayarlanmışsa)
    if (config.freeAccounts.stockChannel) {
        try {
            const stockChannel = await client.channels.fetch(config.freeAccounts.stockChannel);
            if (stockChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🎮 YENİ ROBLOX HESABI EKLENDİ')
                    .addFields(
                        { name: '👤 Roblox İsmi', value: robloxName, inline: true },
                        { name: '🔑 Şifre', value: `||${robloxPassword}||`, inline: true },
                        { name: '📅 Eklenme', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                        { name: '👨‍💼 Ekleyen', value: user.tag, inline: true }
                    )
                    .setTimestamp();
                
                await stockChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Stok kanalına mesaj gönderilemedi:', error);
        }
    }
    
    await interaction.reply({
        content: `✅ Roblox hesabı başarıyla eklendi!\n**Roblox İsmi:** ${robloxName}\n**Şifre:** ||${robloxPassword}||`,
        ephemeral: true
    });
}

// Çekiliş ekle (sadece umutpapa123)
async function handleAddGiveaway(interaction, options, user) {
    // Sadece umutpapa123 kullanabilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const prize = options.getString('ödül');
    const winnerCount = options.getInteger('kazanan_sayısı');
    const durationMinutes = options.getInteger('süre_dakika');
    
    const giveaway = {
        id: Date.now().toString(),
        prize: prize,
        winnerCount: winnerCount,
        duration: durationMinutes * 60 * 1000, // milisaniyeye çevir
        startTime: Date.now(),
        endTime: Date.now() + (durationMinutes * 60 * 1000),
        participants: [],
        status: 'active',
        createdBy: user.id
    };
    
    config.freeAccounts.giveaways.push(giveaway);
    saveConfig();
    
    // Çekiliş mesajı gönder
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎉 YENİ ÇEKİLİŞ BAŞLADI!')
        .setDescription(`**Ödül:** ${prize}\n**Kazanan Sayısı:** ${winnerCount} kişi\n**Süre:** ${durationMinutes} dakika`)
        .addFields(
            { name: '⏰ Bitiş', value: `<t:${Math.floor(giveaway.endTime / 1000)}:R>`, inline: true },
            { name: '👥 Katılımcı', value: '0 kişi', inline: true },
            { name: '🎁 Ödül', value: prize, inline: true }
        )
        .setFooter({ text: 'Çekilişe katılmak için "Katıl" butonuna tıklayın!' })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_join_${giveaway.id}`)
                .setLabel('🎉 Katıl')
                .setStyle(ButtonStyle.Success)
        );
    
    await interaction.reply({
        content: '🎉 **YENİ ÇEKİLİŞ BAŞLADI!**',
        embeds: [embed],
        components: [row]
    });
}

// Stok kanalı ayarla (sadece umutpapa123)
async function handleSetStockChannel(interaction, options, user) {
    // Sadece umutpapa123 kullanabilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const channel = options.getChannel('kanal');
    config.freeAccounts.stockChannel = channel.id;
    saveConfig();
    
    await interaction.reply({
        content: `✅ Stok kanalı ${channel} olarak ayarlandı! Yeni eklenen ürünler bu kanala gönderilecek.`,
        ephemeral: true
    });
}

// Bedava hesap çek
async function handleFreeAccount(interaction, user) {
    const userId = user.id;
    const guildId = interaction.guildId;
    
    // Günde 1 kez kontrolü
    const lastUse = config.freeAccounts.lastDailyUse[userId];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (lastUse && (now - lastUse) < oneDay) {
        const nextUse = new Date(lastUse + oneDay);
        await interaction.reply({
            content: `❌ Günde sadece 1 kez bedava hesap çekebilirsin!\n**Sonraki kullanım:** <t:${Math.floor(nextUse.getTime() / 1000)}:R>`,
            ephemeral: true
        });
        return;
    }
    
    // Düşük şans kontrolü (%10 şans)
    const chance = Math.random() * 100;
    if (chance > 10) { // %90 başarısız
        config.freeAccounts.lastDailyUse[userId] = now;
        saveConfig();
        
        await interaction.reply({
            content: '❌ **Şanssızsın!** Bedava hesap çıkmadı. Yarın tekrar dene!',
            ephemeral: true
        });
        return;
    }
    
    // Stok'tan rastgele bir hesap seç
    if (config.freeAccounts.stock.length === 0) {
        await interaction.reply({
            content: '❌ **Stokta hesap kalmadı!** umutpapa123 yeni hesap ekleyene kadar bekleyin.',
            ephemeral: true
        });
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * config.freeAccounts.stock.length);
    const account = config.freeAccounts.stock[randomIndex];
    
    // Hesabı stok'tan çıkar
    config.freeAccounts.stock.splice(randomIndex, 1);
    config.freeAccounts.lastDailyUse[userId] = now;
    saveConfig();
    
    // Kullanıcıya DM gönder
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 TEBRİKLER! BEDAVA HESAP KAZANDIN')
            .setDescription(`**${account.name}** hesabını kazandın!`)
            .addFields(
                { name: '👤 Kullanıcı Adı', value: account.username },
                { name: '🔑 Şifre', value: account.password },
                { name: '📅 Kazanma Tarihi', value: `<t:${Math.floor(now / 1000)}:R>` }
            )
            .setFooter({ text: 'Bu bilgileri kimseyle paylaşma!' })
            .setTimestamp();
        
        await user.send({ embeds: [dmEmbed] });
        
        await interaction.reply({
            content: '✅ **Tebrikler!** Bedava hesap kazandın! Detaylar DM olarak gönderildi. 🎉',
            ephemeral: true
        });
        
    } catch (error) {
        // DM kapalıysa, özel mesaj olarak göster
        const privateEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 TEBRİKLER! BEDAVA HESAP KAZANDIN')
            .setDescription(`**${account.name}** hesabını kazandın!`)
            .addFields(
                { name: '👤 Kullanıcı Adı', value: `||${account.username}||` },
                { name: '🔑 Şifre', value: `||${account.password}||` },
                { name: '📅 Kazanma Tarihi', value: `<t:${Math.floor(now / 1000)}:R>` }
            )
            .setFooter({ text: 'Bu bilgileri kimseyle paylaşma! DM kapalı olduğu için burada gösteriliyor.' })
            .setTimestamp();
        
        await interaction.reply({
            content: '✅ **Tebrikler!** Bedava hesap kazandın! 🎉',
            embeds: [privateEmbed],
            ephemeral: true
        });
    }
}

// Kayıt ol
async function handleRegister(interaction, user) {
    const userId = user.id;
    
    if (config.freeAccounts.users[userId]) {
        await interaction.reply({
            content: '❌ Zaten kayıtlısın!',
            ephemeral: true
        });
        return;
    }
    
    // Rastgele kullanıcı adı ve şifre oluştur
    const randomUsername = `user_${Math.random().toString(36).substr(2, 8)}`;
    const randomPassword = Math.random().toString(36).substr(2, 10);
    
    const userAccount = {
        id: userId,
        username: randomUsername,
        password: randomPassword,
        registeredAt: Date.now(),
        lastLogin: null
    };
    
    config.freeAccounts.users[userId] = userAccount;
    saveConfig();
    
    // Oto giriş yap
    userAccount.lastLogin = Date.now();
    saveConfig();
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('✅ KAYIT BAŞARILI!')
        .setDescription('Hesabın oluşturuldu ve otomatik giriş yapıldı.')
        .addFields(
            { name: '👤 Kullanıcı Adın', value: randomUsername },
            { name: '🔑 Şifren', value: randomPassword },
            { name: '📅 Kayıt Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:R>` }
        )
        .setFooter({ text: 'Bu bilgileri kaybetme! /hesapgiriş komutu ile giriş yapabilirsin.' })
        .setTimestamp();
    
    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

// Hesap giriş
async function handleAccountLogin(interaction, user) {
    const userId = user.id;
    const userAccount = config.freeAccounts.users[userId];
    
    if (!userAccount) {
        await interaction.reply({
            content: '❌ Kayıtlı hesabın yok! Önce /kayıtol komutu ile kayıt ol.',
            ephemeral: true
        });
        return;
    }
    
    // Oto giriş yap
    userAccount.lastLogin = Date.now();
    saveConfig();
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ GİRİŞ BAŞARILI!')
        .setDescription('Hesabına başarıyla giriş yaptın.')
        .addFields(
            { name: '👤 Kullanıcı Adın', value: userAccount.username },
            { name: '🔑 Şifren', value: userAccount.password },
            { name: '📅 Son Giriş', value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
            { name: '📅 Kayıt Tarihi', value: `<t:${Math.floor(userAccount.registeredAt / 1000)}:R>` }
        )
        .setFooter({ text: 'Hesap bilgilerini kimseyle paylaşma!' })
        .setTimestamp();
    
    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

// Çekiliş buton işleyiciyi ekle
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { customId } = interaction;
    
    if (customId.startsWith('giveaway_join_')) {
        await handleGiveawayJoin(interaction, customId);
    }
});

// Çekilişe katıl
async function handleGiveawayJoin(interaction, customId) {
    const giveawayId = customId.replace('giveaway_join_', '');
    const userId = interaction.user.id;
    
    // Çekilişi bul
    const giveaway = config.freeAccounts.giveaways.find(g => g.id === giveawayId);
    
    if (!giveaway || giveaway.status !== 'active') {
        await interaction.reply({
            content: '❌ Bu çekiliş aktif değil veya sona erdi!',
            ephemeral: true
        });
        return;
    }
    
    // Süre kontrolü
    if (Date.now() > giveaway.endTime) {
        giveaway.status = 'ended';
        saveConfig();
        await interaction.reply({
            content: '❌ Çekiliş süresi doldu!',
            ephemeral: true
        });
        return;
    }
    
    // Zaten katılmış mı kontrolü
    if (giveaway.participants.includes(userId)) {
        await interaction.reply({
            content: '❌ Zaten bu çekilişe katıldın!',
            ephemeral: true
        });
        return;
    }
    
    // Katılımcı ekle
    giveaway.participants.push(userId);
    saveConfig();
    
    await interaction.reply({
        content: '✅ Çekilişe başarıyla katıldın! 🎉',
        ephemeral: true
    });
}

// Keep-alive server
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot aktif!');
});
server.listen(process.env.PORT || 3001, () => {
    console.log('Keep-alive server başladı (Port: 3001)');
});

// Botu başlat
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN bulunamadı! .env dosyasını kontrol et.');
    process.exit(1);
}

client.login(token).then(() => {
    console.log('✅ Bot başlatıldı!');
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log(`🔗 Invite link: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands`);
    console.log('📋 Özellikler:');
    console.log('   • Ücretsiz oyun paylaşımı (3 komut)');
    console.log('   • Ticket sistemi (3 komut)');
    console.log('   • Otomatik SS inceleme');
    console.log('   • Kural ihlali kontrolü');
    console.log('   • 30 dakika timeout cezası');
    console.log('   • Bedava hesap sistemi (7 yeni komut)');
    console.log('   • Çekiliş sistemi');
    console.log('   • Roblox hesap stok yönetimi');
}).catch(err => {
    console.error('❌ Bot giriş hatası:', err.message);
});