require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log(`🔗 Invite link: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands`);
    
    try {
        // Komutları kaydet
        const commands = [
            {
                name: 'test',
                description: 'Test komutu'
            }
        ];
        
        await client.application.commands.set(commands);
        console.log('✅ Komutlar kaydedildi!');
        
        // 5 saniye sonra çık
        setTimeout(() => {
            console.log('Test tamamlandı, bot kapatılıyor...');
            process.exit(0);
        }, 5000);
        
    } catch (error) {
        console.error('❌ Komut kaydı hatası:', error.message);
        console.error('Detay:', error);
        process.exit(1);
    }
});

client.on('error', error => {
    console.error('❌ Discord client hatası:', error);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN bulunamadı!');
    process.exit(1);
}

console.log('Bot başlatılıyor...');
client.login(token).catch(err => {
    console.error('❌ Giriş hatası:', err.message);
    process.exit(1);
});