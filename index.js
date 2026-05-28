require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, Collection, ChannelType } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Veritabanı yerine basit JSON dosyası kullanacağız
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

// Config dosyasını yükle veya oluştur
let config = {};
if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
    config = {
        gameChannels: {}
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Config'i kaydetme fonksiyonu
function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Komutları tanımla
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

// Bot hazır olduğunda
client.once('ready', async () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);

    // Komutları kaydet
    try {
        await client.application.commands.set(commands);
        console.log('Komutlar başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komut kaydedilirken hata:', error);
    }
});

// Komut işleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, guildId, channel, options } = interaction;

    try {
        switch (commandName) {
            case 'oyunkanalıayarla':
                await handleSetGameChannel(interaction, options);
                break;

            case 'oyunkanalıkaldır':
                await handleRemoveGameChannel(interaction);
                break;

            case 'bütünücretsizoyunlarıpaylaş':
                await handleShareAllFreeGames(interaction);
                break;
        }
    } catch (error) {
        console.error('Komut işlenirken hata:', error);
        await interaction.reply({ content: 'Komut işlenirken bir hata oluştu!', ephemeral: true });
    }
});

// Oyun kanalı ayarlama
async function handleSetGameChannel(interaction, options) {
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;

    config.gameChannels[guildId] = channel.id;
    saveConfig();

    await interaction.reply({
        content: `✅ Ücretsiz oyunlar artık ${channel} kanalında paylaşılacak! Hemen oyunları paylaşıyorum...`,
        ephemeral: true
    });

    // Kanal ayarlandıktan sonra hemen oyunları paylaş
    try {
        const steamGames = await getSteamFreeGames();
        let sharedCount = 0;

        for (const game of steamGames) {
            await shareGame(channel, game);
            sharedCount++;
            await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit
        }

        await interaction.followUp({
            content: `✅ Kanal ayarlandı ve ${sharedCount} ücretsiz oyun paylaşıldı!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Oyun paylaşılırken hata:', error);
        await interaction.followUp({
            content: '❌ Kanal ayarlandı ama oyunlar paylaşılırken hata oluştu!',
            ephemeral: true
        });
    }
}

// Oyun kanalı kaldırma
async function handleRemoveGameChannel(interaction) {
    const guildId = interaction.guildId;

    if (config.gameChannels[guildId]) {
        delete config.gameChannels[guildId];
        saveConfig();
        await interaction.reply({
            content: '✅ Oyun kanalı başarıyla kaldırıldı!',
            ephemeral: true
        });
    } else {
        await interaction.reply({
            content: '❌ Bu sunucuda ayarlanmış bir oyun kanalı bulunamadı!',
            ephemeral: true
        });
    }
}

// Tüm ücretsiz oyunları paylaşma - GÜNCELLENMİŞ
async function handleShareAllFreeGames(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const gameChannelId = config.gameChannels[guildId];

    if (!gameChannelId) {
        await interaction.editReply({
            content: '❌ Önce bir oyun kanalı ayarlamalısın! `/oyunkanalıayarla` komutunu kullan.'
        });
        return;
    }

    const gameChannel = await client.channels.fetch(gameChannelId);
    
    if (!gameChannel) {
        await interaction.editReply({
            content: '❌ Oyun kanalı bulunamadı! Lütfen kanalı tekrar ayarlayın.'
        });
        return;
    }

    try {
        // Önce bilgi mesajı gönder
        await gameChannel.send('🚨 **TÜM ÜCRETSİZ OYUNLAR PAYLAŞILIYOR!** 🚨\nSteam ve Epic Games\'deki tüm ücretsiz oyunlar kanala ekleniyor...');

        let totalShared = 0;
        let totalErrors = 0;

        // 1. Steam ücretsiz oyunları
        console.log('Steam oyunları alınıyor...');
        const steamGames = await getSteamFreeGames();
        console.log(`Steam: ${steamGames.length} oyun bulundu`);

        // 2. Epic Games ücretsiz oyunları (aktif)
        console.log('Epic Games oyunları alınıyor...');
        const epicGames = await getEpicFreeGames();
        console.log(`Epic Games: ${epicGames.length} oyun bulundu`);

        // Tüm oyunları birleştir
        const allGames = [...steamGames, ...epicGames];
        console.log(`Toplam: ${allGames.length} ücretsiz oyun`);

        if (allGames.length === 0) {
            await gameChannel.send('❌ Hiç ücretsiz oyun bulunamadı!');
            await interaction.editReply({
                content: '❌ Hiç ücretsiz oyun bulunamadı!'
            });
            return;
        }

        // Oyunları paylaş
        for (let i = 0; i < allGames.length; i++) {
            const game = allGames[i];
            try {
                console.log(`Paylaşılıyor: ${game.title} (${i + 1}/${allGames.length})`);
                await shareGame(gameChannel, game);
                totalShared++;
                
                // Rate limit: Her 3 oyunda bir 2 saniye bekle
                if ((i + 1) % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
                
            } catch (error) {
                console.error(`Oyun paylaşılırken hata: ${game.title}`, error.message);
                totalErrors++;
                
                // Hata durumunda biraz daha uzun bekle
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        // Sonuç mesajı
        const resultEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ **TÜM OYUNLAR PAYLAŞILDI!**')
            .setDescription(`**İstatistikler:**`)
            .addFields(
                { name: '📊 Toplam Oyun', value: `${allGames.length}`, inline: true },
                { name: '✅ Başarılı', value: `${totalShared}`, inline: true },
                { name: '❌ Hatalı', value: `${totalErrors}`, inline: true },
                { name: '🎮 Steam', value: `${steamGames.length} oyun`, inline: true },
                { name: '🕹️ Epic Games', value: `${epicGames.length} oyun`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Ücretsiz Oyun Botu • Tüm platformlar taranmıştır' });

        await gameChannel.send({ embeds: [resultEmbed] });

        await interaction.editReply({
            content: `✅ **TAMAMLANDI!**\nToplam ${totalShared} ücretsiz oyun paylaşıldı!\nSteam: ${steamGames.length} | Epic Games: ${epicGames.length}`
        });

    } catch (error) {
        console.error('Oyun paylaşılırken genel hata:', error);
        await interaction.editReply({
            content: `❌ Oyunlar paylaşılırken bir hata oluştu: ${error.message}`
        });
    }
}

// Steam'den ücretsiz oyunları çekme - GÜNCELLENMİŞ
async function getSteamFreeGames() {
    try {
        // Steam'de SADECE ücretsiz oyunları ara (maxprice=free)
        const response = await axios.get('https://store.steampowered.com/search/?maxprice=free&specials=1&ndl=1', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const games = [];

        console.log('Steam sayfası yüklendi, oyunlar aranıyor...');

        $('.search_result_row').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            const url = $(element).attr('href');
            const image = $(element).find('img').attr('src');
            const finalPrice = $(element).find('.discount_final_price').text().trim();
            const originalPrice = $(element).find('.discount_original_price').text().trim();
            
            // SADECE "Free" veya "Ücretsiz" olan oyunları al
            const isFree = finalPrice === 'Free' || finalPrice === 'Ücretsiz' || finalPrice === 'Free to Play';
            
            if (isFree && url && url.includes('/app/')) {
                games.push({
                    title: title,
                    url: url,
                    image: image || 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
                    originalPrice: originalPrice || 'Free to Play',
                    price: finalPrice,
                    platform: 'Steam',
                    isActive: true // Aktif oyun
                });
            }
        });

        console.log(`✅ Steam'den ${games.length} ücretsiz oyun bulundu.`);
        
        // Eğer hiç oyun bulunamazsa, popüler ücretsiz oyunları döndür
        if (games.length === 0) {
            console.log('Hiç oyun bulunamadı, popüler ücretsiz oyunlar döndürülüyor...');
            return getPopularFreeGames();
        }
        
        return games;
    } catch (error) {
        console.error('❌ Steam oyunları alınırken hata:', error.message);
        console.log('Fallback: Popüler ücretsiz oyunlar döndürülüyor...');
        return getPopularFreeGames();
    }
}

// Popüler ücretsiz oyunlar (fallback)
function getPopularFreeGames() {
    return [
        {
            title: "Counter-Strike 2",
            url: "https://store.steampowered.com/app/730/CounterStrike_2/",
            image: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
            originalPrice: "Free to Play",
            price: "Free",
            platform: "Steam",
            isActive: true
        },
        {
            title: "Dota 2",
            url: "https://store.steampowered.com/app/570/Dota_2/",
            image: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg",
            originalPrice: "Free to Play",
            price: "Free",
            platform: "Steam",
            isActive: true
        },
        {
            title: "Apex Legends",
            url: "https://store.steampowered.com/app/1172470/Apex_Legends/",
            image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg",
            originalPrice: "Free to Play",
            price: "Free",
            platform: "Steam",
            isActive: true
        },
        {
            title: "Warframe",
            url: "https://store.steampowered.com/app/230410/Warframe/",
            image: "https://cdn.cloudflare.steamstatic.com/steam/apps/230410/header.jpg",
            originalPrice: "Free to Play",
            price: "Free",
            platform: "Steam",
            isActive: true
        },
        {
            title: "Path of Exile",
            url: "https://store.steampowered.com/app/238960/Path_of_Exile/",
            image: "https://cdn.cloudflare.steamstatic.com/steam/apps/238960/header.jpg",
            originalPrice: "Free to Play",
            price: "Free",
            platform: "Steam",
            isActive: true
        }
    ];
}

// Oyun paylaşma fonksiyonu
async function shareGame(channel, game) {
    // Rastgele renk seç
    const colors = [0x00AE86, 0x9B59B6, 0xE74C3C, 0x3498DB, 0xF1C40F, 0x1ABC9C];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Oyun türünü tahmin et (basit bir tahmin)
    let gameType = "Aksiyon/Macera";
    const titleLower = game.title.toLowerCase();
    
    if (titleLower.includes('strategy') || titleLower.includes('taktik') || titleLower.includes('strateji')) {
        gameType = "Strateji";
    } else if (titleLower.includes('rpg') || titleLower.includes('role')) {
        gameType = "RPG";
    } else if (titleLower.includes('fps') || titleLower.includes('shooter')) {
        gameType = "FPS";
    } else if (titleLower.includes('simulation') || titleLower.includes('simülasyon')) {
        gameType = "Simülasyon";
    } else if (titleLower.includes('sports') || titleLower.includes('spor')) {
        gameType = "Spor";
    }

    const embed = new EmbedBuilder()
        .setColor(randomColor)
        .setTitle(`🎮 **${game.title}**`)
        .setURL(game.url)
        .setDescription(`🚨 **YENİ OYUN RADARIMIZDA: ${game.title.toUpperCase()}** 🚨\n\nSelam ekip! 🎮 Akşamlara akmalık, saatlerimizi gömeceğimiz ve yeni favorimiz olmaya aday bir oyunla geldim. Atmosferi, gerilimi ve oynanışıyla tam bizlik duruyor.`)
        .addFields(
            { name: '🏷️ **Fiyat**', value: `~~${game.originalPrice}~~ → **${game.price}**`, inline: true },
            { name: '🎭 **Tür**', value: gameType, inline: true },
            { name: '🖥️ **Platform**', value: game.platform, inline: true },
            { name: '🔗 **Steam Linki**', value: `[Hemen İndir](${game.url})`, inline: false }
        )
        .setImage(game.image)
        .setTimestamp()
        .setFooter({ text: 'Ücretsiz Oyun Botu • Her gün yeni fırsatlar! • @everyone' });

    await channel.send({ content: '@everyone 🚨 **YENİ ÜCRETSİZ OYUN!** 🚨', embeds: [embed] });
}

// Epic Games'den ücretsiz oyunları çekme (isteğe bağlı)
async function getEpicFreeGames() {
    try {
        // Epic Games Store API veya web scraping
        const response = await axios.get('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;
        const games = [];

        if (data.data && data.data.Catalog && data.data.Catalog.searchStore && data.data.Catalog.searchStore.elements) {
            data.data.Catalog.searchStore.elements.forEach(element => {
                if (element.price && element.price.totalPrice && element.price.totalPrice.discountPrice === 0) {
                    games.push({
                        title: element.title,
                        url: `https://store.epicgames.com/p/${element.productSlug || element.urlSlug}`,
                        image: element.keyImages && element.keyImages[0] ? element.keyImages[0].url : '',
                        originalPrice: element.price.totalPrice.originalPrice ? `${element.price.totalPrice.originalPrice / 100} ${element.price.totalPrice.currencyCode}` : 'Ücretli',
                        price: 'ÜCRETSİZ',
                        platform: 'Epic Games'
                    });
                }
            });
        }

        console.log(`Epic Games'den ${games.length} ücretsiz oyun bulundu.`);
        return games;
    } catch (error) {
        console.error('Epic Games oyunları alınırken hata:', error);
        return [];
    }
}

// Botu başlat
client.login(process.env.DISCORD_TOKEN);