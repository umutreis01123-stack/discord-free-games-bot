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
    StringSelectMenuBuilder,
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

// Config dosyası
const configPath = path.join(__dirname, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        bloxFruitChannel: null,
        fruits: []
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Blox Fruits listesi
const BLOX_FRUITS = [
    { name: 'Mera', emoji: '🔥', color: 0xFF6347 },
    { name: 'Gomu', emoji: '🟠', color: 0xFFB347 },
    { name: 'Yami', emoji: '⬛', color: 0x1A1A1A },
    { name: 'Logia', emoji: '💨', color: 0x87CEEB },
    { name: 'Paramecia', emoji: '✨', color: 0xFF69B4 },
    { name: 'Zoan', emoji: '🐾', color: 0x8B4513 },
    { name: 'Mythical', emoji: '👹', color: 0xFFD700 },
    { name: 'Legendary', emoji: '⭐', color: 0xFF1493 },
    { name: 'Rare', emoji: '💎', color: 0x00CED1 },
    { name: 'Common', emoji: '📦', color: 0x696969 }
];

// Komutlar
const commands = [
    new SlashCommandBuilder()
        .setName('bloxfruitkur')
        .setDescription('Blox Fruits stok sistemini kur (Admins only)'),

    new SlashCommandBuilder()
        .setName('bloxkanal')
        .setDescription('Blox Fruits stok kanalını ayarla (Admins only)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Stokların paylaşılacağı kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('fruityekle')
        .setDescription('Yeni Blox Fruit ekle (Admins only)')
        .addStringOption(option =>
            option.setName('fruit')
                .setDescription('Fruit adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('oyuncu_adı')
                .setDescription('Oyuncu adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('şifre')
                .setDescription('Hesap şifresi')
                .setRequired(true)
        )
];

// Bot Ready
client.once('ready', async () => {
    console.log(`✅ Bot hazır: ${client.user.tag}`);
    try {
        await client.application.commands.set(commands);
        console.log('✅ Komutlar kaydedildi!');
    } catch (error) {
        console.error('❌ Komut hatası:', error);
    }
});

// Komut İşleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user, guild } = interaction;

    try {
        // Admin kontrolü
        const member = await guild.members.fetch(user.id);
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isAdmin) {
            await interaction.reply({
                content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (commandName === 'bloxfruitkur') {
            await handleBloxFruitSetup(interaction);
        } else if (commandName === 'bloxkanal') {
            await handleSetBloxChannel(interaction, options);
        } else if (commandName === 'fruityekle') {
            await handleAddFruit(interaction, options);
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({
            content: '❌ Komut işlenirken hata!',
            flags: MessageFlags.Ephemeral
        });
    }
});

// Select Menu İşleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const { customId, values, user } = interaction;

    try {
        if (customId === 'fruit_select') {
            await handleFruitSelect(interaction, values);
        }
    } catch (error) {
        console.error('Select menu hatası:', error);
        await interaction.reply({
            content: '❌ İşlem sırasında hata!',
            flags: MessageFlags.Ephemeral
        });
    }
});

// Button İşleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId, user } = interaction;

    try {
        if (customId === 'get_random_fruit') {
            await handleRandomFruit(interaction, user);
        }
    } catch (error) {
        console.error('Button hatası:', error);
        await interaction.reply({
            content: '❌ İşlem sırasında hata!',
            flags: MessageFlags.Ephemeral
        });
    }
});

// Blox Fruit Sistemi Kur
async function handleBloxFruitSetup(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Mevcut Fruits varsa listele
    const embed = new EmbedBuilder()
        .setColor(0xFF6347)
        .setTitle('🍎 BLOX FRUITS STOK SİSTEMİ')
        .setDescription('Stokta bulunan Fruits\'ler aşağıda listeleniyor. Seçin ve detayları göreceğiniz GUI açılacak.')
        .addFields(
            { name: '🎮 Sistemler', value: '/bloxfruitkur - Bu sistemi kur\n/bloxkanal - Kanal ayarla\n/fruityekle - Fruit ekle', inline: false }
        );

    if (config.fruits.length === 0) {
        embed.addFields({ name: '📦 Stokta Ürün Yok', value: '/fruityekle komutu ile yeni ürün ekleyin', inline: false });
    } else {
        // Fruit gruplarını oluştur
        const fruitGroups = {};
        config.fruits.forEach(f => {
            if (!fruitGroups[f.name]) {
                fruitGroups[f.name] = [];
            }
            fruitGroups[f.name].push(f);
        });

        let description = '';
        for (const [fruitName, fruits] of Object.entries(fruitGroups)) {
            const fruitInfo = BLOX_FRUITS.find(bf => bf.name === fruitName);
            const emoji = fruitInfo?.emoji || '❓';
            description += `${emoji} **${fruitName}** - ${fruits.length} tane\n`;
        }

        embed.addFields({ name: '📦 Stoktaki Fruits', value: description || 'Boş', inline: false });
    }

    // Select Menu Oluştur
    const options = BLOX_FRUITS.map(fruit => ({
        label: fruit.name,
        value: fruit.name,
        emoji: fruit.emoji
    }));

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('fruit_select')
                .setPlaceholder('🍎 Fruit seç')
                .addOptions(options)
        );

    const randomButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('get_random_fruit')
                .setLabel('🎲 Rastgele Fruit Çek')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row, randomButton]
    });
}

