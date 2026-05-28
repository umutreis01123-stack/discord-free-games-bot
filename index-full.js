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
        rules: {},
        warningRoles: {},
        admins: ['umutpapa123u'], // Sadece bu kullanıcı yetkili ekleyebilir
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
        .setName('sunucukuralları')
        .setDescription('Sunucu kurallarını gösterir'),

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
        .setDescription('Yetkili ekler (sadece umutpapa123u)')
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
    
    // GIF kontrolü (basit)
    if (message.content.includes('.gif') || message.attachments.some(a => a.url.includes('.gif'))) {
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
    const rules = `
**📜 SUNUCU KURALLARI 📜**

1. **Küfür ve hakaret yasaktır**
2. **Spam yapmak yasaktır**
3. **Kötü link paylaşımı yasaktır**
4. **Reklam yapmak yasaktır**
5. **Diğer üyelere saygılı olun**

**⚠️ UYARI SİSTEMİ:**
• 1. Uyarı: Uyarı rolü
• 2. Uyarı: 2. uyarı rolü  
• 3. Uyarı: 30 dakika mute

**🔗 İZİNLİ LİNKLER:**
• YouTube, Twitch, Discord
• GitHub, Steam, Epic Games
• Spotify, Netflix

Kurallara uymayanlar otomatik olarak uyarılacak ve yetkililere bildirilecektir.
    `;
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📜 SUNUCU KURALLARI')
        .setDescription(rules)
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
    // Sadece umutpapa123u ekleyebilir
    if (user.username !== 'umutpapa123u') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123u kullanabilir!',
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

// Link kontrolü
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

function isBadLink(url) {
    const domain = new URL(url).hostname.toLowerCase();
    
    // İzinli domain kontrolü
    const isAllowed = ALLOWED_DOMAINS.some(allowed => domain.includes(allowed));
    if (isAllowed) return false;
    
    // Kötü pattern kontrolü
    const isBad = BAD_PATTERNS.some(pattern => url.match(pattern));
    return isBad;
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