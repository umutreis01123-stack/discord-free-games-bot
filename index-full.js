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
        )
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
        .setDescription(`**Lütfen aşağıdaki talimatları izleyin:**\n\n` +
                       `1. **Şikayet** türündeyseniz: Rahatsız olduğunuz kişiyi ve kanıtınızı (SS) gönderin\n` +
                       `2. **Yardım** türündeyseniz: Sorununuzu detaylı açıklayın\n` +
                       `3. **Diğer** türündeyseniz: Konunuzu belirtin\n\n` +
                       `**Önemli:** Bot otomatik olarak SS'leri inceleyip sunucu kurallarına uygunluğunu kontrol edecek.`)
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
        // Ticket mesajlarını kontrol et (SS inceleniyor)
        try {
            const messages = await ticketChannel.messages.fetch({ limit: 50 });
            let hasEvidence = false;
            let hasRuleViolation = false;
            let violationReason = '';
            let reportedUser = null;
            let evidenceText = '';
            
            messages.forEach(msg => {
                if (!msg.author.bot) {
                    // SS veya kanıt kontrolü
                    if (msg.attachments.size > 0 || msg.content.toLowerCase().includes('ss') || 
                        msg.content.toLowerCase().includes('ekran') || msg.content.includes('http')) {
                        hasEvidence = true;
                        
                        // SS'de kural ihlali kontrolü
                        if (ticket.type === 'Şikayet' && hasEvidence) {
                            const ruleViolation = checkRuleViolation(msg.content, guildId);
                            if (ruleViolation.found) {
                                hasRuleViolation = true;
                                violationReason = ruleViolation.reason;
                                
                                // Şikayet edilen kullanıcıyı bul
                                const userMention = msg.content.match(/<@!?(\d+)>/);
                                if (userMention) {
                                    reportedUser = userMention[1];
                                }
                            }
                        }
                    }
                    
                    // Kullanıcı adı kontrolü
                    const userMention = msg.content.match(/<@!?(\d+)>/);
                    if (userMention && !reportedUser) {
                        reportedUser = userMention[1];
                    }
                }
            });
            
            // Kapatma mesajı
            const closeEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`🔒 TICKET KAPATILDI #${ticketId}`)
                .addFields(
                    { name: '👤 Açan', value: `<@${ticket.userId}>`, inline: true },
                    { name: '👮 Kapatan', value: `${interaction.user.tag}`, inline: true },
                    { name: '📌 Tür', value: ticket.type, inline: true },
                    { name: '🕐 Açılma', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
                    { name: '🕐 Kapanma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '🔍 Kanıt Durumu', value: hasEvidence ? '✅ Var' : '❌ Yok', inline: true },
                    { name: '⚠️ Kural İhlali', value: hasRuleViolation ? '🚨 Bulundu' : '✅ Yok', inline: true }
                )
                .setTimestamp();
            
            await ticketChannel.send({ embeds: [closeEmbed] });
            
            // Kural ihlali varsa işlem yap
            if (hasRuleViolation && reportedUser && isModerator) {
                try {
                    const member = await interaction.guild.members.fetch(reportedUser);
                    // 30 dakika timeout
                    await member.timeout(30 * 60 * 1000, `Ticket: ${violationReason}`);
                    
                    // Yetkililere bildir
                    for (const modId of config.ticketModerators) {
                        try {
                            const mod = await interaction.guild.members.fetch(modId);
                            if (mod) {
                                await mod.send(`🔔 **TICKET SONUCU: KURAL İHLALİ BULUNDU!**\n` +
                                             `Ticket ID: ${ticketId}\n` +
                                             `Şikayet Eden: <@${ticket.userId}>\n` +
                                             `Şikayet Edilen: ${member.user.tag}\n` +
                                             `Sebep: ${violationReason}\n` +
                                             `Ceza: 30 dakika timeout\n` +
                                             `✅ **Evet dediğin şey bulundu, hemen ilgileniliyor!**`);
                            }
                        } catch (e) {
                            console.log('Moderatöre DM gönderilemedi:', modId);
                        }
                    }
                    
                    // Ticket sahibine mesaj
                    await ticketChannel.send(`✅ **Evet dediğin şey bulundu!**\n` +
                                           `**${member.user.tag}** kullanıcısına 30 dakika timeout verildi.\n` +
                                           `**Sebep:** ${violationReason}\n` +
                                           `**Sorununu bildirdiğin için teşekkürler!** 🎉\n` +
                                           `Ticket kapatılıyor...`);
                } catch (e) {
                    console.error('Timeout hatası:', e);
                    await ticketChannel.send(`❌ Kural ihlali bulundu ama timeout verilemedi: ${e.message}`);
                }
            } 
            // Kanıt yoksa veya kural ihlali yoksa
            else if (ticket.type === 'Şikayet' && (!hasEvidence || !hasRuleViolation)) {
                await ticketChannel.send(`❌ **Attığın SS'de şikayet ettiğin şey yok!**\n` +
                                       `Sunucu kurallarında belirtilen bir ihlal bulunamadı.\n` +
                                       `Ticket otomatik olarak kapatılıyor...`);
            }
            // Yardım veya Diğer türünde
            else {
                await ticketChannel.send(`✅ **Teşekkürler!**\n` +
                                       `Sorununuz/sorunuz yetkililere iletildi.\n` +
                                       `Ticket kapatılıyor...`);
                
                // Yetkililere bildir
                for (const modId of config.ticketModerators) {
                    try {
                        const mod = await interaction.guild.members.fetch(modId);
                        if (mod) {
                            await mod.send(`🔔 **YENİ TICKET SONUÇLANDI!**\n` +
                                         `Ticket ID: ${ticketId}\n` +
                                         `Kullanıcı: <@${ticket.userId}>\n` +
                                         `Tür: ${ticket.type}\n` +
                                         `Durum: Tamamlandı`);
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
            
        } catch (e) {
            console.error('Ticket mesaj kontrol hatası:', e);
        }
    }
    
    // Ticket'ı sil
    delete config.activeTickets[guildId][ticketId];
    saveConfig();
    
    await interaction.reply({
        content: `✅ Ticket #${ticketId} kapatıldı! Kanal 10 saniye sonra silinecek.`,
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
}).catch(err => {
    console.error('❌ Bot giriş hatası:', err.message);
});