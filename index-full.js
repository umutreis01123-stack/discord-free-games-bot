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

// Session kontrol
function isAuthenticated(req) {
    return req.session && req.session.userId;
}

// Dashboard HTML - Login Sayfası / Dashboard
app.get('/', (req, res) => {
    const isLoggedIn = localStorage ? true : false;
    
    res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bedava Hesap Sistemi - SHADOWMC</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
            color: #e0e0e0;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            min-height: 100vh;
        }
        
        /* TOP NAV BAR */
        .navbar {
            background: rgba(10, 14, 39, 0.95);
            border-bottom: 1px solid #2d2b6b;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .navbar-brand {
            font-size: 1.5rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: 2px;
        }
        
        .navbar-brand span {
            color: #7c3aed;
        }
        
        .nav-menu {
            display: flex;
            gap: 30px;
            align-items: center;
            list-style: none;
        }
        
        .nav-menu a {
            color: #a0aec0;
            text-decoration: none;
            font-size: 0.95rem;
            transition: color 0.3s;
            cursor: pointer;
        }
        
        .nav-menu a:hover {
            color: #7c3aed;
        }
        
        .login-btn {
            background: #7c3aed;
            color: white;
            padding: 8px 20px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.3s;
        }
        
        .login-btn:hover {
            background: #6d28d9;
        }
        
        /* LOGIN PAGE */
        .login-container {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 14, 39, 0.95);
            justify-content: center;
            align-items: center;
            z-index: 200;
        }
        
        .login-container.active {
            display: flex;
        }
        
        .login-box {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 1px solid #3d3b7f;
            border-radius: 15px;
            padding: 50px;
            width: 100%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        
        .login-box h2 {
            color: #fff;
            margin-bottom: 30px;
            font-size: 1.8rem;
        }
        
        .login-box input {
            width: 100%;
            padding: 12px;
            margin-bottom: 15px;
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            color: #fff;
            border-radius: 6px;
            font-size: 1rem;
        }
        
        .login-box input::placeholder {
            color: #666;
        }
        
        .login-box button {
            width: 100%;
            padding: 12px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
            margin-top: 10px;
        }
        
        .login-box button:hover {
            background: #6d28d9;
        }
        
        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 2rem;
            color: #fff;
            cursor: pointer;
            background: none;
            border: none;
        }
        
        /* DASHBOARD CONTAINER */
        .container {
            display: flex;
            min-height: calc(100vh - 60px);
        }
        
        .sidebar {
            width: 220px;
            background: #0f0e1e;
            border-right: 1px solid #2d2b6b;
            padding: 25px 15px;
            position: fixed;
            height: calc(100vh - 60px);
            overflow-y: auto;
        }
        
        .sidebar h3 {
            color: #7c3aed;
            font-size: 0.8rem;
            text-transform: uppercase;
            margin-top: 20px;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        
        .sidebar a {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #a0aec0;
            text-decoration: none;
            padding: 10px;
            border-radius: 6px;
            transition: all 0.3s;
            cursor: pointer;
            font-size: 0.95rem;
        }
        
        .sidebar a:hover, .sidebar a.active {
            background: #2d2b6b;
            color: #7c3aed;
        }
        
        .main {
            margin-left: 220px;
            padding: 30px;
            flex: 1;
        }
        
        .header {
            margin-bottom: 30px;
        }
        
        .header h2 {
            font-size: 2rem;
            color: #fff;
            margin-bottom: 5px;
        }
        
        .header p {
            color: #7c3aed;
            font-size: 0.95rem;
        }
        
        /* STAT CARDS */
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 1px solid #3d3b7f;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
        
        .stat-card.green { border-top: 3px solid #10b981; }
        .stat-card.blue { border-top: 3px solid #3b82f6; }
        .stat-card.yellow { border-top: 3px solid #f59e0b; }
        .stat-card.purple { border-top: 3px solid #a855f7; }
        
        .stat-card h3 {
            color: #a0aec0;
            font-size: 0.85rem;
            text-transform: uppercase;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }
        
        .stat-card .number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #fff;
        }
        
        /* SECTIONS */
        .section {
            background: linear-gradient(135deg, #1a1a3e 0%, #2d2b6b 100%);
            border: 1px solid #3d3b7f;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .section h3 {
            color: #fff;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        
        .item-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .item-card {
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .item-card .icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .item-card h4 {
            color: #fff;
            font-size: 0.95rem;
            margin-bottom: 8px;
        }
        
        .item-card p {
            color: #a0aec0;
            font-size: 0.85rem;
        }
        
        .no-data {
            color: #666;
            text-align: center;
            padding: 20px;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                height: auto;
                position: relative;
                border-right: none;
                border-bottom: 1px solid #2d2b6b;
            }
            
            .main {
                margin-left: 0;
            }
            
            .nav-menu {
                gap: 15px;
            }
            
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <!-- NAV BAR -->
    <div class="navbar">
        <div class="navbar-brand">SHADOW<span>MC</span></div>
        <ul class="nav-menu">
            <li><a onclick="showDashboard()">Anasayfa</a></li>
            <li><a onclick="showAccounts()">Hesaplar</a></li>
            <li><a onclick="showProducts()">Ürünler</a></li>
            <li><a onclick="showStats()">İstatistikler</a></li>
            <li><button class="login-btn" onclick="toggleLogin()">Giriş Yap</button></li>
        </ul>
    </div>
    
    <!-- LOGIN MODAL -->
    <div class="login-container" id="loginModal">
        <button class="close-btn" onclick="toggleLogin()">✕</button>
        <div class="login-box">
            <h2>🔐 Giriş Yap</h2>
            <input type="text" id="username" placeholder="Kullanıcı Adı" />
            <input type="password" id="password" placeholder="Şifre" />
            <button onclick="login()">Giriş Yap</button>
            <div style="margin-top: 15px; color: #7c3aed;">
                <p>Hesabınız yok mu? <a href="#" onclick="toggleRegister()" style="color: #fff; text-decoration: underline;">Kayıt Ol</a></p>
            </div>
        </div>
    </div>
    
    <!-- MAIN CONTAINER -->
    <div class="container">
        <!-- SIDEBAR -->
        <div class="sidebar">
            <h3>Yönetim Paneli</h3>
            <a onclick="showDashboard()" class="active">📊 Dashboard</a>
            <a onclick="showAccounts()">👤 Hesaplar</a>
            <a onclick="showProducts()">📦 Ürünler</a>
            
            <h3>İçerik</h3>
            <a onclick="showStats()">📈 İstatistikler</a>
            <a onclick="showGiveaways()">🎁 Çekilişler</a>
            
            <h3>Kullanıcı</h3>
            <a onclick="showProfile()">👥 Profil</a>
            <a onclick="logout()">🚪 Çıkış</a>
        </div>
        
        <!-- MAIN CONTENT -->
        <div class="main">
            <!-- DASHBOARD VIEW -->
            <div id="dashboard-view">
                <div class="header">
                    <h2>Dashboard</h2>
                    <p>Bedava Hesap Sistemi</p>
                </div>
                
                <div class="stats">
                    <div class="stat-card green">
                        <h3>🎁 Dağıtılan</h3>
                        <div class="number" id="stat-given">0</div>
                    </div>
                    <div class="stat-card blue">
                        <h3>👥 Kullanıcı</h3>
                        <div class="number" id="stat-users">0</div>
                    </div>
                    <div class="stat-card yellow">
                        <h3>📦 Stok</h3>
                        <div class="number" id="stat-stock">0</div>
                    </div>
                    <div class="stat-card purple">
                        <h3>🎉 Çekiliş</h3>
                        <div class="number" id="stat-giveaways">0</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>📝 Son Başvurular</h3>
                    <div class="item-grid">
                        <div class="no-data">Henüz başvuru yok</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>🎉 Aktif Çekilişler</h3>
                    <div id="giveaways-list" class="item-grid">
                        <div class="no-data">Aktif çekiliş yok</div>
                    </div>
                </div>
            </div>
            
            <!-- ACCOUNTS VIEW -->
            <div id="accounts-view" style="display: none;">
                <div class="header">
                    <h2>Hesaplar</h2>
                    <p>Dağıtılan Bedava Hesaplar</p>
                </div>
                <div class="section">
                    <div id="accounts-list" class="item-grid">
                        <div class="no-data">Henüz hesap yok</div>
                    </div>
                </div>
            </div>
            
            <!-- PRODUCTS VIEW -->
            <div id="products-view" style="display: none;">
                <div class="header">
                    <h2>Ürünler</h2>
                    <p>Stokta Bulunan Ürünler</p>
                </div>
                <div class="section">
                    <div id="products-list" class="item-grid">
                        <div class="no-data">Henüz ürün yok</div>
                    </div>
                </div>
            </div>
            
            <!-- STATS VIEW -->
            <div id="stats-view" style="display: none;">
                <div class="header">
                    <h2>İstatistikler</h2>
                    <p>Sistem Aktivitesi</p>
                </div>
                <div class="section">
                    <div id="stats-content">
                        <p style="color: #a0aec0;">İstatistikler yükleniyor...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        function showDashboard() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('dashboard-view').style.display = 'block';
            loadStats();
        }
        
        function showAccounts() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('accounts-view').style.display = 'block';
        }
        
        function showProducts() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('products-view').style.display = 'block';
        }
        
        function showStats() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('stats-view').style.display = 'block';
        }
        
        function showGiveaways() {
            alert('Çekilişler bölümü yakında...');
        }
        
        function showProfile() {
            alert('Profil bölümü yakında...');
        }
        
        function toggleLogin() {
            document.getElementById('loginModal').classList.toggle('active');
        }
        
        function login() {
            alert('Giriş sistemi yakında aktif olacak...');
            toggleLogin();
        }
        
        function logout() {
            alert('Çıkış yaptınız!');
        }
        
        function loadStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('stat-given').textContent = data.freeAccountsGiven;
                    document.getElementById('stat-users').textContent = data.registeredUsers;
                    document.getElementById('stat-stock').textContent = data.stockUpdates;
                    document.getElementById('stat-giveaways').textContent = '0';
                })
                .catch(err => console.error(err));
        }
        
        loadStats();
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
