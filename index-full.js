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
                // Bilgilendirme mesajı
                const infoEmbed = new EmbedBuilder()
                    .setTitle('📋 Destek Siparişi Formu')
                    .setDescription('Aşağıdaki formu doldurarak destek siparişi açabilirsiniz.')
                    .setColor(0x7c3aed)
                    .addFields(
                        { name: '📝 Konu', value: 'Siparişinizin konusunu yazın', inline: false },
                        { name: '📄 Açıklama', value: 'Detaylı açıklama yapın', inline: false },
                        { name: '✅ Gönderme', value: 'Formu tamamladıktan sonra kanalınız oluşturulacak', inline: false }
                    )
                    .setFooter({ text: 'Admin tarafından incelendikten sonra size cevap verilecektir.' });
                
                // Modal oluştur
                const modal = new ModalBuilder()
                    .setCustomId('support_order_modal')
                    .setTitle('Destek Siparişi');
                
                const konu = new TextInputBuilder()
                    .setCustomId('konu')
                    .setLabel('Konu')
                    .setPlaceholder('Siparişin konusu')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const aciklama = new TextInputBuilder()
                    .setCustomId('aciklama')
                    .setLabel('Açıklama')
                    .setPlaceholder('Detaylı açıklama')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                
                const row1 = new ActionRowBuilder().addComponents(konu);
                const row2 = new ActionRowBuilder().addComponents(aciklama);
                
                modal.addComponents(row1, row2);
                
                // Bilgilendirme gönder
                await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
                // Modal aç (tepki olarak)
                setTimeout(() => interaction.showModal(modal).catch(console.error), 100);
                
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
            }
            
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'support_order_modal') {
                const konu = interaction.fields.getTextInputValue('konu');
                const aciklama = interaction.fields.getTextInputValue('aciklama');
                const guild = interaction.guild;
                const user = interaction.user;
                
                // Destek kanalı oluştur
                const channel = await guild.channels.create({
                    name: `sipariş-${user.username}`,
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
                        { name: '👤 Kullanıcı', value: user.tag, inline: true },
                        { name: '📌 Konu', value: konu, inline: true },
                        { name: '📝 Açıklama', value: aciklama }
                    )
                    .setTimestamp();
                
                await channel.send({ embeds: [embed] });
                
                await interaction.reply({
                    content: `✅ Destek siparişin oluşturuldu: ${channel}`,
                    ephemeral: true
                });
            }
            
        } else if (interaction.isButton()) {
            if (interaction.customId === 'create_ticket') {
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

// Admin panel için basit in-memory DB (Production'da veritabanı kullan)
let admins = [
    { username: 'umut', password: 'umutpapa001122u' }
];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'public', 'home.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel', 'public', 'index.html'));
});

// Public API - Stokları göster
app.get('/api/public/stocks', (req, res) => {
    // accountStock verisini döndür
    const stocks = [];
    Object.keys(accountStock).forEach(kat => {
        accountStock[kat].forEach(item => {
            stocks.push({
                name: kat.toUpperCase(),
                amount: 1,
                credits: 10 // Demo kredi
            });
        });
    });
    res.json(stocks);
});

// Admin Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'umut' && password === 'umutpapa001122u') {
        res.json({ success: true, message: 'Giriş başarılı' });
    } else {
        res.status(401).json({ success: false, message: 'Hatalı giriş' });
    }
});

// Admin Register
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
    
    res.json({ success: true, message: 'Kayıt başarılı!' });
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