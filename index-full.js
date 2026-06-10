require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder,
    EmbedBuilder, 
    PermissionsBitField,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database setup
const db = new sqlite3.Database('./bot.db', (err) => {
    if (err) {
        console.error('❌ Database Error:', err.message);
        console.log('⚠️ Database yüklenmedi, in-memory mode kullanılıyor');
    } else {
        console.log('✅ Database connected');
    }
});

// Create tables - hata olursa ignore et
const createTables = () => {
    try {
        db.serialize(() => {
            // Stoklar tablosu
            db.run(`CREATE TABLE IF NOT EXISTS stocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                amount INTEGER NOT NULL,
                credits INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`).catch(() => {});
            
            // Kullanıcılar tablosu
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`).catch(() => {});
        });
    } catch (error) {
        console.error('Table creation error:', error.message);
    }
};

createTables();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Hesap stoku
let accountStock = {
    netflix: [],
    spotify: [],
    disney: [],
    amazon: [],
    youtube: [],
    other: []
};

// Bedava hesap cooldown - User ID -> Son kullanım zamanı
let bedavaHesapCooldown = {};
// Bot ready
client.once('ready', async () => {
    console.log(`Bot başladı: ${client.user.tag}`);
    
    // Komutları kaydet
    const commands = [
        new SlashCommandBuilder()
            .setName('ticketkur')
            .setDescription('Ticket sistemi kur')
            .addChannelOption(option =>
                option.setName('kanal')
                    .setDescription('Ticket kanali')
                    .setRequired(true)),
                    
        new SlashCommandBuilder()
            .setName('urunekle')
            .setDescription('Stoka urun ekle')
            .addStringOption(option =>
                option.setName('tur')
                    .setDescription('Urun turu')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('hesap')
                    .setDescription('Hesap bilgisi')
                    .setRequired(true)),
                    
        new SlashCommandBuilder()
            .setName('bedavahesap')
            .setDescription('Random bedava hesap al'),
            
        new SlashCommandBuilder()
            .setName('desteksiparişkur')
            .setDescription('Destek siparişi aç'),
            
        new SlashCommandBuilder()
            .setName('promosyonkodukullan')
            .setDescription('Promosyon kodu kullan')
            .addStringOption(option =>
                option.setName('kod')
                    .setDescription('Promosyon kodu')
                    .setRequired(true)),
            
        new SlashCommandBuilder()
            .setName('sorumlu')
            .setDescription('Sorumlu yetkili ekle')
            .addUserOption(option =>
                option.setName('kullanıcı')
                    .setDescription('Sorumlu yetkili')
                    .setRequired(true)),
            
        new SlashCommandBuilder()
            .setName('duyuru')
            .setDescription('Duyuru gonder')
            .addStringOption(option =>
                option.setName('mesaj')
                    .setDescription('Duyuru mesaji')
                    .setRequired(true))
    ];
    
    try {
        await client.application.commands.set(commands);
        console.log('✅ Komutlar kaydedildi!');
    } catch (error) {
        console.error('❌ Komut kaydı hatası:', error.message);
    }
});
// Komut handler - Hem command hem button
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            const { commandName, options, user } = interaction;
            
            if (commandName === 'ticketkur') {
                if (user.username !== 'umutpapa123') {
                    await interaction.reply({
                        content: '❌ Sadece umutpapa123 kullanabilir!',
                        ephemeral: true
                    });
                    return;
                }
                
                const kanal = options.getChannel('kanal');
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Sistemi')
                    .setDescription('Destek için butona bas!')
                    .setColor(0x7c3aed);
                    
                const button = new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('🎫 Ticket Aç')
                    .setStyle(ButtonStyle.Primary);
                    
                const row = new ActionRowBuilder().addComponents(button);
                await kanal.send({ embeds: [embed], components: [row] });
                await interaction.reply({ 
                    content: '✅ Ticket sistemi kuruldu!', 
                    ephemeral: true 
                });
                
            } else if (commandName === 'urunekle') {
                if (user.username !== 'umutpapa123') {
                    await interaction.reply({
                        content: '❌ Sadece umutpapa123 kullanabilir!',
                        ephemeral: true
                    });
                    return;
                }
                
                const tur = options.getString('tur').toLowerCase();
                const hesap = options.getString('hesap');
                let kategori = 'other';
                
                if (['netflix', 'spotify', 'disney', 'amazon', 'youtube'].includes(tur)) {
                    kategori = tur;
                }
                
                accountStock[kategori].push({
                    id: Date.now(),
                    hesap: hesap,
                    ekleyen: user.tag,
                    tarih: new Date().toISOString()
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Stoka Eklendi!')
                    .setDescription(`**${kategori.toUpperCase()}** kategorisine eklendi!`)
                    .addFields(
                        { name: 'Kategori', value: kategori.toUpperCase(), inline: true },
                        { name: 'Stok', value: accountStock[kategori].length + ' hesap', inline: true }
                    )
                    .setColor(0x00ff00);
                    
                await interaction.reply({ embeds: [embed], ephemeral: true });
                
            } else if (commandName === 'bedavahesap') {
                const userId = user.id;
                const now = Date.now();
                const fourHoursMs = 4 * 60 * 60 * 1000; // 4 saat
                
                // Cooldown kontrolü
                if (bedavaHesapCooldown[userId]) {
                    const lastUsed = bedavaHesapCooldown[userId];
                    const timePassed = now - lastUsed;
                    
                    if (timePassed < fourHoursMs) {
                        const minutesLeft = Math.ceil((fourHoursMs - timePassed) / (60 * 1000));
                        const hoursLeft = Math.floor(minutesLeft / 60);
                        const mins = minutesLeft % 60;
                        await interaction.reply({
                            content: `⏰ 4 saate bir kullanabilirsin! **${hoursLeft}s ${mins}d** sonra tekrar dene.`,
                            ephemeral: true
                        });
                        return;
                    }
                }
                
                const tumHesaplar = [];
                Object.keys(accountStock).forEach(kat => {
                    accountStock[kat].forEach(h => {
                        tumHesaplar.push({ ...h, kat });
                    });
                });
                
                if (tumHesaplar.length === 0) {
                    await interaction.reply({
                        content: '❌ Stokta hesap yok!',
                        ephemeral: true
                    });
                    return;
                }
                
                const randomIndex = Math.floor(Math.random() * tumHesaplar.length);
                const secilen = tumHesaplar[randomIndex];
                
                const katStok = accountStock[secilen.kat];
                const idx = katStok.findIndex(h => h.id === secilen.id);
                if (idx !== -1) {
                    katStok.splice(idx, 1);
                }
                
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎁 Bedava Hesap!')
                    .setDescription('Senin için random hesap seçtim!')
                    .addFields(
                        { name: 'Platform', value: secilen.kat.toUpperCase() },
                        { name: 'Hesap', value: secilen.hesap },
                        { name: 'Uyarı', value: 'Hesaplar çalışmayabilir!' }
                    )
                    .setColor(0x7c3aed);
                
                try {
                    await user.send({ embeds: [dmEmbed] });
                    
                    // Cooldown'u kaydet
                    bedavaHesapCooldown[userId] = now;
                    
                    await interaction.reply({
                        content: '✅ Hesap DM\'den gönderildi!',
                        ephemeral: true
                    });
                    
                    const kanalEmbed = new EmbedBuilder()
                        .setTitle('🎉 Hesap Verildi!')
                        .setDescription(`${user} **${secilen.kat.toUpperCase()}** hesabı aldı!`)
                        .addFields({
                            name: 'Kalan Stok',
                            value: (tumHesaplar.length - 1) + ' hesap'
                        })
                        .setColor(0x00ff00);
                    
                    setTimeout(() => {
                        interaction.followUp({ embeds: [kanalEmbed] });
                    }, 1000);
                    
                } catch (error) {
                    await interaction.reply({
                        content: '❌ DM\'lerin kapalı! Aç ve tekrar dene.',
                        ephemeral: true
                    });
                    accountStock[secilen.kat].push(secilen);
                }
                
            } else if (commandName === 'duyuru') {
                if (user.username !== 'umutpapa123') {
                    await interaction.reply({
                        content: '❌ Sadece umutpapa123 kullanabilir!',
                        ephemeral: true
                    });
                    return;
                }
                
                const mesaj = options.getString('mesaj');
                const embed = new EmbedBuilder()
                    .setTitle('📢 Duyuru')
                    .setDescription(mesaj)
                    .setColor(0x7c3aed)
                    .setTimestamp();
                
                await interaction.reply({ content: '@everyone', embeds: [embed] });
                
            } else if (commandName === 'desteksiparişkur') {
                // Destek kanalı oluştur
                const supportChannel = await interaction.guild.channels.create({
                    name: `destek-siparişi`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.SendMessages],
                            allow: [PermissionsBitField.Flags.ViewChannel]
                        }
                    ]
                });
                
                // Embed oluştur
                const embed = new EmbedBuilder()
                    .setTitle('🛠️ Destek Siparişi Sistemi')
                    .setDescription('Destek siparişi açmak için aşağıdaki butona tıklayın')
                    .setColor(0x7c3aed)
                    .addFields(
                        { name: '📝 Neden', value: 'Destek siparişi açmak istediğiniz nedeni belirtebileceksiniz', inline: false },
                        { name: '✅ İşlem', value: 'Butona tıkladıktan sonra özel bir kanal açılacak', inline: false }
                    )
                    .setTimestamp();
                
                // Buton oluştur
                const openTicketBtn = new ButtonBuilder()
                    .setCustomId('open_support_ticket')
                    .setLabel('🎫 Destek Siparişi Aç')
                    .setStyle(ButtonStyle.Primary);
                
                const row = new ActionRowBuilder().addComponents(openTicketBtn);
                
                await supportChannel.send({ embeds: [embed], components: [row] });
                
                await interaction.reply({
                    content: `✅ Destek siparişi kanalı oluşturuldu: ${supportChannel}`,
                    ephemeral: true
                });
                
            } else if (commandName === 'promosyonkodukullan') {
                const kod = options.getString('kod').toUpperCase();
                
                // TODO: Veritabanından kodu kontrol et
                // Şimdilik demo cevap
                const embed = new EmbedBuilder()
                    .setTitle('🎟️ Promosyon Kodu')
                    .setDescription(`Kod: **${kod}**`)
                    .setColor(0x7c3aed)
                    .addFields(
                        { name: 'Durum', value: '✅ Geçerli' },
                        { name: 'Hediye', value: 'Kontrol ediliyor...' }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                
                // DM'den hediye gönder (TODO: Admin panel'den alınacak)
                try {
                    await user.send({
                        content: '🎁 Promosyon kodundan kazandığınız hediye:',
                        embeds: [embed]
                    });
                } catch (error) {
                    console.error('DM gönderme hatası:', error);
                }
                
            } else if (commandName === 'sorumlu') {
                if (user.username !== 'umutpapa123') {
                    await interaction.reply({
                        content: '❌ Sadece umutpapa123 kullanabilir!',
                        ephemeral: true
                    });
                    return;
                }
                
                const sorumluyetkili = options.getUser('kullanıcı');
                const embed = new EmbedBuilder()
                    .setTitle('✅ Sorumlu Yetkili Eklendi')
                    .setDescription(`${sorumluyetkili.tag} sorumlu yetkili olarak atandı`)
                    .setColor(0x10b981)
                    .addFields(
                        { name: 'Yetkili', value: sorumluyetkili.tag, inline: true },
                        { name: 'ID', value: sorumluyetkili.id, inline: true }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'support_ticket_modal') {
                const neden = interaction.fields.getTextInputValue('ticket_neden') || 'Belirtilmedi';
                const guild = interaction.guild;
                const user = interaction.user;
                
                // Ticket kanalı oluştur
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                        }
                    ]
                });
                
                // Embed oluştur
                const embed = new EmbedBuilder()
                    .setTitle('🛠️ Destek Siparişi')
                    .setDescription('zwozez modorasyon')
                    .setColor(0x7c3aed)
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        { name: '👤 Açan', value: user.tag, inline: true },
                        { name: '🆔 ID', value: user.id, inline: true },
                        { name: '❓ Neden', value: neden }
                    )
                    .setTimestamp();
                
                // Butonlar
                const closeBtn = new ButtonBuilder()
                    .setCustomId(`close_ticket_${user.id}`)
                    .setLabel('🔒 Ticket Kapat')
                    .setStyle(ButtonStyle.Danger);
                
                const takeBtn = new ButtonBuilder()
                    .setCustomId(`take_ticket_${user.id}`)
                    .setLabel('📋 Talebi Üstlen')
                    .setStyle(ButtonStyle.Primary);
                
                const row = new ActionRowBuilder().addComponents(closeBtn, takeBtn);
                
                await ticketChannel.send({ embeds: [embed], components: [row] });
                
                await interaction.reply({
                    content: `✅ Destek siparişin açıldı: ${ticketChannel}`,
                    ephemeral: true
                });
            }
            
        } else if (interaction.isButton()) {
            if (interaction.customId === 'open_support_ticket') {
                // Modal göster
                const modal = new ModalBuilder()
                    .setCustomId('support_ticket_modal')
                    .setTitle('Destek Siparişi Aç');
                
                const neden = new TextInputBuilder()
                    .setCustomId('ticket_neden')
                    .setLabel('Neden destek siparişi açıyorsunuz?')
                    .setPlaceholder('Nedenini kısaca yazın...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                
                const row = new ActionRowBuilder().addComponents(neden);
                modal.addComponents(row);
                
                await interaction.showModal(modal);
                
            } else if (interaction.customId.startsWith('close_ticket_')) {
                const embed = new EmbedBuilder()
                    .setTitle('🔒 Ticket Kapatılıyor')
                    .setDescription('5 saniye sonra kanal silinecek...')
                    .setColor(0xff0000);
                    
                await interaction.reply({ embeds: [embed] });
                
                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (error) {
                        console.error('Kanal silme hatası:', error.message);
                    }
                }, 5000);
                
            } else if (interaction.customId.startsWith('take_ticket_')) {
                const embed = new EmbedBuilder()
                    .setTitle('📋 Talep Üstlenildi')
                    .setDescription(`${interaction.user.tag} bu talebi üstlendi`)
                    .setColor(0x10b981)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (interaction.customId === 'create_ticket') {
                const guild = interaction.guild;
                const user = interaction.user;
                
                const ticketKanal = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                        }
                    ]
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Oluşturuldu')
                    .setDescription(`Merhaba ${user}! Destek ekibi seninle ilgilenecek.`)
                    .setColor(0x00ff00);
                    
                const kapatButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Kapat')
                    .setStyle(ButtonStyle.Danger);
                    
                const row = new ActionRowBuilder().addComponents(kapatButton);
                
                await ticketKanal.send({
                    content: `${user}`,
                    embeds: [embed],
                    components: [row]
                });
                
                await interaction.reply({
                    content: `✅ Ticket oluşturuldu: ${ticketKanal}`,
                    ephemeral: true
                });
                
            } else if (interaction.customId === 'close_ticket') {
                const embed = new EmbedBuilder()
                    .setTitle('🔒 Ticket Kapatılıyor')
                    .setDescription('5 saniye sonra kanal silinecek...')
                    .setColor(0xff0000);
                    
                await interaction.reply({ embeds: [embed] });
                
                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (error) {
                        console.error('❌ Kanal silme hatası:', error.message);
                    }
                }, 5000);
            }
        }
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
        if (interaction.replied) {
            await interaction.followUp({
                content: '❌ Hata oluştu!',
                ephemeral: true
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: '❌ Hata oluştu!',
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// Web Dashboard + Admin Panel
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'admin-panel', 'public')));

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'public', 'home.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'public', 'index.html'));
});

// ========== API ENDPOINTS ==========

// Public Stokları getir
app.get('/api/public/stocks', (req, res) => {
    db.all('SELECT id, name, amount, credits FROM stocks', [], (err, rows) => {
        if (err) {
            console.error('Stocks query error:', err);
            return res.json([]); // Boş array dön
        }
        res.json(rows || []);
    });
});

// Giriş
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Admin hardcoded
    if (username === 'umut' && password === 'umutpapa001122u') {
        const token = jwt.sign({ username: 'umut', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    
    // Kullanıcı DB'den kontrol et
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        
        try {
            if (bcrypt.compareSync(password, user.password)) {
                const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ success: true, token });
            }
        } catch (e) {
            console.error('Password compare error:', e);
        }
        
        res.status(401).json({ success: false, message: 'Hatalı şifre' });
    });
});

// Kayıt
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!password || password.length < 8) {
        return res.status(400).json({ success: false, message: 'Şifre en az 8 karakter olmalı!' });
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return res.status(400).json({ 
            success: false, 
            message: 'Şifre büyük harf, küçük harf ve rakam içermelidir!' 
        });
    }
    
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(
            'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
            [email, name, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ success: false, message: 'Bu e-posta zaten kullanılıyor!' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, message: 'Kayıt başarılı!' });
            }
        );
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Kayıt hatası' });
    }
});

// Stokları getir (Admin)
app.get('/api/stocks', authenticateToken, (req, res) => {
    db.all('SELECT * FROM stocks', [], (err, rows) => {
        if (err) {
            console.error('Stocks query error:', err);
            return res.json([]);
        }
        res.json(rows || []);
    });
});

// Stok ekle (Admin)
app.post('/api/stocks', authenticateToken, (req, res) => {
    const { name, amount, credits } = req.body;
    
    db.run(
        'INSERT INTO stocks (name, amount, credits) VALUES (?, ?, ?)',
        [name, amount, credits],
        function(err) {
            if (err) {
                console.error('Stock insert error:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Bot stokuna da ekle
            if (accountStock[name.toLowerCase()]) {
                for (let i = 0; i < amount; i++) {
                    accountStock[name.toLowerCase()].push({
                        id: Date.now() + i,
                        hesap: `Account ${i + 1}`,
                        ekleyen: req.user.username,
                        tarih: new Date().toISOString()
                    });
                }
            }
            
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Stok sil (Admin)
app.delete('/api/stocks/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM stocks WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            console.error('Stock delete error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// Sunucuları getir
app.get('/api/servers', (req, res) => {
    const servers = client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        icon: guild.iconURL()
    }));
    res.json(servers);
});

// Server başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Web sitesi: http://localhost:${PORT}`);
});

// Bot başlat
const token = process.env.DISCORD_TOKEN;

// Mesaj event listener - "sa" → "as" çevirme
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    if (message.content.toLowerCase() === 'sa') {
        await message.reply('as').catch(console.error);
    }
});

if (token) {
    client.login(token).then(() => {
        console.log('✅ Bot Discord\'a bağlanıyor...');
    }).catch(err => {
        console.error('❌ Bot giriş hatası:', err.message);
        process.exit(1);
    });
} else {
    console.error('❌ DISCORD_TOKEN environment variable bulunamadı!');
    process.exit(1);
}