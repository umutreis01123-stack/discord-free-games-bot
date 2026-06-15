require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const OWNER_ID = '1403495996138323989';
const botStartTime = Date.now();

// Bot hazır
client.once('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  console.log(`🎮 ${client.guilds.cache.size} sunucuda aktif`);
  
  // Bot durumunu güncelle
  updateBotStatus();
});

// Bot durumunu güncelle
function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  client.user.setActivity(`${serverCount} sunucuda aktif`, { type: 3 }); // 3 = WATCHING
}

// Yeni sunucuya katıldığında durumu güncelle
client.on('guildCreate', () => {
  updateBotStatus();
  console.log(`✅ Yeni sunucuya katıldı! Toplam: ${client.guilds.cache.size}`);
});

// Sunucudan atıldığında durumu güncelle
client.on('guildDelete', () => {
  updateBotStatus();
  console.log(`❌ Sunucudan atıldı! Toplam: ${client.guilds.cache.size}`);
});

// ========== KOMUTLAR BURAYA EKLENECEK ==========

// ========== WEB SERVER ==========

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/bot-stats', async (req, res) => {
  try {
    if (!client.user) {
      return res.json({
        status: 'offline',
        servers: 0,
        bot: null,
        founder: null
      });
    }

    // Kurucu bilgilerini al
    let founderData = null;
    try {
      const founder = await client.users.fetch(OWNER_ID);
      
      founderData = {
        username: founder.username,
        tag: founder.tag,
        id: founder.id,
        avatar: founder.displayAvatarURL({ dynamic: true, size: 128 }),
        status: 'online'
      };
      
      console.log(`✅ Kurucu bilgisi alındı: ${founder.username}`);
    } catch (error) {
      console.error('❌ Kurucu bilgisi alınamadı:', error);
    }

    res.json({
      status: 'online',
      servers: client.guilds.cache.size,
      bot: {
        username: client.user.username,
        tag: client.user.tag,
        id: client.user.id,
        avatar: client.user.displayAvatarURL({ dynamic: true, size: 256 })
      },
      founder: founderData
    });
  } catch (error) {
    console.error('Bot stats API hatası:', error);
    res.status(500).json({ error: 'İstatistik alınamadı' });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor`);
});

client.login(process.env.DISCORD_TOKEN);
