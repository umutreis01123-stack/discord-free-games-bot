// Bot test komutları
const axios = require('axios');
const cheerio = require('cheerio');

async function testSteamScraping() {
    console.log('Steam ücretsiz oyun testi başlıyor...\n');
    
    try {
        const response = await axios.get('https://store.steampowered.com/search/?maxprice=free&specials=1&category1=998', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const games = [];

        $('#search_resultsRows a').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            const url = $(element).attr('href');
            const image = $(element).find('img').attr('src');
            const originalPrice = $(element).find('.discount_original_price').text().trim();
            const finalPrice = $(element).find('.discount_final_price').text().trim();

            if (finalPrice === 'Free' || finalPrice === 'Ücretsiz' || finalPrice === 'Free to Play') {
                games.push({
                    title: title,
                    url: url,
                    image: image,
                    originalPrice: originalPrice || 'Ücretli',
                    price: finalPrice,
                    platform: 'Steam'
                });
            }
        });

        console.log(`✅ Steam'den ${games.length} ücretsiz oyun bulundu!\n`);
        
        // İlk 5 oyunu göster
        console.log('İlk 5 oyun:');
        games.slice(0, 5).forEach((game, index) => {
            console.log(`${index + 1}. ${game.title}`);
            console.log(`   Fiyat: ${game.originalPrice} → ${game.price}`);
            console.log(`   URL: ${game.url.substring(0, 60)}...`);
            console.log('');
        });

        if (games.length === 0) {
            console.log('❌ Hiç oyun bulunamadı! Steam sayfası değişmiş olabilir.');
            console.log('Sayfa içeriğini kontrol etmek için:');
            console.log('1. Tarayıcıda https://store.steampowered.com/search/?maxprice=free&specials=1 açın');
            console.log('2. F12 Developer Tools ile HTML yapısını kontrol edin');
            console.log('3. #search_resultsRows selectorünün hala geçerli olup olmadığını kontrol edin');
        }

    } catch (error) {
        console.error('❌ Test sırasında hata:', error.message);
        console.log('\nSorun giderme:');
        console.log('1. İnternet bağlantınızı kontrol edin');
        console.log('2. Steam sitesine erişebildiğinizi kontrol edin');
        console.log('3. VPN kullanıyorsanız kapatıp deneyin');
    }
}

// Testi çalıştır
testSteamScraping();