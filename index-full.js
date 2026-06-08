require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ChannelType,
    PermissionsBitField,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

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

const OWNER_ID = 'umutpapa123';

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        stockChannel: null,
        products: [],
        accounts: [],
        users: {},
        giveaways: [],
        dailyAttempts: {}, // { userId: { date: '2024-01-01', used: true } }
        stats: {
            freeAccountsGiven: 0,
            registeredUsers: 0,
            stockUpdates: 0
        }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Komutlar
const commands = [
    new SlashCommandBuilder()
        .setName('bedavahesap')
        .setDescription('Düşük şansla ücretsiz hesap kazan!')
        .addStringOption(option =>
            option.setName('roblox_kullanıcı')
                .setDescription('Hesabı alacak Roblox kullanıcı adı')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ürünekle')
        .setDescription('Ürün ekle')
        .addStringOption(option =>
            option.setName('ürün_adı')
                .setDescription('Ürün adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('açıklama')
                .setDescription('Ürün açıklaması')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('stokekle')
        .setDescription('Stok ekle (Roblox hesabı bilgileriyle)')
        .addStringOption(option =>
            option.setName('ürün')
                .setDescription('Stok eklenecek ürün')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('roblox_kullanıcı')
                .setDescription('Roblox kullanıcı adı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('roblox_şifre')
                .setDescription('Roblox şifresi (güvenli tutulur)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('kayıt ol')
        .setDescription('Yeni hesap oluştur'),

    new SlashCommandBuilder()
        .setName('hesapgiriş')
        .setDescription('Hesaba giriş yap'),

    new SlashCommandBuilder()
        .setName('çekiliş ekle')
        .setDescription('Çekiliş ekle (Sadece umutpapa123)')
        .addStringOption(option =>
            option.setName('ödül')
                .setDescription('Çekiliş ödülü')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('açıklama')
                .setDescription('Çekiliş açıklaması')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('stokkanalekle')
        .setDescription('Stok duyuru kanalını ayarla (Admin only)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Stok duyuruları gönderilecek kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
];

// Bot Ready
client.once('ready', async () => {
    console.log(`✅ Bot başladı: ${client.user.tag}`);
    try {
        await client.application.commands.set(commands);
        console.log('✅ Komutlar kaydedildi!');
    } catch (error) {
        console.error('❌ Komut kaydı hatası:', error);
    }
});

// Komut İşleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user, guild } = interaction;

    try {
        if (commandName === 'bedavahesap') {
            await handleFreeAccount(interaction, options);
        } else if (commandName === 'ürünekle') {
            await handleAddProduct(interaction, options);
        } else if (commandName === 'stokekle') {
            await handleAddStock(interaction, options);
        } else if (commandName === 'kayıt ol') {
            await handleRegister(interaction);
        } else if (commandName === 'hesapgiriş') {
            await handleLogin(interaction);
        } else if (commandName === 'çekiliş ekle') {
            await handleAddGiveaway(interaction, options);
        } else if (commandName === 'stokkanalekle') {
            await handleSetStockChannel(interaction, options);
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({
            content: '❌ Komut yürütülürken hata oluştu!',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }
});

// Bedava Hesap Komutu
async function handleFreeAccount(interaction, options) {
    const robloxUsername = options.getString('roblox_kullanıcı');
    const userId = interaction.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Günlük deneme kontrolü
    if (!config.dailyAttempts[userId]) {
        config.dailyAttempts[userId] = { date: today, used: false };
    }

    if (config.dailyAttempts[userId].date === today && 
        config.dailyAttempts[userId].used && 
        interaction.user.username !== OWNER_ID) {
        
        await interaction.reply({
            content: '❌ Günde 1 kere hak vardır! Yarın tekrar deneyebilirsiniz.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Günü değiştiyse resetle
    if (config.dailyAttempts[userId].date !== today) {
        config.dailyAttempts[userId] = { date: today, used: false };
    }

    // Düşük şansa tabi tut (% 15 şans)
    const chance = Math.random() < 0.15;

    if (!chance) {
        await interaction.reply({
            content: '❌ Puan yetersiz! Daha sonra tekrar deneyin.',
            flags: MessageFlags.Ephemeral
        });
        config.dailyAttempts[userId].used = true;
        saveConfig();
        return;
    }

    // Hesap varsa seç
    if (config.accounts.length === 0) {
        await interaction.reply({
            content: '❌ Şu anda dağıtılacak hesap yok!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const account = config.accounts.pop();
    config.stats.freeAccountsGiven++;
    config.dailyAttempts[userId].used = true;
    saveConfig();

    // Özel mesaj olarak gönder
    try {
        const embed = new EmbedBuilder()
            .setColor(0x00ff88)
            .setTitle('🎉 Tebrikler! Ücretsiz Hesap Kazandınız!')
            .setDescription('Başarıyla bir hesap kazandınız!')
            .addFields(
                { name: 'Roblox Kullanıcı Adı', value: account.username, inline: false },
                { name: 'Şifre', value: account.password, inline: false },
                { name: 'Notlar', value: account.notes || 'Hesabı kullanmak için Roblox\'a giriş yapınız.', inline: false }
            )
            .setFooter({ text: 'Bu bilgileri kimseyle paylaşmayın!' })
            .setTimestamp();

        await interaction.user.send({ embeds: [embed] });

        await interaction.reply({
            content: '✅ Tebrikler! Hesap özel mesajınıza gönderildi!',
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        await interaction.reply({
            content: '⚠️ Hesap kazandınız ama özel mesaj gönderilemedi. DM\'leriniz kapalı olabilir.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Ürün Ekle
async function handleAddProduct(interaction, options) {
    const productName = options.getString('ürün_adı');
    const description = options.getString('açıklama') || 'Açıklama yok';

    config.products.push({
        name: productName,
        description: description,
        addedBy: interaction.user.tag,
        addedAt: new Date().toISOString()
    });
    saveConfig();

    await interaction.reply({
        content: `✅ Ürün "${productName}" başarıyla eklendi!`,
        flags: MessageFlags.Ephemeral
    });
}

// Stok Ekle (umutpapa123 only)
async function handleAddStock(interaction, options) {
    if (interaction.user.username !== OWNER_ID) {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const product = options.getString('ürün');
    const robloxUsername = options.getString('roblox_kullanıcı');
    const robloxPassword = options.getString('roblox_şifre');

    config.accounts.push({
        username: robloxUsername,
        password: robloxPassword,
        product: product,
        addedAt: new Date().toISOString()
    });
    config.stats.stockUpdates++;
    saveConfig();

    await interaction.reply({
        content: `✅ Stok eklendi!\n📦 Ürün: ${product}\n👤 Hesap: ${robloxUsername}`,
        flags: MessageFlags.Ephemeral
    });

    // Stok kanalına duyuru gönder
    if (config.stockChannel) {
        try {
            const channel = await client.channels.fetch(config.stockChannel);
            const embed = new EmbedBuilder()
                .setColor(0x00ff88)
                .setTitle('📦 Yeni Stok Eklendi!')
                .setDescription(`${product} ürünü için yeni hesap eklendi!`)
                .addFields(
                    { name: 'Stok Durumu', value: `${config.accounts.length} hesap mevcut`, inline: false }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Stok kanalı hatası:', error);
        }
    }
}

// Kayıt Ol
async function handleRegister(interaction) {
    const userId = interaction.user.id;

    if (config.users[userId]) {
        await interaction.reply({
            content: '❌ Zaten kayıtlı biri bulunuyor!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    config.users[userId] = {
        username: interaction.user.username,
        registeredAt: new Date().toISOString(),
        loggedIn: true,
        accounts: []
    };
    config.stats.registeredUsers++;
    saveConfig();

    await interaction.reply({
        content: `✅ Hesap oluşturuldu! Kullanıcı: ${interaction.user.username}`,
        flags: MessageFlags.Ephemeral
    });
}

// Hesap Giriş
async function handleLogin(interaction) {
    const userId = interaction.user.id;

    if (!config.users[userId]) {
        await interaction.reply({
            content: '❌ Önce /kayıt ol komutu ile hesap oluşturun!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    config.users[userId].loggedIn = true;
    saveConfig();

    const embed = new EmbedBuilder()
        .setColor(0x7289DA)
        .setTitle('✅ Başarıyla Giriş Yaptınız!')
        .setDescription(`Hoşgeldiniz ${interaction.user.username}!`)
        .addFields(
            { name: 'Hesap Durumu', value: 'Aktif', inline: true },
            { name: 'Giriş Zamanı', value: new Date().toLocaleString('tr-TR'), inline: true }
        )
        .setFooter({ text: 'ShadowBot Free Account System' })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
    });
}

// Çekiliş Ekle (umutpapa123 only)
async function handleAddGiveaway(interaction, options) {
    if (interaction.user.username !== OWNER_ID) {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const prize = options.getString('ödül');
    const description = options.getString('açıklama') || 'Katılmak için aşağıdaki butona tıklayın!';

    const giveaway = {
        id: Date.now().toString(),
        prize: prize,
        description: description,
        createdAt: new Date().toISOString(),
        participants: []
    };

    config.giveaways.push(giveaway);
    saveConfig();

    const button = new ButtonBuilder()
        .setCustomId(`giveaway_${giveaway.id}`)
        .setLabel('🎉 Çekilişe Katıl')
        .setStyle(ButtonStyle.Green);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎉 YENİ ÇEKİLİŞ!')
        .setDescription(description)
        .addFields(
            { name: 'Ödül', value: prize, inline: false },
            { name: 'Katılımcılar', value: '0', inline: true }
        )
        .setFooter({ text: 'ShadowBot Çekiliş Sistemi' })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
}

// Stok Kanalı Ayarla
async function handleSetStockChannel(interaction, options) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
            content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const channel = options.getChannel('kanal');
    config.stockChannel = channel.id;
    saveConfig();

    await interaction.reply({
        content: `✅ Stok duyuru kanalı ${channel} olarak ayarlandı!`,
        flags: MessageFlags.Ephemeral
    });
}

// WEB DASHBOARD
const app = express();
app.use(express.static('public'));
app.use(express.json());

// Dashboard HTML
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bedava Hesap Sistemi - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #0f0e11 0%, #1a1828 100%);
            color: #e0e0e0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
        }
        
        .container {
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 250px;
            background: #1a1828;
            border-right: 1px solid #2d2438;
            padding: 20px;
        }
        
        .sidebar h1 {
            color: #00ff88;
            margin-bottom: 30px;
            font-size: 1.5rem;
        }
        
        .sidebar ul {
            list-style: none;
        }
        
        .sidebar li {
            margin: 10px 0;
        }
        
        .sidebar a {
            color: #b0b1b3;
            text-decoration: none;
            padding: 10px;
            display: block;
            border-radius: 5px;
            transition: all 0.3s;
        }
        
        .sidebar a:hover {
            background: #2d2438;
            color: #00ff88;
        }
        
        .main {
            flex: 1;
            padding: 40px;
        }
        
        .header {
            margin-bottom: 40px;
        }
        
        .header h2 {
            font-size: 2rem;
            margin-bottom: 10px;
            color: #00ff88;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #2d2438 0%, #1a1828 100%);
            border: 1px solid #3d3850;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
        
        .stat-card h3 {
            color: #00ff88;
            margin-bottom: 10px;
        }
        
        .stat-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #00ff88;
        }
        
        .commands {
            background: linear-gradient(135deg, #2d2438 0%, #1a1828 100%);
            border: 1px solid #3d3850;
            border-radius: 10px;
            padding: 20px;
        }
        
        .commands h3 {
            color: #00ff88;
            margin-bottom: 15px;
        }
        
        .command-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .command-item {
            background: #1a1828;
            border-left: 3px solid #00ff88;
            padding: 15px;
            border-radius: 5px;
        }
        
        .command-item h4 {
            color: #00ff88;
            margin-bottom: 5px;
        }
        
        .command-item p {
            color: #b0b1b3;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h1>🎮 Bedava Hesap</h1>
            <ul>
                <li><a href="#dashboard">📊 Dashboard</a></li>
                <li><a href="#accounts">👤 Hesaplar</a></li>
                <li><a href="#stats">📈 İstatistikler</a></li>
                <li><a href="#commands">⚙️ Komutlar</a></li>
            </ul>
        </div>
        
        <div class="main">
            <div class="header">
                <h2>📊 Sistem Dashboard</h2>
                <p>Bedava Hesap Dağıtım Sistemi</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>🎁 Dağıtılan Hesaplar</h3>
                    <div class="number" id="freeAccounts">0</div>
                </div>
                <div class="stat-card">
                    <h3>👥 Kayıtlı Kullanıcılar</h3>
                    <div class="number" id="users">0</div>
                </div>
                <div class="stat-card">
                    <h3>📦 Stok Güncellemeleri</h3>
                    <div class="number" id="stocks">0</div>
                </div>
            </div>
            
            <div class="commands">
                <h3>🔧 Komutlar</h3>
                <div class="command-list">
                    <div class="command-item">
                        <h4>/bedavahesap</h4>
                        <p>Ücretsiz hesap kazan! (15% şans)</p>
                    </div>
                    <div class="command-item">
                        <h4>/ürünekle</h4>
                        <p>Yeni ürün ekle</p>
                    </div>
                    <div class="command-item">
                        <h4>/stokekle</h4>
                        <p>Stok ekle (umutpapa123)</p>
                    </div>
                    <div class="command-item">
                        <h4>/kayıt ol</h4>
                        <p>Hesap oluştur</p>
                    </div>
                    <div class="command-item">
                        <h4>/hesapgiriş</h4>
                        <p>Hesaba giriş yap</p>
                    </div>
                    <div class="command-item">
                        <h4>/çekiliş ekle</h4>
                        <p>Çekiliş oluştur (umutpapa123)</p>
                    </div>
                    <div class="command-item">
                        <h4>/stokkanalekle</h4>
                        <p>Stok kanalı ayarla (Admin)</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // İstatistikleri güncelle
        fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
                document.getElementById('freeAccounts').textContent = data.freeAccountsGiven;
                document.getElementById('users').textContent = data.registeredUsers;
                document.getElementById('stocks').textContent = data.stockUpdates;
            })
            .catch(err => console.error('Stats yükleme hatası:', err));
    </script>
</body>
</html>
    `);
});

// API
app.get('/api/stats', (req, res) => {
    res.json(config.stats);
});

// Keep-alive
const http = require('http');
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
server.listen(PORT, () => {
    console.log(`✅ Web server başladı: http://localhost:${PORT}`);
});

// Bot başlat
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN bulunamadı!');
    process.exit(1);
}

client.login(token).then(() => {
    console.log('🚀 Bedava Hesap Bot çalışıyor!');
    console.log('📋 Komutlar:');
    console.log('   • /bedavahesap - Ücretsiz hesap kazan');
    console.log('   • /ürünekle - Ürün ekle');
    console.log('   • /stokekle - Stok ekle (umutpapa123)');
    console.log('   • /kayıt ol - Hesap oluştur');
    console.log('   • /hesapgiriş - Hesaba giriş yap');
    console.log('   • /çekiliş ekle - Çekiliş oluştur (umutpapa123)');
    console.log('   • /stokkanalekle - Stok kanalı ayarla (Admin)');
}).catch(err => {
    console.error('❌ Bot hatası:', err.message);
});
