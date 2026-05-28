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
        logChannels: {},
        ruleChannels: {}, // Kurallar kanalı
        warningRoles: {},
        allowedDomains: [ // Varsayılan izinli domainler
            'youtube.com', 'youtu.be',
            'twitch.tv',
            'discord.com', 'discord.gg',
            'github.com',
            'steampowered.com',
            'epicgames.com',
            'spotify.com',
            'netflix.com'
        ],
        bannedDomains: [], // Yasaklı domainler
        gifControl: true, // GIF kontrolü aktif mi?
        ticketChannels: {}, // Ticket kanalları
        activeTickets: {}, // Aktif ticketlar { ticketId: { userId, channelId, subject, proof } }
        giveaways: {}, // Aktif giveaway'lar
        admins: ['umutpapa123'], // Sadece bu kullanıcı yetkili ekleyebilir
        moderators: []
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Uyarı sistemi
const warnings = new Collection(); // { guildId: { userId: { count: number, lastWarning: timestamp } } }

// İzinli linkler
const ALLOWED_DOMAINS = [
    'youtube.com', 'youtu.be',
    'twitch.tv',
    'discord.com', 'discord.gg',
    'github.com',
    'steampowered.com',
    'epicgames.com',
    'spotify.com',
    'netflix.com'
];

