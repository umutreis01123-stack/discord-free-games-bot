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
        announceChannel: null,
        users: {},
        messages: [],
        stats: {
            dmsSent: 0,
            bulkDmsSent: 0,
            announcementsSent: 0
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
        .setName('dm')
        .setDescription('Kullanıcıya DM gönder (Admin only)')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Mesaj alacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Gönderilecek mesaj')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('topludm')
        .setDescription('Toplu DM gönder (Admin only)')
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Gönderilecek mesaj')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rol')
                .setDescription('Hangi role gönder? (hepsi/role_adı)')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Duyuru gönder (Admin only)')
        .addStringOption(option =>
            option.setName('başlık')
                .setDescription('Duyuru başlığı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('içerik')
                .setDescription('Duyuru içeriği')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('renk')
                .setDescription('Embed rengi (mavi/yeşil/kırmızı/mor)')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('duyurukanal')
        .setDescription('Duyuru kanalını ayarla (Admin only)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Duyuru gönderilecek kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Admin panelini aç')
];

// Bot Ready
client.once('ready', async () => {
    console.log(`✅ Bot başladı: ${client.user.tag}`);
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

        if (commandName !== 'panel' && !isAdmin) {
            await interaction.reply({
                content: '❌ Bu komutu sadece yöneticiler kullanabilir!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (commandName === 'dm') {
            await handleDM(interaction, options);
        } else if (commandName === 'topludm') {
            await handleBulkDM(interaction, options, guild);
        } else if (commandName === 'duyuru') {
            await handleAnnouncement(interaction, options);
        } else if (commandName === 'duyurukanal') {
            await handleAnnounceChannel(interaction, options);
        } else if (commandName === 'panel') {
            await handlePanel(interaction);
        }
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({
            content: '❌ Hata!',
            flags: MessageFlags.Ephemeral
        });
    }
});

// DM Gönder
async function handleDM(interaction, options) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = options.getUser('kullanıcı');
    const message = options.getString('mesaj');

    try {
        const dm = await user.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x7289DA)
                    .setTitle('📨 Yeni Mesaj')
                    .setDescription(message)
                    .setFooter({ text: interaction.user.tag })
                    .setTimestamp()
            ]
        });

        config.stats.dmsSent++;
        config.messages.push({
            type: 'dm',
            recipient: user.tag,
            message: message,
            time: new Date().toISOString()
        });
        saveConfig();

        await interaction.editReply({
            content: `✅ Mesaj ${user.tag} kullanıcısına gönderildi!`
        });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Mesaj gönderilemedi! Kullanıcının DM kapalı olabilir.`
        });
    }
}

// Toplu DM Gönder
async function handleBulkDM(interaction, options, guild) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const message = options.getString('mesaj');
    const roleFilter = options.getString('rol') || 'hepsi';

    try {
        let members = await guild.members.fetch();

        if (roleFilter !== 'hepsi') {
            const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleFilter.toLowerCase());
            if (!role) {
                await interaction.editReply({
                    content: `❌ Rol "${roleFilter}" bulunamadı!`
                });
                return;
            }
            members = members.filter(m => m.roles.cache.has(role.id));
        }

        let sent = 0;
        let failed = 0;

        for (const member of members.values()) {
            try {
                await member.user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x7289DA)
                            .setTitle('📨 Toplu Mesaj')
                            .setDescription(message)
                            .setFooter({ text: interaction.user.tag })
                            .setTimestamp()
                    ]
                });
                sent++;
            } catch (e) {
                failed++;
            }
        }

        config.stats.bulkDmsSent++;
        saveConfig();

        await interaction.editReply({
            content: `✅ Toplu DM gönderildi!\n**Başarılı:** ${sent}\n**Başarısız:** ${failed}`
        });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Hata: ${error.message}`
        });
    }
}

