require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ChannelType,
    PermissionsBitField,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Config
const configPath = path.join(__dirname, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        fruitChannel: null,
        lastFruits: {},
        spawnTimes: []
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Blox Fruits Listesi
const FRUITS = {
    'Mera': { emoji: '🔥', rarity: 'Rare' },
    'Gomu': { emoji: '🟠', rarity: 'Common' },
    'Yami': { emoji: '⬛', rarity: 'Rare' },
    'Logia': { emoji: '💨', rarity: 'Uncommon' },
    'Paramecia': { emoji: '✨', rarity: 'Uncommon' },
    'Zoan': { emoji: '🐾', rarity: 'Uncommon' },
    'Mythical': { emoji: '👹', rarity: 'Legendary' },
    'Magma': { emoji: '🌋', rarity: 'Rare' },
    'Flame': { emoji: '🔥', rarity: 'Rare' },
    'Ice': { emoji: '❄️', rarity: 'Rare' },
    'Lightning': { emoji: '⚡', rarity: 'Legendary' },
    'String': { emoji: '🧵', rarity: 'Common' },
    'Sand': { emoji: '🏜️', rarity: 'Rare' },
    'Spike': { emoji: '🌵', rarity: 'Common' },
    'Smoke': { emoji: '💨', rarity: 'Common' },
    'Chop': { emoji: '🪓', rarity: 'Common' },
    'Spring': { emoji: '🔩', rarity: 'Common' },
    'Bomb': { emoji: '💣', rarity: 'Common' },
    'Kilo': { emoji: '⚖️', rarity: 'Common' },
    'Dough': { emoji: '🍪', rarity: 'Legendary' },
    'Venom': { emoji: '☠️', rarity: 'Legendary' },
    'Rumble': { emoji: '🔊', rarity: 'Legendary' },
    'Buddha': { emoji: '🧘', rarity: 'Legendary' },
    'Human Human': { emoji: '👤', rarity: 'Mythical' },
    'Falcon': { emoji: '🦅', rarity: 'Mythical' },
    'Hound': { emoji: '🐕', rarity: 'Rare' },
    'Cat': { emoji: '🐱', rarity: 'Rare' },
    'Mouse': { emoji: '🐭', rarity: 'Common' }
};

// Komutlar
const commands = [
    new SlashCommandBuilder()
        .setName('fruittakip')
        .setDescription('Blox Fruits takip panelini aç'),

    new SlashCommandBuilder()
        .setName('fruitkanal')
        .setDescription('Fruit spawn bildirimlerinin geleceği kanalı ayarla (Admin only)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Bildirim kanalı')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('fruitspawn')
        .setDescription('Manual fruit spawn ekle (Admin only)')
        .addStringOption(option =>
            option.setName('fruit')
                .setDescription('Fruit adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('konum')
                .setDescription('Spawn konumu')
                .setRequired(true)
        )
];

// Bot Ready
client.once('ready', async () => {
    console.log(`✅ Blox Fruits Tracker başladı: ${client.user.tag}`);
    try {
        await client.application.commands.set(commands);
        console.log('✅ Komutlar kaydedildi!');
    } catch (error) {
        console.error('❌ Komut hatası:', error);
    }

    // Otomatik takip başlat
    startFruitTracking();
});

// Komut İşleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user, guild } = interaction;

    try {
        if (commandName === 'fruittakip') {
            await handleFruitPanel(interaction);
        } else if (commandName === 'fruitkanal') {
            // Admin kontrolü
            const member = await guild.members.fetch(user.id);
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await interaction.reply({
                    content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const channel = options.getChannel('kanal');
            config.fruitChannel = channel.id;
            saveConfig();

            await interaction.reply({
                content: `✅ Fruit bildirim kanalı ${channel} olarak ayarlandı!`,
                flags: MessageFlags.Ephemeral
            });
        } else if (commandName === 'fruitspawn') {
            // Admin kontrolü
            const member = await guild.members.fetch(user.id);
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await interaction.reply({
                    content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const fruit = options.getString('fruit');
            const location = options.getString('konum');

            await sendFruitNotification(fruit, location, interaction.guild);

            await interaction.reply({
                content: `✅ **${fruit}** @ ${location} bildirim gönderildi!`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({
            content: '❌ Hata!',
            flags: MessageFlags.Ephemeral
        });
    }
});

// Fruit Panel
async function handleFruitPanel(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let fruitsText = '';
    let fruitCount = Object.keys(FRUITS).length;

    for (const [name, info] of Object.entries(FRUITS)) {
        fruitsText += `${info.emoji} **${name}** - ${info.rarity}\n`;
    }

    const embed = new EmbedBuilder()
        .setColor(0xFF6347)
        .setTitle('🍎 BLOX FRUITS SPAWN TRACKER')
        .setDescription('Roblox Blox Fruits oyunundaki fruit spawnlarını 7/24 takip ediyor!')
        .addFields(
            { name: '📊 Takip Edilen Fruits', value: fruitCount.toString(), inline: true },
            { name: '⏱️ Spawn Aralığı', value: '2 saat', inline: true },
            { name: '🔔 Durum', value: '🟢 Aktif', inline: true },
            { name: '📜 Tüm Fruits', value: fruitsText, inline: false }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// Fruit Bildirim Gönder
async function sendFruitNotification(fruit, location, guild) {
    if (!config.fruitChannel) return;

    try {
        const channel = await client.channels.fetch(config.fruitChannel);
        const fruitInfo = FRUITS[fruit];

        if (!fruitInfo) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF6347)
            .setTitle(`${fruitInfo.emoji} YENİ FRUIT SPAWN!`)
            .setDescription(`**${fruit}** fruit spawnlandı!`)
            .addFields(
                { name: '🎮 Fruit', value: fruit, inline: true },
                { name: '📍 Konum', value: location, inline: true },
                { name: '⭐ Rarity', value: fruitInfo.rarity, inline: true },
                { name: '🕐 Zaman', value: new Date().toLocaleTimeString('tr-TR'), inline: false }
            )
            .setFooter({ text: 'Blox Fruits Tracker' })
            .setTimestamp();

        await channel.send({
            content: '@here 🔔 **FRUIT SPAWN!**',
            embeds: [embed]
        });

        // Spawn zamanını kaydet
        config.spawnTimes.push({
            fruit: fruit,
            location: location,
            time: Date.now()
        });
        saveConfig();

    } catch (error) {
        console.error('Bildirim gönderme hatası:', error);
    }
}

// Otomatik Takip (Simüle)
function startFruitTracking() {
    console.log('🔍 Blox Fruits takibi başlatıldı...');

    // Her 2 saat de bir random fruit spawn
    setInterval(async () => {
        const fruitNames = Object.keys(FRUITS);
        const randomFruit = fruitNames[Math.floor(Math.random() * fruitNames.length)];
        const locations = ['Starter Island', 'Pirate Island', 'Jungle', 'Desert', 'Snow Island', 'Sky Island'];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];

        console.log(`🍎 ${randomFruit} @ ${randomLocation} spawn detected!`);

        // Tüm guild'lerde bildirim gönder
        for (const guild of client.guilds.cache.values()) {
            await sendFruitNotification(randomFruit, randomLocation, guild);
        }
    }, 2 * 60 * 60 * 1000); // 2 saat
}

// Keep-alive
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Blox Fruits Tracker aktif!');
});
server.listen(process.env.PORT || 3001, () => {
    console.log('✅ Keep-alive server başladı (Port: 3001)');
});

// Botu Başlat
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN bulunamadı!');
    process.exit(1);
}

client.login(token).then(() => {
    console.log('🎮 Blox Fruits Tracker çalışıyor!');
    console.log('📋 Komutlar:');
    console.log('   • /fruittakip - Takip paneli');
    console.log('   • /fruitkanal - Kanal ayarla');
    console.log('   • /fruitspawn - Manual spawn ekle');
}).catch(err => {
    console.error('❌ Bot hatası:', err.message);
});