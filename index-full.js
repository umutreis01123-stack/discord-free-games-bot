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
    ChannelType
} = require('discord.js');
const express = require('express');

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
                const oneDayMs = 24 * 60 * 60 * 1000; // 24 saat
                
                // Cooldown kontrolü
                if (bedavaHesapCooldown[userId]) {
                    const lastUsed = bedavaHesapCooldown[userId];
                    const timePassed = now - lastUsed;
                    
                    if (timePassed < oneDayMs) {
                        const hoursLeft = Math.ceil((oneDayMs - timePassed) / (60 * 60 * 1000));
                        await interaction.reply({
                            content: `⏰ Günde sadece 1 kez kullanabilirsin! **${hoursLeft} saat** sonra tekrar dene.`,
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

// Web Dashboard (Basit)
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ShadowCore Bot</title>
    <style>
        body { font-family: Arial; background: #0a0e27; color: #fff; padding: 20px; }
        h1 { color: #7c3aed; }
        h2 { color: #10b981; margin-top: 30px; }
        ul { list-style: none; }
        li { padding: 10px; background: #1a1a3e; margin: 5px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🤖 ShadowCore Bot</h1>
    <p>✅ Bot aktif çalışıyor!</p>
    
    <h2>📦 Stok Durumu</h2>
    <ul>
        <li>📺 Netflix: ${accountStock.netflix.length} hesap</li>
        <li>🎵 Spotify: ${accountStock.spotify.length} hesap</li>
        <li>🎬 Disney: ${accountStock.disney.length} hesap</li>
        <li>🛒 Amazon: ${accountStock.amazon.length} hesap</li>
        <li>▶️ YouTube: ${accountStock.youtube.length} hesap</li>
        <li>📱 Diğer: ${accountStock.other.length} hesap</li>
    </ul>
    
    <h2>⚡ Komutlar</h2>
    <ul>
        <li><strong>/ticketkur</strong> - Ticket sistemi (sen yap)</li>
        <li><strong>/urunekle</strong> - Stoka ürün ekle (sen yap)</li>
        <li><strong>/bedavahesap</strong> - Hesap al (herkes)</li>
        <li><strong>/duyuru</strong> - Duyuru gönder (sen yap)</li>
    </ul>
</body>
</html>`);
});

// Server başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Web panel: http://localhost:${PORT}`);
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