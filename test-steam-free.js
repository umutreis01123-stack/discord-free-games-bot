// Steam Free to Play testi
const axios = require('axios');
const cheerio = require('cheerio');

async function testSteamFreeToPlay() {
    console.log('Steam Free to Play testi...\n');
    
    try {
        // Steam Free to Play sayfası
        const response = await axios.get('https://store.steampowered.com/search/?sort_by=Released_DESC&tags=492&category1=998&supportedlang=english&ndl=1', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(response.data);
        const games = [];
        
        console.log('Free to Play oyunları aranıyor...\n');
        
        $('.search_result_row').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            const url = $(element).attr('href');
            const image = $(element).find('img').attr('src');
            const finalPrice = $(element).find('.discount_final_price').text().trim();
            const originalPrice = $(element).find('.discount_original_price').text().trim();
            
            // Free to Play oyunları genellikle "Free" veya "Free to Play" yazar
            // Ayrıca URL'de "app/" olup olmadığına bakalım
            if (url && url.includes('/app/')) {
                games.push({
                    title: title,
                    url: url,
                    image: image,
                    originalPrice: originalPrice || 'Free to Play',
                    price: finalPrice || 'Free',
                    platform: 'Steam'
                });
            }
        });
        
        console.log(`✅ ${games.length} Free to Play oyun bulundu!\n`);
        
        if (games.length > 0) {
            console.log('İlk 10 oyun:');
            games.slice(0, 10).forEach((game, index) => {
                console.log(`${index + 1}. ${game.title}`);
                console.log(`   Fiyat: ${game.price}`);
                console.log(`   URL: ${game.url.substring(0, 70)}...`);
                console.log('');
            });
            
            // Fiyat analizi
            const freeGames = games.filter(g => g.price === 'Free' || g.price === 'Free to Play' || g.price.includes('Free'));
            console.log(`\n📊 İstatistikler:`);
            console.log(`   Toplam oyun: ${games.length}`);
            console.log(`   Ücretsiz/Free to Play: ${freeGames.length}`);
            console.log(`   Diğer: ${games.length - freeGames.length}`);
        }
        
        // Alternatif: Steam'in özel sayfası
        console.log('\n--- DİĞER STEAM SAYFALARI ---');
        console.log('1. Ücretsiz indirimler: https://store.steampowered.com/search/?specials=1&maxprice=free');
        console.log('2. Free to Play: https://store.steampowered.com/genre/Free%20to%20Play/');
        console.log('3. Tüm ücretsiz: https://store.steampowered.com/search/?maxprice=free');
        
    } catch (error) {
        console.error('❌ Test sırasında hata:', error.message);
    }
}

// Testi çalıştır
testSteamFreeToPlay();