// Fruit Seç
async function handleFruitSelect(interaction, values) {
    const selectedFruit = values[0];
    const fruits = config.fruits.filter(f => f.name === selectedFruit);

    if (fruits.length === 0) {
        await interaction.reply({
            content: `❌ **${selectedFruit}** stokta yok!`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const fruitInfo = BLOX_FRUITS.find(bf => bf.name === selectedFruit);

    // DM'e Embed Gönder
    const embed = new EmbedBuilder()
        .setColor(fruitInfo?.color || 0x696969)
        .setTitle(`🍎 ${selectedFruit} Fruit Stok`)
        .setThumbnail('https://cdn.discordapp.com/emojis/1234567890.png')
        .setDescription(`${fruitInfo?.emoji || '❓'} **${selectedFruit}** - ${fruits.length} adet stoktadır`)
        .addFields(
            { name: '📦 Detaylar', value: fruits.map((f, i) => `${i + 1}. **${f.username}** - ||${f.password}||`).join('\n'), inline: false }
        )
        .setFooter({ text: 'Bu bilgileri kimseyle paylaşmayın!' })
        .setTimestamp();

    try {
        // DM'e gönder
        await interaction.user.send({ embeds: [embed] });
        
        await interaction.reply({
            content: `✅ **${selectedFruit}** Fruit detayları DM olarak gönderildi! 📬`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('DM gönderme hatası:', error);
        
        // DM kapalıysa, ephemeral mesaj olarak gönder
        await interaction.reply({
            content: '⚠️ DM kapalı! Detaylar aşağıda gösteriliyor:',
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
}

// Rastgele Fruit Çek
async function handleRandomFruit(interaction, user) {
    if (config.fruits.length === 0) {
        await interaction.reply({
            content: '❌ Stokta fruit yok!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const randomFruit = config.fruits[Math.floor(Math.random() * config.fruits.length)];
    const fruitInfo = BLOX_FRUITS.find(bf => bf.name === randomFruit.name);

    const embed = new EmbedBuilder()
        .setColor(fruitInfo?.color || 0x696969)
        .setTitle(`🎲 RASTGELE FRUIT ÇEKİLİŞİ`)
        .setDescription(`Kazandığınız Fruit: **${randomFruit.name}**`)
        .addFields(
            { name: '👤 Oyuncu Adı', value: randomFruit.username, inline: false },
            { name: '🔑 Şifre', value: `||${randomFruit.password}||`, inline: false }
        )
        .setFooter({ text: 'Bu bilgileri kimseyle paylaşmayın!' })
        .setTimestamp();

    try {
        await user.send({ embeds: [embed] });
        await interaction.reply({
            content: `✅ Rastgele seçilen **${randomFruit.name}** Fruit'i DM'e gönderdim! 🎲`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('DM gönderme hatası:', error);
        await interaction.reply({
            content: '⚠️ DM kapalı! Detaylar aşağıda:',
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
}

// Blox Kanal Ayarla
async function handleSetBloxChannel(interaction, options) {
    const channel = options.getChannel('kanal');
    config.bloxFruitChannel = channel.id;
    saveConfig();

    await interaction.reply({
        content: `✅ Blox Fruits stokları artık ${channel} kanalında paylaşılacak!`,
        flags: MessageFlags.Ephemeral
    });

    // Kanal'a hoş geldin mesajı gönder
    try {
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0xFF6347)
            .setTitle('🍎 BLOX FRUITS STOK KANALINA HOŞ GELDİNİZ')
            .setDescription('Bu kanal yeni Blox Fruits stokları için kullanılacaktır.\n\n/bloxfruitkur komutu ile stok sistemini görebilirsiniz.')
            .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });
    } catch (error) {
        console.error('Kanal mesaji gonderme hatasi:', error);
    }
}

// Fruit Ekle
async function handleAddFruit(interaction, options) {
    const fruitName = options.getString('fruit');
    const username = options.getString('oyuncu_adı');
    const password = options.getString('şifre');

    // Fruit adını düzeltip kapitalleştir
    const validFruit = BLOX_FRUITS.find(bf => bf.name.toLowerCase() === fruitName.toLowerCase());

    if (!validFruit) {
        const fruitList = BLOX_FRUITS.map(f => f.name).join(', ');
        await interaction.reply({
            content: `❌ Geçersiz Fruit adı!\n\n**Geçerli Fruits:**\n${fruitList}`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Fruit'i stok'a ekle
    const newFruit = {
        name: validFruit.name,
        username: username,
        password: password,
        addedAt: Date.now(),
        addedBy: interaction.user.id
    };

    config.fruits.push(newFruit);
    saveConfig();

    // Kanal'a duyuru gönder
    if (config.bloxFruitChannel) {
        try {
            const channel = await client.channels.fetch(config.bloxFruitChannel);
            const fruitInfo = BLOX_FRUITS.find(bf => bf.name === validFruit.name);

            const embed = new EmbedBuilder()
                .setColor(fruitInfo?.color || 0x696969)
                .setTitle(`${fruitInfo?.emoji || '❓'} YENİ FRUIT EKLENDI!`)
                .setDescription(`**${validFruit.name}** stoklara eklendi!`)
                .addFields(
                    { name: '👤 Oyuncu', value: username, inline: true },
                    { name: '📅 Eklenme', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: '👨‍💼 Ekleyen', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Kanal mesajı gonderme hatasi:', error);
        }
    }

    await interaction.reply({
        content: `✅ **${validFruit.name}** Fruit başarıyla eklendi!\n\n👤 **Oyuncu:** ${username}\n🔑 **Şifre:** ||${password}||`,
        flags: MessageFlags.Ephemeral
    });
}

// Keep-alive server
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot aktif!');
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
    console.log('✅ Blox Fruits Bot başlatıldı!');
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log('📋 Komutlar:');
    console.log('   • /bloxfruitkur - Sistemini kur (GUI)');
    console.log('   • /bloxkanal - Stok kanalını ayarla');
    console.log('   • /fruityekle - Yeni Fruit ekle');
}).catch(err => {
    console.error('❌ Bot giriş hatası:', err.message);
});