// Kötü link pattern'leri
const BAD_PATTERNS = [
    /porn/i,
    /xxx/i,
    /nsfw/i,
    /hack/i,
    /cheat/i,
    /crack/i,
    /virus/i,
    /malware/i,
    /phishing/i
];

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

    // MODERASYON KOMUTLARI
    new SlashCommandBuilder()
        .setName('logayarla')
        .setDescription('Log kanalını belirler')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Logların gönderileceği kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('kurallarkanalıayarla')
        .setDescription('Sunucu kurallarının olduğu kanalı belirler')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Kuralların olduğu kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('sunucukuralları')
        .setDescription('Sunucu kurallarını gösterir (otomatik okur)'),

    new SlashCommandBuilder()
        .setName('kuralihlalirol')
        .setDescription('Kural ihlali rollerini ayarlar')
        .addRoleOption(option =>
            option.setName('birinciuyarı')
                .setDescription('1. uyarı rolü')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('ikinciuyarı')
                .setDescription('2. uyarı rolü')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('üçüncüuyarı')
                .setDescription('3. uyarı rolü (30 dakika mute)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('yetkiliekle')
        .setDescription('Yetkili ekler (sadece umutpapa123)')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Yetkili eklenecek kullanıcı')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('uyarıver')
        .setDescription('Kullanıcıya uyarı verir')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Uyarı verilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Uyarı sebebi')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('uyarılarıtemizle')
        .setDescription('Kullanıcının uyarılarını temizler')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Uyarıları temizlenecek kullanıcı')
                .setRequired(true)
        ),

    // KURAL AYARLARI
    new SlashCommandBuilder()
        .setName('linkizniver')
        .setDescription('Link için izin verilen domain ekler')
        .addStringOption(option =>
            option.setName('domain')
                .setDescription('İzin verilecek domain (örn: youtube.com)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('linkyasakla')
        .setDescription('Link için yasaklı domain ekler')
        .addStringOption(option =>
            option.setName('domain')
                .setDescription('Yasaklanacak domain')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('gifikontrolü')
        .setDescription('GIF kontrolünü aç/kapat')
        .addBooleanOption(option =>
            option.setName('aktif')
                .setDescription('GIF kontrolü aktif mi?')
                .setRequired(true)
        ),

    // YENİ KOMUTLAR
    new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Botu yeniden başlatır (sadece umutpapa123)'),

    new SlashCommandBuilder()
        .setName('ticketkanalıayarla')
        .setDescription('Ticket kanalını belirler')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Ticket açma kanalı')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('ticketaç')
        .setDescription('Yeni ticket açar')
        .addStringOption(option =>
            option.setName('konu')
                .setDescription('Ticket konusu')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('açıklama')
                .setDescription('Detaylı açıklama')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ticketkapat')
        .setDescription('Ticketı kapatır')
        .addStringOption(option =>
            option.setName('ticketid')
                .setDescription('Kapatılacak ticket ID')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('giveawaybaşlat')
        .setDescription('Giveaway başlatır')
        .addStringOption(option =>
            option.setName('ödül')
                .setDescription('Giveaway ödülü')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('kazanan')
                .setDescription('Kaç kazanan olacak?')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10)
        )
        .addIntegerOption(option =>
            option.setName('süre')
                .setDescription('Süre (dakika)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10080) // 7 gün
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

        // MODERASYON KOMUTLARI
        } else if (commandName === 'logayarla') {
            await handleLogChannelSet(interaction, options);
        } else if (commandName === 'kurallarkanalıayarla') {
            await handleRuleChannelSet(interaction, options);
        } else if (commandName === 'sunucukuralları') {
            await handleShowRules(interaction);
        } else if (commandName === 'kuralihlalirol') {
            await handleWarningRoles(interaction, options);
        } else if (commandName === 'yetkiliekle') {
            await handleAddModerator(interaction, options, user);
        } else if (commandName === 'uyarıver') {
            await handleWarnUser(interaction, options);
        } else if (commandName === 'uyarılarıtemizle') {
            await handleClearWarnings(interaction, options);
        } else if (commandName === 'linkizniver') {
            await handleAllowDomain(interaction, options);
        } else if (commandName === 'linkyasakla') {
            await handleBanDomain(interaction, options);
        } else if (commandName === 'gifikontrolü') {
            await handleGifControl(interaction, options);
        } else if (commandName === 'restart') {
            await handleRestart(interaction, user);
        } else if (commandName === 'ticketkanalıayarla') {
            await handleTicketChannelSet(interaction, options);
        } else if (commandName === 'ticketaç') {
            await handleTicketOpen(interaction, options);
        } else if (commandName === 'ticketkapat') {
            await handleTicketClose(interaction, options);
        } else if (commandName === 'giveawaybaşlat') {
            await handleGiveawayStart(interaction, options);
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({ 
            content: '❌ Komut işlenirken hata!', 
            ephemeral: true 
        });
    }
});

// ========== MESAJ FİLTRELEME ==========
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const guildId = message.guild.id;
    const logChannelId = config.logChannels[guildId];
    
    // Link kontrolü
    const links = extractLinks(message.content);
    if (links.length > 0) {
        const badLinks = links.filter(link => isBadLink(link));
        
        if (badLinks.length > 0) {
            // Kötü link bulundu
            await message.delete();
            await message.channel.send(`${message.author}, kötü link paylaşımı yasak!`);
            
            // Uyarı ver
            await giveWarning(message.guild.id, message.author.id, 'Kötü link paylaşımı');
            
            // Log'a yaz
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🚨 KÖTÜ LİNK TESPİT EDİLDİ')
                        .addFields(
                            { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                            { name: 'Kanal', value: `${message.channel.name}`, inline: true },
                            { name: 'Link', value: badLinks.join(', '), inline: false },
                            { name: 'İşlem', value: 'Mesaj silindi + Uyarı verildi', inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }
            }
            
            // Yetkililere bildir
            await notifyModerators(message.guild, `${message.author.tag} kötü link paylaştı: ${badLinks.join(', ')}`);
        } else {
            // İzinli link, log'a yaz
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('🔗 LİNK PAYLAŞIMI')
                        .addFields(
                            { name: 'Kullanıcı', value: `${message.author.tag}`, inline: true },
                            { name: 'Kanal', value: `${message.channel.name}`, inline: true },
                            { name: 'Link', value: links.join(', '), inline: false }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }
            }
        }
    }
    
    // GIF kontrolü
    if (config.gifControl && (message.content.includes('.gif') || message.attachments.some(a => a.url.includes('.gif')))) {
        if (logChannelId) {
            const logChannel = await client.channels.fetch(logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('🎬 GIF PAYLAŞIMI')
                    .addFields(
                        { name: 'Kullanıcı', value: `${message.author.tag}`, inline: true },
                        { name: 'Kanal', value: `${message.channel.name}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    }
});

// ========== OYUNCU GİRİŞ/ÇIKIŞ ==========
client.on('guildMemberAdd', async member => {
    const guildId = member.guild.id;
    const logChannelId = config.logChannels[guildId];
    
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ YENİ ÜYE')
                .addFields(
                    { name: 'Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Hesap Oluşturulma', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    }
});

client.on('guildMemberRemove', async member => {
    const guildId = member.guild.id;
    const logChannelId = config.logChannels[guildId];
    
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ ÜYE AYRILDI')
                .addFields(
                    { name: 'Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Katılma Tarihi', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    }
});

// ========== FONKSİYONLAR ==========

// Oyun komutları
async function handleGameChannelSet(interaction, options) {
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

// Moderasyon komutları
async function handleLogChannelSet(interaction, options) {
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.logChannels[guildId] = channel.id;
    saveConfig();
    
    await interaction.reply({
        content: `✅ Log kanalı ${channel} olarak ayarlandı!`,
        ephemeral: true
    });
}

async function handleShowRules(interaction) {
    const guildId = interaction.guildId;
    
    // Sunucu kurallarını oku
    const serverRules = await readServerRules(guildId);
    
    let rulesText = '';
    
    if (serverRules) {
        rulesText = `**📜 SUNUCU KURALLARI (OTOMATİK OKUNDU) 📜**\n\n${serverRules}\n`;
    } else {
        rulesText = `**📜 SUNUCU KURALLARI 📜**\n\nKurallar kanalı ayarlanmamış. \`/kurallarkanalıayarla\` komutu ile kurallar kanalını belirleyin.\n\n`;
    }
    
    rulesText += `
**⚠️ BOT UYARI SİSTEMİ:**
• 1. Uyarı: Uyarı rolü
• 2. Uyarı: 2. uyarı rolü  
• 3. Uyarı: 30 dakika mute

**🔗 İZİNLİ LİNKLER:**
${config.allowedDomains.map(d => `• ${d}`).join('\n')}

**🚫 YASAKLI LİNKLER:**
${config.bannedDomains.length > 0 ? config.bannedDomains.map(d => `• ${d}`).join('\n') : '• Henüz yasaklı domain yok'}

**🎬 GIF KONTROLÜ:** ${config.gifControl ? '✅ Açık' : '❌ Kapalı'}

Kurallara uymayanlar otomatik olarak uyarılacak ve yetkililere bildirilecektir.
    `;
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📜 SUNUCU KURALLARI')
        .setDescription(rulesText)
        .addFields(
            { name: '📊 İstatistikler', value: `İzinli Domain: ${config.allowedDomains.length}\nYasaklı Domain: ${config.bannedDomains.length}`, inline: true }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleWarningRoles(interaction, options) {
    const firstRole = options.getRole('birinciuyarı');
    const secondRole = options.getRole('ikinciuyarı');
    const thirdRole = options.getRole('üçüncüuyarı');
    const guildId = interaction.guildId;
    
    if (!config.warningRoles[guildId]) {
        config.warningRoles[guildId] = {};
    }
    
    config.warningRoles[guildId] = {
        first: firstRole.id,
        second: secondRole.id,
        third: thirdRole.id
    };
    saveConfig();
    
    await interaction.reply({
        content: `✅ Uyarı roller ayarlandı:\n1. ${firstRole.name}\n2. ${secondRole.name}\n3. ${thirdRole.name} (30dk mute)`,
        ephemeral: true
    });
}

async function handleAddModerator(interaction, options, user) {
    // Sadece umutpapa123 ekleyebilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    const targetUser = options.getUser('kullanıcı');
    
    if (!config.moderators.includes(targetUser.id)) {
        config.moderators.push(targetUser.id);
        saveConfig();
        
        await interaction.reply({
            content: `✅ ${targetUser.tag} yetkili olarak eklendi!`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: `❌ ${targetUser.tag} zaten yetkili!`,
            ephemeral: true
        });
    }
}

async function handleWarnUser(interaction, options) {
    const targetUser = options.getUser('kullanıcı');
    const reason = options.getString('sebep');
    const guildId = interaction.guildId;
    
    // Uyarı ver
    const warningCount = await giveWarning(guildId, targetUser.id, reason);
    
    // Kullanıcıya DM
    try {
        await targetUser.send(`⚠️ **UYARI ALDIN!**\nSunucu: ${interaction.guild.name}\nSebep: ${reason}\nToplam uyarı: ${warningCount}/3`);
    } catch (e) {
        console.log('DM gönderilemedi');
    }
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⚠️ UYARI VERİLDİ')
                .addFields(
                    { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false },
                    { name: 'Toplam Uyarı', value: `${warningCount}/3`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
    }
    
    await interaction.reply({
        content: `✅ ${targetUser.tag} uyarıldı! (${warningCount}/3)`,
        ephemeral: true
    });
}

async function handleClearWarnings(interaction, options) {
    const targetUser = options.getUser('kullanıcı');
    const guildId = interaction.guildId;
    
    if (!warnings.has(guildId)) {
        warnings.set(guildId, {});
    }
    
    const guildWarnings = warnings.get(guildId);
    delete guildWarnings[targetUser.id];
    
    // Rolleri temizle
    const member = await interaction.guild.members.fetch(targetUser.id);
    const warningRoles = config.warningRoles[guildId];
    
    if (warningRoles) {
        if (warningRoles.first) await member.roles.remove(warningRoles.first).catch(() => {});
        if (warningRoles.second) await member.roles.remove(warningRoles.second).catch(() => {});
        if (warningRoles.third) await member.roles.remove(warningRoles.third).catch(() => {});
    }
    
    await interaction.reply({
        content: `✅ ${targetUser.tag} uyarıları temizlendi!`,
        ephemeral: true
    });
}

// Uyarı sistemi
async function giveWarning(guildId, userId, reason) {
    if (!warnings.has(guildId)) {
        warnings.set(guildId, {});
    }
    
    const guildWarnings = warnings.get(guildId);
    
    if (!guildWarnings[userId]) {
        guildWarnings[userId] = { count: 0, lastWarning: Date.now() };
    }
    
    guildWarnings[userId].count++;
    guildWarnings[userId].lastWarning = Date.now();
    
    const warningCount = guildWarnings[userId].count;
    
    // Rol uygula
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const warningRoles = config.warningRoles[guildId];
            
            if (warningCount === 1 && warningRoles?.first) {
                await member.roles.add(warningRoles.first);
            } else if (warningCount === 2 && warningRoles?.second) {
                await member.roles.add(warningRoles.second);
                await member.roles.remove(warningRoles.first).catch(() => {});
            } else if (warningCount >= 3 && warningRoles?.third) {
                await member.roles.add(warningRoles.third);
                await member.roles.remove(warningRoles.second).catch(() => {});
                
                // 30 dakika mute
                await member.timeout(30 * 60 * 1000, '3. uyarı - otomatik mute');
                
                // 30 dakika sonra rolü kaldır
                setTimeout(async () => {
                    try {
                        await member.roles.remove(warningRoles.third);
                        guildWarnings[userId].count = 0;
                    } catch (e) {
                        console.error('Rol kaldırma hatası:', e);
                    }
                }, 30 * 60 * 1000);
            }
        }
    }
    
    // Yetkililere bildir
    if (warningCount >= 2) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            await notifyModerators(guild, `${userId} kullanıcısı ${warningCount}. uyarısını aldı! Sebep: ${reason}`);
        }
    }
    
    return warningCount;
}

// Yeni moderasyon fonksiyonları
async function handleRuleChannelSet(interaction, options) {
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.ruleChannels[guildId] = channel.id;
    saveConfig();
    
    await interaction.reply({
        content: `✅ Kurallar kanalı ${channel} olarak ayarlandı! Bot bu kanaldan kuralları okuyacak.`,
        ephemeral: true
    });
}

async function handleAllowDomain(interaction, options) {
    const domain = options.getString('domain').toLowerCase();
    const guildId = interaction.guildId;
    
    if (!config.allowedDomains.includes(domain)) {
        config.allowedDomains.push(domain);
        saveConfig();
        
        await interaction.reply({
            content: `✅ ${domain} izinli domainlere eklendi!`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: `❌ ${domain} zaten izinli!`,
            ephemeral: true
        });
    }
}

async function handleBanDomain(interaction, options) {
    const domain = options.getString('domain').toLowerCase();
    const guildId = interaction.guildId;
    
    if (!config.bannedDomains.includes(domain)) {
        config.bannedDomains.push(domain);
        saveConfig();
        
        await interaction.reply({
            content: `✅ ${domain} yasaklı domainlere eklendi!`,
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: `❌ ${domain} zaten yasaklı!`,
            ephemeral: true
        });
    }
}

async function handleGifControl(interaction, options) {
    const active = options.getBoolean('aktif');
    const guildId = interaction.guildId;
    
    config.gifControl = active;
    saveConfig();
    
    await interaction.reply({
        content: `✅ GIF kontrolü ${active ? 'açıldı' : 'kapatıldı'}!`,
        ephemeral: true
    });
}

// ========== YENİ FONKSİYONLAR ==========

// Restart komutu
async function handleRestart(interaction, user) {
    // Sadece umutpapa123 yapabilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    await interaction.reply({
        content: '🔄 Bot yeniden başlatılıyor...',
        ephemeral: true
    });
    
    console.log(`Bot ${user.tag} tarafından yeniden başlatıldı.`);
    
    // 3 saniye bekle ve process'i yeniden başlat
    setTimeout(() => {
        process.exit(0);
    }, 3000);
}

// Ticket kanalı ayarla
async function handleTicketChannelSet(interaction, options) {
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.ticketChannels[guildId] = channel.id;
    saveConfig();
    
    // Ticket açma butonu oluştur
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('🎫 Ticket Aç')
                .setStyle(ButtonStyle.Primary)
        );
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎫 TICKET SİSTEMİ')
        .setDescription('Bir sorununuz mu var? Şikayetiniz mi var? Aşağıdaki butona tıklayarak ticket açabilirsiniz.\n\n**Önemli:** Lütfen kanıtlarınızı (ekran görüntüsü, video, link) ticket açarken ekleyin.')
        .addFields(
            { name: '📋 Ticket Türleri', value: '• Şikayet\n• Sorun\n• Öneri\n• Diğer', inline: true },
            { name: '⏱️ Yanıt Süresi', value: '24 saat içinde', inline: true }
        )
        .setTimestamp();
    
    await channel.send({ embeds: [embed], components: [row] });
    
    await interaction.reply({
        content: `✅ Ticket kanalı ${channel} olarak ayarlandı ve buton eklendi!`,
        ephemeral: true
    });
}

// Ticket aç
async function handleTicketOpen(interaction, options) {
    const subject = options.getString('konu');
    const description = options.getString('açıklama');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    // Ticket kanalı var mı?
    const ticketChannelId = config.ticketChannels[guildId];
    if (!ticketChannelId) {
        await interaction.reply({
            content: '❌ Önce ticket kanalı ayarlayın! `/ticketkanalıayarla`',
            ephemeral: true
        });
        return;
    }
    
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
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: client.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
            }
        ]
    });
    
    // Moderator'ları ekle
    for (const modId of config.moderators) {
        await ticketChannel.permissionOverwrites.create(modId, {
            ViewChannel: true,
            SendMessages: true
        });
    }
    
    // Ticket'ı kaydet
    if (!config.activeTickets[guildId]) {
        config.activeTickets[guildId] = {};
    }
    
    config.activeTickets[guildId][ticketId] = {
        userId: userId,
        channelId: ticketChannel.id,
        subject: subject,
        description: description,
        createdAt: Date.now(),
        status: 'open'
    };
    saveConfig();
    
    // Ticket kanalına mesaj gönder
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`🎫 TICKET #${ticketId}`)
        .addFields(
            { name: '👤 Açan', value: `${interaction.user.tag} (${userId})`, inline: true },
            { name: '📌 Konu', value: subject, inline: true },
            { name: '📝 Açıklama', value: description, inline: false },
            { name: '🕐 Açılma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '📊 Durum', value: '🔓 Açık', inline: true }
        )
        .setFooter({ text: 'Lütfen kanıtlarınızı bu kanala gönderin' })
        .setTimestamp();
    
    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`close_ticket_${ticketId}`)
                .setLabel('🔒 Ticketı Kapat')
                .setStyle(ButtonStyle.Danger)
        );
    
    await ticketChannel.send({ 
        content: `${interaction.user} hoş geldin! Yetkililer yakında ilgilenecek.\n\n**Yetkililer:** ${config.moderators.map(id => `<@${id}>`).join(' ')}`,
        embeds: [embed],
        components: [closeButton]
    });
    
    // Log kanalına bildir
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🎫 YENİ TICKET AÇILDI')
                .addFields(
                    { name: 'Ticket ID', value: ticketId, inline: true },
                    { name: 'Kullanıcı', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Konu', value: subject, inline: false },
                    { name: 'Kanal', value: `${ticketChannel}`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
    
    // Yetkililere DM
    for (const modId of config.moderators) {
        try {
            const mod = await guild.members.fetch(modId);
            if (mod) {
                await mod.send(`🔔 **YENİ TICKET!**\nTicket ID: ${ticketId}\nKullanıcı: ${interaction.user.tag}\nKonu: ${subject}\nKanal: ${ticketChannel}`);
            }
        } catch (e) {
            console.log('Moderatöre DM gönderilemedi:', modId);
        }
    }
    
    await interaction.reply({
        content: `✅ Ticket açıldı! Kanal: ${ticketChannel}\n**Ticket ID:** ${ticketId}`,
        ephemeral: true
    });
}

// Ticket kapat
async function handleTicketClose(interaction, options) {
    const ticketId = options.getString('ticketid');
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
    const isModerator = config.moderators.includes(interaction.user.id);
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
        // Kapatma mesajı
        const closeEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`🔒 TICKET KAPATILDI #${ticketId}`)
            .addFields(
                { name: '👤 Açan', value: `<@${ticket.userId}>`, inline: true },
                { name: '👮 Kapatan', value: `${interaction.user.tag}`, inline: true },
                { name: '📌 Konu', value: ticket.subject, inline: false },
                { name: '🕐 Açılma', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
                { name: '🕐 Kapanma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
        
        await ticketChannel.send({ embeds: [closeEmbed] });
        
        // 10 saniye sonra kanalı sil
        setTimeout(async () => {
            try {
                await ticketChannel.delete('Ticket kapatıldı');
            } catch (e) {
                console.error('Kanal silinemedi:', e);
            }
        }, 10000);
    }
    
    // Ticket'ı sil
    delete config.activeTickets[guildId][ticketId];
    saveConfig();
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 TICKET KAPATILDI')
                .addFields(
                    { name: 'Ticket ID', value: ticketId, inline: true },
                    { name: 'Kullanıcı', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Kapatan', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Süre', value: `${Math.floor((Date.now() - ticket.createdAt) / 60000)} dakika`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
    
    await interaction.reply({
        content: `✅ Ticket #${ticketId} kapatıldı! Kanal 10 saniye sonra silinecek.`,
        ephemeral: true
    });
}

// Giveaway başlat
async function handleGiveawayStart(interaction, options) {
    const prize = options.getString('ödül');
    const winners = options.getInteger('kazanan');
    const duration = options.getInteger('süre'); // dakika
    
    const guildId = interaction.guildId;
    const giveawayId = `GIVEAWAY-${Date.now()}`;
    
    const endTime = Date.now() + (duration * 60 * 1000);
    
    // Giveaway'ı kaydet
    if (!config.giveaways[guildId]) {
        config.giveaways[guildId] = {};
    }
    
    config.giveaways[guildId][giveawayId] = {
        prize: prize,
        winners: winners,
        endTime: endTime,
        participants: [],
        creator: interaction.user.id,
        channelId: interaction.channelId,
        messageId: null
    };
    saveConfig();
    
    // Giveaway embed'i
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎉 GIVEAWAY BAŞLADI! 🎉')
        .setDescription(`**Ödül:** ${prize}\n**Kazanan Sayısı:** ${winners}\n**Süre:** ${duration} dakika`)
        .addFields(
            { name: '🎁 Katılımcılar', value: '0 kişi', inline: true },
            { name: '⏱️ Bitiş', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Katılmak için 🎉 emojisine tıklayın!' })
        .setTimestamp();
    
    const joinButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`join_giveaway_${giveawayId}`)
                .setLabel('🎉 Katıl')
                .setStyle(ButtonStyle.Success)
        );
    
    const message = await interaction.reply({ 
        content: '@everyone 🎉 **YENİ GIVEAWAY!** 🎉',
        embeds: [embed],
        components: [joinButton],
        fetchReply: true 
    });
    
    // Message ID'yi kaydet
    config.giveaways[guildId][giveawayId].messageId = message.id;
    saveConfig();
    
    // Giveaway bitiş zamanlayıcısı
    setTimeout(async () => {
        await endGiveaway(guildId, giveawayId);
    }, duration * 60 * 1000);
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎉 YENİ GIVEAWAY')
                .addFields(
                    { name: 'Ödül', value: prize, inline: true },
                    { name: 'Kazanan', value: `${winners} kişi`, inline: true },
                    { name: 'Süre', value: `${duration} dakika`, inline: true },
                    { name: 'Başlatan', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Giveaway ID', value: giveawayId, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
}

// Giveaway bitir
async function endGiveaway(guildId, giveawayId) {
    const giveaway = config.giveaways[guildId]?.[giveawayId];
    if (!giveaway) return;
    
    const participants = giveaway.participants;
    
    // Kazananları seç
    let winners = [];
    if (participants.length > 0) {
        const shuffled = [...participants].sort(() => 0.5 - Math.random());
        winners = shuffled.slice(0, Math.min(giveaway.winners, participants.length));
    }
    
    // Mesajı güncelle
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (channel) {
            const message = await channel.messages.fetch(giveaway.messageId);
            
            const resultEmbed = new EmbedBuilder()
                .setColor(winners.length > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle('🎉 GIVEAWAY SONA ERDİ! 🎉')
                .setDescription(`**Ödül:** ${giveaway.prize}\n**Katılımcı Sayısı:** ${participants.length}`)
                .addFields(
                    { name: '🏆 Kazananlar', value: winners.length > 0 ? winners.map(id => `<@${id}>`).join('\n') : 'Kazanan yok!', inline: false }
                )
                .setFooter({ text: 'Giveaway sona erdi' })
                .setTimestamp();
            
            await message.edit({ 
                embeds: [resultEmbed],
                components: [] // Butonlar�� kaldır
            });
            
            // Kazananlara bildir
            for (const winnerId of winners) {
                try {
                    const winner = await channel.guild.members.fetch(winnerId);
                    await winner.send(`🎉 **TEBRİKLER!** Giveaway kazandınız!\n**Ödül:** ${giveaway.prize}\n**Sunucu:** ${channel.guild.name}`);
                } catch (e) {
                    console.log('Kazana DM gönderilemedi:', winnerId);
                }
            }
            
            // Kazananları kanalda duyur
            if (winners.length > 0) {
                await channel.send(`🎉 **GIVEAWAY SONUÇLARI!**\nÖdül: ${giveaway.prize}\nKazananlar: ${winners.map(id => `<@${id}>`).join(', ')}\nTebrikler! 🎁`);
            }
        }
    } catch (e) {
        console.error('Giveaway sonlandırma hatası:', e);
    }
    
    // Giveaway'ı sil
    delete config.giveaways[guildId][giveawayId];
    saveConfig();
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 GIVEAWAY SONA ERDİ')
                .addFields(
                    { name: 'Ödül', value: giveaway.prize, inline: true },
                    { name: 'Katılımcı', value: `${participants.length} kişi`, inline: true },
                    { name: 'Kazanan', value: `${winners.length} kişi`, inline: true },
                    { name: 'Giveaway ID', value: giveawayId, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
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

async function notifyModerators(guild, message) {
    for (const modId of config.moderators) {
        try {
            const mod = await guild.members.fetch(modId);
            if (mod) {
                await mod.send(`🔔 **MODERASYON BİLDİRİMİ**\nSunucu: ${guild.name}\n${message}`);
            }
        } catch (e) {
            console.log('Moderatöre DM gönderilemedi:', modId);
        }
    }
}

// ========== BUTON İNTERAKSİYONLARI ==========
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { customId, guildId, user } = interaction;
    
    try {
        // Ticket açma butonu
        if (customId === 'open_ticket') {
            // Modal göster
            // (Discord.js v14'te modal desteği var ama basit tutalım)
            await interaction.reply({
                content: 'Ticket açmak için `/ticketaç` komutunu kullanın!',
                ephemeral: true
            });
        }
        
        // Ticket kapatma butonu
        else if (customId.startsWith('close_ticket_')) {
            const ticketId = customId.replace('close_ticket_', '');
            
            if (!config.activeTickets[guildId] || !config.activeTickets[guildId][ticketId]) {
                await interaction.reply({
                    content: '❌ Ticket bulunamadı!',
                    ephemeral: true
                });
                return;
            }
            
            const ticket = config.activeTickets[guildId][ticketId];
            
            // Sadece yetkili veya ticket sahibi kapatabilir
            const isModerator = config.moderators.includes(interaction.user.id);
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
                // Kapatma mesajı
                const closeEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`🔒 TICKET KAPATILDI #${ticketId}`)
                    .addFields(
                        { name: '👤 Açan', value: `<@${ticket.userId}>`, inline: true },
                        { name: '👮 Kapatan', value: `${interaction.user.tag}`, inline: true },
                        { name: '📌 Konu', value: ticket.subject, inline: false },
                        { name: '🕐 Açılma', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
                        { name: '🕐 Kapanma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();
                
                await ticketChannel.send({ embeds: [closeEmbed] });
                
                // 10 saniye sonra kanalı sil
                setTimeout(async () => {
                    try {
                        await ticketChannel.delete('Ticket kapatıldı');
                    } catch (e) {
                        console.error('Kanal silinemedi:', e);
                    }
                }, 10000);
            }
            
            // Ticket'ı sil
            delete config.activeTickets[guildId][ticketId];
            saveConfig();
            
            // Log
            const logChannelId = config.logChannels[guildId];
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🔒 TICKET KAPATILDI')
                        .addFields(
                            { name: 'Ticket ID', value: ticketId, inline: true },
                            { name: 'Kullanıcı', value: `<@${ticket.userId}>`, inline: true },
                            { name: 'Kapatan', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Süre', value: `${Math.floor((Date.now() - ticket.createdAt) / 60000)} dakika`, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
            
            await interaction.reply({
                content: `✅ Ticket #${ticketId} kapatıldı! Kanal 10 saniye sonra silinecek.`,
                ephemeral: true
            });
        }
        
        // Giveaway katılma butonu
        else if (customId.startsWith('join_giveaway_')) {
            const giveawayId = customId.replace('join_giveaway_', '');
            const giveaway = config.giveaways[guildId]?.[giveawayId];
            
            if (!giveaway) {
                await interaction.reply({
                    content: '❌ Giveaway bulunamadı!',
                    ephemeral: true
                });
                return;
            }
            
            if (giveaway.endTime < Date.now()) {
                await interaction.reply({
                    content: '❌ Giveaway sona ermiş!',
                    ephemeral: true
                });
                return;
            }
            
            if (!giveaway.participants.includes(user.id)) {
                giveaway.participants.push(user.id);
                saveConfig();
                
                // Katılımcı sayısını güncelle
                try {
                    const channel = await client.channels.fetch(giveaway.channelId);
                    if (channel) {
                        const message = await channel.messages.fetch(giveaway.messageId);
                        const embed = message.embeds[0];
                        
                        const newEmbed = EmbedBuilder.from(embed)
                            .spliceFields(0, 1, { 
                                name: '🎁 Katılımcılar', 
                                value: `${giveaway.participants.length} kişi`, 
                                inline: true 
                            });
                        
                        await message.edit({ embeds: [newEmbed] });
                    }
                } catch (e) {
                    console.error('Giveaway güncelleme hatası:', e);
                }
                
                await interaction.reply({
                    content: '✅ Giveaway\'a katıldınız! 🎉',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Zaten giveaway\'a katıldınız!',
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error('Button hatası:', error);
        await interaction.reply({
            content: '❌ İşlem sırasında hata!',
            ephemeral: true
        });
    }
});

// Link kontrolü - GÜNCELLENMİŞ
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

function isBadLink(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        
        // Yasaklı domain kontrolü
        const isBanned = config.bannedDomains.some(banned => domain.includes(banned));
        if (isBanned) return true;
        
        // İzinli domain kontrolü
        const isAllowed = config.allowedDomains.some(allowed => domain.includes(allowed));
        if (isAllowed) return false;
        
        // Kötü pattern kontrolü
        const isBad = BAD_PATTERNS.some(pattern => url.match(pattern));
        return isBad;
    } catch (e) {
        return false;
    }
}

// Oyun fonksiyonları (aynı)
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
server.listen(process.env.PORT || 3000, () => {
    console.log('Keep-alive server başladı');
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
    console.log('   • Ücretsiz oyun paylaşımı');
    console.log('   • Log sistemi');
    console.log('   • Link filtresi');
    console.log('   • Uyarı sistemi (1-2-3)');
    console.log('   • Otomatik moderasyon');
}).catch(err => {
    console.error('❌ Bot giriş hatası:', err.message);
});