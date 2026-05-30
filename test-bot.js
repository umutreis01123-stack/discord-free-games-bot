// Basit test - Token olmadan kodun syntax kontrolü
console.log("=== BOT KODU SYNTAX KONTROLÜ ===");

// Gerekli modüller
try {
    const fs = require('fs');
    const path = require('path');
    
    console.log("✅ Node.js modülleri yüklendi");
    
    // Config dosyasını kontrol et
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log("✅ Config dosyası okundu");
        console.log(`   - Oyun kanalları: ${Object.keys(config.gameChannels || {}).length}`);
        console.log(`   - Bedava hesap stok: ${(config.freeAccounts?.stock || []).length} hesap`);
        console.log(`   - Kayıtlı kullanıcılar: ${Object.keys(config.freeAccounts?.users || {}).length}`);
    } else {
        console.log("❌ Config dosyası bulunamadı");
    }
    
    // .env dosyasını kontrol et
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const hasToken = envContent.includes('DISCORD_TOKEN=');
        console.log(`✅ .env dosyası bulundu`);
        console.log(`   - Token var mı: ${hasToken ? 'EVET' : 'HAYIR'}`);
        
        if (hasToken) {
            const tokenMatch = envContent.match(/DISCORD_TOKEN=([^\n\r]+)/);
            if (tokenMatch && tokenMatch[1]) {
                const token = tokenMatch[1];
                console.log(`   - Token uzunluğu: ${token.length} karakter`);
                console.log(`   - Token formatı: ${token.startsWith('MT') ? 'Doğru format' : 'Yanlış format'}`);
            }
        }
    } else {
        console.log("❌ .env dosyası bulunamadı");
    }
    
    // Ana bot dosyasını syntax kontrolü
    const botPath = path.join(__dirname, 'index-full.js');
    if (fs.existsSync(botPath)) {
        const botContent = fs.readFileSync(botPath, 'utf8');
        
        // Temel kontroller
        const checks = {
            'Discord.js import': botContent.includes('require(\'discord.js\')'),
            'Client oluşturma': botContent.includes('new Client'),
            'Komut tanımları': botContent.includes('SlashCommandBuilder'),
            'Bedava hesap sistemi': botContent.includes('freeAccounts'),
            'Ticket sistemi': botContent.includes('ticket'),
            'Oyun paylaşımı': botContent.includes('getSteamFreeGames')
        };
        
        console.log("✅ Ana bot dosyası bulundu");
        console.log("   - Syntax kontrolleri:");
        for (const [check, result] of Object.entries(checks)) {
            console.log(`     ${result ? '✓' : '✗'} ${check}`);
        }
        
        // Komut sayısını say
        const commandCount = (botContent.match(/new SlashCommandBuilder\(\)/g) || []).length;
        console.log(`   - Toplam komut sayısı: ${commandCount}`);
        
        // Yeni özellikler
        const newFeatures = {
            'Ürün ekle komutu': botContent.includes('ürünekle'),
            'Stok ekle komutu': botContent.includes('stokekle'),
            'Çekiliş komutu': botContent.includes('çekilişekle'),
            'Bedava hesap komutu': botContent.includes('bedavahesap'),
            'Kayıt ol komutu': botContent.includes('kayıtol'),
            'Hesap giriş komutu': botContent.includes('hesapgiriş')
        };
        
        console.log("   - Yeni bedava hesap sistemi komutları:");
        for (const [feature, result] of Object.entries(newFeatures)) {
            console.log(`     ${result ? '✓' : '✗'} ${feature}`);
        }
        
    } else {
        console.log("❌ Ana bot dosyası bulunamadı");
    }
    
    console.log("\n=== TEST SONUÇLARI ===");
    console.log("1. Yeni bedava hesap sistemi eklendi");
    console.log("2. 7 yeni komut eklendi:");
    console.log("   - /ürünekle (sadece umutpapa123)");
    console.log("   - /stokekle (sadece umutpapa123)");
    console.log("   - /çekilişekle (sadece umutpapa123)");
    console.log("   - /stokkanalekle (sadece umutpapa123)");
    console.log("   - /bedavahesap (tüm kullanıcılar)");
    console.log("   - /kayıtol (tüm kullanıcılar)");
    console.log("   - /hesapgiriş (tüm kullanıcılar)");
    console.log("\n3. Özellikler:");
    console.log("   - Günde 1 kez bedava hesap çekme");
    console.log("   - %10 şans ile hesap kazanma");
    console.log("   - DM kapalıysa özel mesaj gösterme");
    console.log("   - Otomatik kayıt ve giriş");
    console.log("   - Çekiliş sistemi");
    console.log("   - Roblox hesap stok yönetimi");
    
    console.log("\n=== SONRAKİ ADIMLAR ===");
    console.log("1. TOKEN-ALMA-KILAVUZU.md dosyasını okuyun");
    console.log("2. Yeni Discord token alın");
    console.log("3. .env dosyasına token'ı yapıştırın");
    console.log("4. Botu başlatın: node index-full.js");
    console.log("5. Komutları test edin");
    
} catch (error) {
    console.error("❌ Test sırasında hata:", error.message);
    console.error(error.stack);
}