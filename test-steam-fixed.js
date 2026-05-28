// Güncellenmiş Steam testi
const axios = require('axios');
const cheerio = require('cheerio');

async function testSteamScraping() {
    console.log('Steam ücretsiz oyun testi (güncellenmiş)...\n');
    
    try {
        // Steam'in Free to Play sayfasını deneyelim
        const response = await axios.get('https://store.steampowered.com/search/?sort_by=Released_DESC&tags=492&category1=998&supportedlang=english&specials=1&ndl=1', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        console.log('Sayfa yüklendi, HTML analizi yapılıyor...');
        const $ = cheerio.load(response.data);
        
        // Tüm HTML'yi kaydet (debug için)
        // fs.writeFileSync('steam-page.html', response.data);
        
        // Farklı selector'lar deneyelim
        console.log('\nFarklı selector\'lar deneniyor:');
        
        // 1. search_resultsRows
        const rows1 = $('#search_resultsRows a');
        console.log(`1. #search_resultsRows a: ${rows1.length} element`);
        
        // 2. search_result_row
        const rows2 = $('.search_result_row');
        console.log(`2. .search_result_row: ${rows2.length} element`);
        
        // 3. search_result
        const rows3 = $('.search_result');
        console.log(`3. .search_result: ${rows3.length} element`);
        
        // 4. Tüm linkler
        const allLinks = $('a');
        console.log(`4. Tüm a tag'leri: ${allLinks.length} element`);
        
        // İlk 5 .search_result_row'u inceleyelim
        if (rows2.length > 0) {
            console.log('\nİlk 3 oyun bilgisi:');
            rows2.slice(0, 3).each((index, element) => {
                const title = $(element).find('.title').text().trim();
                const price = $(element).find('.discount_final_price').text().trim();
                console.log(`${index + 1}. ${title} - ${price}`);
            });
        }
        
        // Alternatif: Steam API kullanımı
        console.log('\n--- ALTERNATİF YÖNTEM ---');
        console.log('Steam Web API kullanılabilir:');
        console.log('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
        console.log('https://store.steampowered.com/api/featuredcategories/');
        
        // Basit bir test: Steam store ana sayfası
        console.log('\nSteam store ana sayfası testi:');
        const homeResponse = await axios.get('https://store.steampowered.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const home$ = cheerio.load(homeResponse.data);
        const freeGames = home$('a:contains("Free")').length;
        console.log(`Ana sayfada "Free" içeren ${freeGames} link bulundu.`);

    } catch (error) {
        console.error('❌ Test sırasında hata:', error.message);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Headers: ${JSON.stringify(error.response.headers)}`);
        }
    }
}

// Testi çalıştır
testSteamScraping();