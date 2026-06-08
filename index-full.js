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

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        duyuruKanali: null,
        cekilisler: [],
        istatistikler: {
            duyuruSayisi: 0,
            cekilislikSayisi: 0
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
        .setName('giveaway_add')
        .setDescription('Yeni çekiliş oluştur')
        .addStringOption(option =>
            option.setName('odül')
                .setDescription('Çekiliş ödülü')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('aciklama')
                .setDescription('Çekiliş açıklaması')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Duyuru gönder (Admin only)')
        .addStringOption(option =>
            option.setName('baslik')
                .setDescription('Duyuru başlığı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('icerik')
                .setDescription('Duyuru içeriği')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('renk')
                .setDescription('Renk (mavi/yeşil/kırmızı/mor)')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('duyuru_kanal')
        .setDescription('Duyuru kanalını ayarla (Admin only)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Duyuru kanalı')
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
        if (commandName === 'giveaway_add') {
            await handleAddGiveaway(interaction, options);
        } else if (commandName === 'duyuru') {
            await handleAnnouncement(interaction, options, guild);
        } else if (commandName === 'duyuru_kanal') {
            await handleSetAnnouncementChannel(interaction, options);
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({
            content: '❌ Komut yürütülürken hata oluştu!',
            flags: MessageFlags.Ephemeral
        }).catch(() => {});
    }
});

// Çekiliş Ekle
async function handleAddGiveaway(interaction, options) {
    const prize = options.getString('ödül');
    const description = options.getString('açıklama') || 'Çekilişe katılmak için aşağıdaki butona tıkla!';

    const giveaway = {
        id: Date.now().toString(),
        prize: prize,
        description: description,
        createdAt: new Date().toISOString(),
        createdBy: interaction.user.tag,
        participants: []
    };

    config.cekilisler.push(giveaway);
    config.istatistikler.cekilislikSayisi++;
    saveConfig();

    const button = new ButtonBuilder()
        .setCustomId(`giveaway_${giveaway.id}`)
        .setLabel('🎉 Çekilişe Katıl')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('🎉 YENİ ÇEKİLİŞ!')
        .setDescription(description)
        .addFields(
            { name: '🏆 Ödül', value: prize, inline: false },
            { name: '👥 Katılımcılar', value: '0', inline: true },
            { name: '📅 Oluşturan', value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: 'ShadowCore - Çekiliş Sistemi' })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
}

// Duyuru Gönder
async function handleAnnouncement(interaction, options, guild) {
    const member = await guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
            content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!config.duyuruKanali) {
        await interaction.reply({
            content: '❌ Duyuru kanalı ayarlanmamış! `/duyuru kanal ayarla` kullanın.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const title = options.getString('başlık');
    const content = options.getString('içerik');
    const colorStr = options.getString('renk') || 'mavi';

    const colors = {
        'mavi': 0x3b82f6,
        'yeşil': 0x10b981,
        'kırmızı': 0xef4444,
        'mor': 0x7c3aed
    };

    try {
        const channel = await client.channels.fetch(config.duyuruKanali);

        const embed = new EmbedBuilder()
            .setColor(colors[colorStr] || colors['mavi'])
            .setTitle('📢 ' + title)
            .setDescription(content)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setFooter({ text: 'ShadowCore' })
            .setTimestamp();

        await channel.send({
            content: '@everyone',
            embeds: [embed]
        });

        config.istatistikler.duyuruSayisi++;
        saveConfig();

        await interaction.reply({
            content: '✅ Duyuru gönderildi!',
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        await interaction.reply({
            content: `❌ Duyuru gönderilemedi: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

// Duyuru Kanalı Ayarla
async function handleSetAnnouncementChannel(interaction, options) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
            content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const channel = options.getChannel('kanal');
    config.duyuruKanali = channel.id;
    saveConfig();

    await interaction.reply({
        content: `✅ Duyuru kanalı ${channel} olarak ayarlandı!`,
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
    <title>ShadowCore - Yönetim Paneli</title>
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
            backdrop-filter: blur(10px);
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
        
        /* CONTAINER */
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
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
        
        .stat-card.purple { border-top: 3px solid #a855f7; }
        .stat-card.blue { border-top: 3px solid #3b82f6; }
        
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
        
        .giveaway-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            min-height: 100px;
        }
        
        .giveaway-card {
            background: #0a0e27;
            border: 1px solid #3d3b7f;
            border-radius: 8px;
            padding: 15px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .giveaway-card h4 {
            color: #7c3aed;
            font-size: 0.95rem;
            margin-bottom: 8px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
        }
        
        .giveaway-card p {
            color: #a0aec0;
            font-size: 0.85rem;
            margin-bottom: 5px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .no-data {
            color: #666;
            text-align: center;
            padding: 30px 20px;
            width: 100%;
        }
        
        /* FOOTER */
        footer {
            background: rgba(10, 14, 39, 0.95);
            border-top: 1px solid #2d2b6b;
            padding: 20px;
            text-align: center;
            color: #a0aec0;
            font-size: 0.9rem;
            margin-top: 40px;
        }
        
        footer a {
            color: #7c3aed;
            text-decoration: none;
        }
        
        footer a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 1024px) {
            .main {
                padding: 20px;
            }
            
            .giveaway-list {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
            
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                height: auto;
                position: relative;
                border-right: none;
                border-bottom: 1px solid #2d2b6b;
                padding: 15px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .sidebar h3 {
                width: 100%;
                margin-top: 0;
            }
            
            .sidebar a {
                flex: 1;
                min-width: 100px;
                padding: 8px;
                font-size: 0.85rem;
            }
            
            .main {
                margin-left: 0;
                padding: 15px;
            }
            
            .navbar {
                padding: 10px 15px;
            }
            
            .navbar-brand {
                font-size: 1.2rem;
            }
            
            .nav-menu {
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .nav-menu a {
                font-size: 0.85rem;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
            
            .giveaway-list {
                grid-template-columns: 1fr;
            }
            
            .header h2 {
                font-size: 1.5rem;
            }
        }
        
        @media (max-width: 480px) {
            .navbar {
                flex-direction: column;
                gap: 10px;
            }
            
            .navbar-brand {
                font-size: 1rem;
                letter-spacing: 1px;
            }
            
            .nav-menu {
                width: 100%;
                gap: 5px;
            }
            
            .nav-menu a {
                font-size: 0.75rem;
                padding: 5px;
            }
            
            .main {
                padding: 10px;
            }
            
            .header h2 {
                font-size: 1.2rem;
            }
            
            .section {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <!-- NAV BAR -->
    <div class="navbar">
        <div class="navbar-brand">SHADOW<span>CORE</span></div>
        <ul class="nav-menu">
            <li><a onclick="showDashboard()">Anasayfa</a></li>
            <li><a onclick="showCekilisler()">Çekilişler</a></li>
            <li><a onclick="showDuyurular()">Duyurular</a></li>
            <li><a onclick="showIstatistikler()">İstatistikler</a></li>
        </ul>
    </div>
    
    <!-- MAIN CONTAINER -->
    <div class="container">
        <!-- SIDEBAR -->
        <div class="sidebar">
            <h3>Yönetim</h3>
            <a onclick="showDashboard()" class="active">📊 Dashboard</a>
            <a onclick="showCekilisler()">🎉 Çekilişler</a>
            <a onclick="showDuyurular()">📢 Duyurular</a>
            <a onclick="showIstatistikler()">📈 İstatistikler</a>
        </div>
        
        <!-- MAIN CONTENT -->
        <div class="main">
            <!-- DASHBOARD VIEW -->
            <div id="dashboard-view">
                <div class="header">
                    <h2>Dashboard</h2>
                    <p>ShadowCore Yönetim Sistemi</p>
                </div>
                
                <div class="stats">
                    <div class="stat-card purple">
                        <h3>🎉 Çekiliş</h3>
                        <div class="number" id="stat-cekilisler">0</div>
                    </div>
                    <div class="stat-card blue">
                        <h3>📢 Duyuru</h3>
                        <div class="number" id="stat-duyurular">0</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>🎉 Son Çekilişler</h3>
                    <div id="recent-giveaways" class="giveaway-list">
                        <div class="no-data">Henüz çekiliş yok</div>
                    </div>
                </div>
            </div>
            
            <!-- CEKILISLER VIEW -->
            <div id="cekilisler-view" style="display: none;">
                <div class="header">
                    <h2>Çekilişler</h2>
                    <p>Tüm Çekiliş Aktiviteleri</p>
                </div>
                <div class="section">
                    <div id="all-giveaways" class="giveaway-list">
                        <div class="no-data">Henüz çekiliş yok</div>
                    </div>
                </div>
            </div>
            
            <!-- DUYURULAR VIEW -->
            <div id="duyurular-view" style="display: none;">
                <div class="header">
                    <h2>Duyurular</h2>
                    <p>Gönderilen Duyurular</p>
                </div>
                <div class="section">
                    <div id="duyurular-list">
                        <p style="color: #a0aec0;">Duyurular buraya görüntülenecek</p>
                    </div>
                </div>
            </div>
            
            <!-- ISTATISTIKLER VIEW -->
            <div id="istatistikler-view" style="display: none;">
                <div class="header">
                    <h2>İstatistikler</h2>
                    <p>Sistem Aktivitesi</p>
                </div>
                <div class="section">
                    <div id="istatistikler-content">
                        <p style="color: #a0aec0;">İstatistikler yükleniyor...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <footer>
        <p>© 2026 ShadowCore - Çekiliş & Duyuru Sistemi | <a href="#">Discord Bot</a> | <a href="#">GitHub</a></p>
    </footer>
    
    <script>
        function showDashboard() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('dashboard-view').style.display = 'block';
            updateSidebar('dashboard');
            loadStats();
        }
        
        function showCekilisler() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('cekilisler-view').style.display = 'block';
            updateSidebar('cekilisler');
            loadGiveaways('all-giveaways');
        }
        
        function showDuyurular() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('duyurular-view').style.display = 'block';
            updateSidebar('duyurular');
        }
        
        function showIstatistikler() {
            document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');
            document.getElementById('istatistikler-view').style.display = 'block';
            updateSidebar('istatistikler');
            loadStats();
        }
        
        function updateSidebar(page) {
            document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
            if (page === 'dashboard') document.querySelectorAll('.sidebar a')[1].classList.add('active');
            if (page === 'cekilisler') document.querySelectorAll('.sidebar a')[2].classList.add('active');
            if (page === 'duyurular') document.querySelectorAll('.sidebar a')[3].classList.add('active');
            if (page === 'istatistikler') document.querySelectorAll('.sidebar a')[4].classList.add('active');
        }
        
        function loadStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('stat-cekilisler').textContent = data.cekilislikSayisi;
                    document.getElementById('stat-duyurular').textContent = data.duyuruSayisi;
                    document.getElementById('istatistikler-content').innerHTML = \`
                        <div>
                            <p style="color: #a0aec0; margin-bottom: 10px;">📊 <strong>Sistem İstatistikleri</strong></p>
                            <p style="color: #a0aec0; margin: 5px 0;">🎉 Çekiliş Sayısı: <strong>\${data.cekilislikSayisi}</strong></p>
                            <p style="color: #a0aec0; margin: 5px 0;">📢 Duyuru Sayısı: <strong>\${data.duyuruSayisi}</strong></p>
                        </div>
                    \`;
                })
                .catch(err => console.error(err));
        }
        
        function loadGiveaways(elementId) {
            fetch('/api/giveaways')
                .then(r => r.json())
                .then(data => {
                    const element = document.getElementById(elementId);
                    if (data.length === 0) {
                        element.innerHTML = '<div class="no-data">Henüz çekiliş yok</div>';
                        return;
                    }
                    element.innerHTML = data.map(g => \`
                        <div class="giveaway-card">
                            <h4>🏆 \${g.prize}</h4>
                            <p><strong>Açıklama:</strong> \${g.description}</p>
                            <p><strong>Katılımcılar:</strong> \${g.participants.length}</p>
                            <p style="color: #666; font-size: 0.8rem;">ID: \${g.id}</p>
                        </div>
                    \`).join('');
                })
                .catch(err => console.error(err));
        }
        
        loadStats();
        loadGiveaways('recent-giveaways');
        setInterval(() => loadStats(), 5000);
    </script>
</body>
</html>
    `);
});

// API
app.get('/api/stats', (req, res) => {
    res.json(config.istatistikler);
});

app.get('/api/giveaways', (req, res) => {
    res.json(config.cekilisler);
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
    console.log('🚀 ShadowCore Bot çalışıyor!');
    console.log('📋 Komutlar:');
    console.log('   • /giveaway_add - Çekiliş oluştur');
    console.log('   • /duyuru - Duyuru gönder (Admin)');
    console.log('   • /duyuru_kanal - Kanal ayarla (Admin)');
}).catch(err => {
    console.error('❌ Bot hatası:', err.message);
});