// Duyuru Gönder
async function handleAnnouncement(interaction, options) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!config.announceChannel) {
        await interaction.editReply({
            content: '❌ Duyuru kanalı ayarlanmamış! /duyurukanal ile ayarlayın.'
        });
        return;
    }

    const title = options.getString('başlık');
    const content = options.getString('içerik');
    const colorStr = options.getString('renk') || 'mavi';

    const colors = {
        'mavi': 0x7289DA,
        'yeşil': 0x43B581,
        'kırmızı': 0xF04747,
        'mor': 0x9C27B0
    };

    try {
        const channel = await client.channels.fetch(config.announceChannel);

        const embed = new EmbedBuilder()
            .setColor(colors[colorStr] || colors['mavi'])
            .setTitle('📢 ' + title)
            .setDescription(content)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await channel.send({
            content: '@everyone',
            embeds: [embed]
        });

        config.stats.announcementsSent++;
        saveConfig();

        await interaction.editReply({
            content: `✅ Duyuru gönderildi!`
        });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Duyuru gönderilemedi: ${error.message}`
        });
    }
}

// Duyuru Kanalı Ayarla
async function handleAnnounceChannel(interaction, options) {
    const channel = options.getChannel('kanal');
    config.announceChannel = channel.id;
    saveConfig();

    await interaction.reply({
        content: `✅ Duyuru kanalı ${channel} olarak ayarlandı!`,
        flags: MessageFlags.Ephemeral
    });
}

// Admin Panel
async function handlePanel(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x7289DA)
        .setTitle('📊 Admin Paneli')
        .setDescription('ShadowBot Kontrol Paneli')
        .addFields(
            { name: '📨 DM\'ler', value: config.stats.dmsSent.toString(), inline: true },
            { name: '📬 Toplu DM\'ler', value: config.stats.bulkDmsSent.toString(), inline: true },
            { name: '📢 Duyurular', value: config.stats.announcementsSent.toString(), inline: true },
            { name: '📋 Komutlar', value: '/dm\n/topludm\n/duyuru\n/duyurukanal', inline: false }
        )
        .setFooter({ text: 'ShadowBot v1.0' })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
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
    <title>ShadowBot - Admin Paneli</title>
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
            color: #7289DA;
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
            color: #7289DA;
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
            color: #7289DA;
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
            color: #7289DA;
            margin-bottom: 15px;
        }
        
        .command-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .command-item {
            background: #1a1828;
            border-left: 3px solid #7289DA;
            padding: 15px;
            border-radius: 5px;
        }
        
        .command-item h4 {
            color: #7289DA;
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
            <h1>🎮 ShadowBot</h1>
            <ul>
                <li><a href="#dashboard">📊 Dashboard</a></li>
                <li><a href="#messages">📨 Mesajlar</a></li>
                <li><a href="#users">👥 Kullanıcılar</a></li>
                <li><a href="#settings">⚙️ Ayarlar</a></li>
            </ul>
        </div>
        
        <div class="main">
            <div class="header">
                <h2>📊 Dashboard</h2>
                <p>Sunucu yönetim paneli</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>📨 DM\'ler</h3>
                    <div class="number" id="dms">0</div>
                </div>
                <div class="stat-card">
                    <h3>📬 Toplu DM</h3>
                    <div class="number" id="bulkdms">0</div>
                </div>
                <div class="stat-card">
                    <h3>📢 Duyurular</h3>
                    <div class="number" id="announces">0</div>
                </div>
            </div>
            
            <div class="commands">
                <h3>🔧 Komutlar</h3>
                <div class="command-list">
                    <div class="command-item">
                        <h4>/dm</h4>
                        <p>Kullanıcıya DM gönder</p>
                    </div>
                    <div class="command-item">
                        <h4>/topludm</h4>
                        <p>Toplu DM gönder</p>
                    </div>
                    <div class="command-item">
                        <h4>/duyuru</h4>
                        <p>Duyuru gönder</p>
                    </div>
                    <div class="command-item">
                        <h4>/duyurukanal</h4>
                        <p>Duyuru kanalı ayarla</p>
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
                document.getElementById('dms').textContent = data.dmsSent;
                document.getElementById('bulkdms').textContent = data.bulkDmsSent;
                document.getElementById('announces').textContent = data.announcementsSent;
            });
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
    console.log('🚀 ShadowBot çalışıyor!');
    console.log('📋 Komutlar:');
    console.log('   • /dm - DM gönder');
    console.log('   • /topludm - Toplu DM');
    console.log('   • /duyuru - Duyuru');
    console.log('   • /duyurukanal - Kanal ayarla');
    console.log('   • /panel - Admin paneli');
}).catch(err => {
    console.error('❌ Bot hatası:', err.message);
});