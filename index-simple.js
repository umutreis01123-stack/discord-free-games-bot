require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Basit config
const config = {
    gameChannels: {}
};

// Komutlar
const commands = [
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
        .setDescription('Tüm platformlardaki ücretsiz oyunları paylaşır')
];

// Bot hazır
client.once('ready', async () => {
    console.log(`${client.user.tag} online!`);
    try {
        await client.application.commands.set(commands);
        console.log('Komutlar kaydedildi!');
    } catch (error) {
        console.error('Komut hatası:', error);
    }
});

// Komut işleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, guildId, options } = interaction;

    try {
        if (commandName === 'oyunkanalıayarla') {
            const channel = options.getChannel('kanal');
            config.gameChannels[guildId] = channel.id;
            
            await interaction.reply({
                content: `✅ Ücretsiz oyunlar artık ${channel} kanalında paylaşılacak!`,
                ephemeral: true
            });

            // Hemen oyun paylaş
            const games = await getSteamFreeGames();
            for (const game of games.slice(0, 5)) { // Sadece 5 oyun
                await shareGame(channel, game);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } else if (commandName === 'oyunkanalıkaldır') {
            if (config.gameChannels[guildId]) {
                delete config.gameChannels[guildId];
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

        } else if (commandName === 'bütünücretsizoyunlarıpaylaş') {
            await interaction.deferReply({ ephemeral: true });
            
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
            for (const game of games) {
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
    } catch (error) {
        console.error('Komut hatası:', error);
        await interaction.reply({ 
            content: '❌ Komut işlenirken hata!', 
            ephemeral: true 
        });
    }
});

// Steam'den oyunları al
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

        // Fallback
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

        return games.slice(0, 10); // Max 10 oyun
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

// Oyun paylaş
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

// Basit keep-alive
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot aktif!');
});
server.listen(process.env.PORT || 3000, () => {
    console.log('Keep-alive server başladı');
});

// Botu başlat
client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log('Bot başlatıldı!');
}).catch(err => {
    console.error('Bot giriş hatası:', err);
});