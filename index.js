require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

/*
=================================================================
ZWOZ BOT v5.0 - SUNUCU GÜVENLİĞİ & REKLAM YÖNETIMI
=================================================================

KOMUTLAR:
- /reklamkanalı          → Reklam sunucusu & kanalı belirle
- -randomfoto            → Siteden fotoğraf yükle
- /fotoyasak             → Fotoğraf kontrolünü aç
- /fotokapa              → Fotoğraf kontrolünü kapat
- /adminayarla @user     → Admin ekle
- /admin-kaldır @user    → Admin çıkar

İŞLEYİŞ:
1. Web sitesinden fotoğraf yükle
2. Admin onay bekle (Onayla/Reddet)
3. -randomfoto ile random paylaş
4. Reklam kanalına gönder

=================================================================
*/

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Fotoğraf upload ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yükleme yapılabilir'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const OWNER_ID = '1403495996138323989';

// JSON Files
const configFile = './config.json';
const photosFile = './photos.json';
const adminsFile = './admins.json';
const pendingFile = './pending-photos.json';

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(photosFile)) fs.writeFileSync(photosFile, JSON.stringify([]));
  if (!fs.existsSync(adminsFile)) fs.writeFileSync(adminsFile, JSON.stringify({}));
  if (!fs.existsSync(pendingFile)) fs.writeFileSync(pendingFile, JSON.stringify([]));
}

function getConfig() {
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
}

function getPhotos() {
  return JSON.parse(fs.readFileSync(photosFile, 'utf8'));
}

function savePhotos(data) {
  fs.writeFileSync(photosFile, JSON.stringify(data, null, 2));
}

function getAdmins() {
  return JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
}

function saveAdmins(data) {
  fs.writeFileSync(adminsFile, JSON.stringify(data, null, 2));
}

function getPending() {
  return JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
}

function savePending(data) {
  fs.writeFileSync(pendingFile, JSON.stringify(data, null, 2));
}

initFiles();

// Bot ready
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  console.log('📊 Toplam Sunucu: ' + client.guilds.cache.size);
  
  try {
    console.log('⚙️ Slash komutları kurgulanıyor...');

    const allCommands = await client.application.commands.fetch();
    for (const command of allCommands.values()) {
      try {
        await command.delete();
      } catch (error) {
        console.error('Komut silme hatası:', error);
      }
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('reklamkanalı')
        .setDescription('📢 Reklam sunucusu ve kanalı belirle')
        .addStringOption(option => option.setName('sunucu_id').setDescription('Sunucu ID').setRequired(true))
        .addStringOption(option => option.setName('kanal_id').setDescription('Kanal ID').setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('fotoyasak')
        .setDescription('🔒 Fotoğraf kontrolünü aç'),
      
      new SlashCommandBuilder()
        .setName('fotokapa')
        .setDescription('🔓 Fotoğraf kontrolünü kapat'),
      
      new SlashCommandBuilder()
        .setName('adminayarla')
        .setDescription('👨‍💼 Admin ekle')
        .addUserOption(option => option.setName('kullanici').setDescription('Admin yapılacak kullanıcı').setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('admin-kaldır')
        .setDescription('❌ Admin kaldır')
        .addUserOption(option => option.setName('kullanici').setDescription('Admin kaldırılacak kullanıcı').setRequired(true)),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
    // BOT STATUS'UNU BAŞLAT (Her 5 saniye değiş)
    updateBotStatus();
    setInterval(updateBotStatus, 5000);
    
  } catch (error) {
    console.error('❌ Komut kurulum hatası:', error);
  }
});

// BOT STATUS UPDATE
let statusIndex = 0;
function updateBotStatus() {
  const serverCount = client.guilds.cache.size;
  
  // Tüm sunuculardaki toplam üye sayısını hesapla
  let totalMembers = 0;
  client.guilds.cache.forEach(guild => {
    totalMembers += guild.memberCount;
  });
  
  const statuses = [
    `${serverCount} sunucuda 🤖`,
    `${totalMembers} kişi kullanıyor 👥`,
    `Çok tatlış bir botum 😊 | Sorun olursa kurucumla iletişime geçin 📞`
  ];
  
  client.user.setActivity(statuses[statusIndex], { type: 2 });
  statusIndex = (statusIndex + 1) % statuses.length;
}

// Yeni sunucu eklenirse
client.on('guildCreate', (guild) => {
  console.log(`➕ Yeni sunucu: ${guild.name} (Toplam: ${client.guilds.cache.size})`);
});

// Sunucu kaldırılırsa
client.on('guildDelete', (guild) => {
  console.log(`➖ Sunucu kaldırıldı: ${guild.name} (Toplam: ${client.guilds.cache.size})`);
});

// Slash Commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    if (interaction.isChatInputCommand()) {
      // REKLAM KANALINI BELIRLE
      if (commandName === 'reklamkanalı') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const sunucu_id = interaction.options.getString('sunucu_id');
        const kanal_id = interaction.options.getString('kanal_id');

        const guild = client.guilds.cache.get(sunucu_id);
        const channel = guild?.channels.cache.get(kanal_id);

        if (!guild || !channel) {
          return await interaction.reply({ content: '❌ Sunucu veya kanal bulunamadı!', ephemeral: true });
        }

        let config = getConfig();
        config.adChannelGuild = sunucu_id;
        config.adChannelId = kanal_id;
        saveConfig(config);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Reklam Kanalı Ayarlandı')
          .setDescription(`Sunucu: ${guild.name}\nKanal: ${channel.name}`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // FOTOĞRAF KONTROLÜNÜ AÇ
      else if (commandName === 'fotoyasak') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        let config = getConfig();
        config.photoCheckEnabled = true;
        saveConfig(config);

        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('✅ Fotoğraf Kontrolü Açıldı')
          .setDescription('Artık tüm fotoğraflar admin onayı bekleyecek')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // FOTOĞRAF KONTROLÜNÜ KAPAT
      else if (commandName === 'fotokapa') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        let config = getConfig();
        config.photoCheckEnabled = false;
        saveConfig(config);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('✅ Fotoğraf Kontrolü Kapatıldı')
          .setDescription('Fotoğraflar artık doğrudan paylaşılacak')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // ADMIN EKLE
      else if (commandName === 'adminayarla') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('kullanici');
        let admins = getAdmins();

        if (!admins[interaction.guildId]) {
          admins[interaction.guildId] = [];
        }

        if (admins[interaction.guildId].includes(targetUser.id)) {
          return await interaction.reply({ content: '❌ Bu kullanıcı zaten admin!', ephemeral: true });
        }

        admins[interaction.guildId].push(targetUser.id);
        saveAdmins(admins);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Admin Eklendi')
          .setDescription(`${targetUser.tag} admin yapıldı`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // ADMIN KALDIR
      else if (commandName === 'admin-kaldır') {
        if (user.id !== OWNER_ID) {
          return await interaction.reply({ content: '❌ Sadece owner kullanabilir!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('kullanici');
        let admins = getAdmins();

        if (!admins[interaction.guildId] || !admins[interaction.guildId].includes(targetUser.id)) {
          return await interaction.reply({ content: '❌ Bu kullanıcı admin değil!', ephemeral: true });
        }

        admins[interaction.guildId] = admins[interaction.guildId].filter(id => id !== targetUser.id);
        saveAdmins(admins);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('✅ Admin Kaldırıldı')
          .setDescription(`${targetUser.tag} admin olmaktan çıkarıldı`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // BUTTON HANDLER - FOTOĞRAF ONAY/REDDET
    else if (interaction.isButton()) {
      const [action, photoId] = interaction.customId.split('_');

      if (action === 'approve') {
        let pending = getPending();
        const photo = pending.find(p => p.id === photoId);

        if (!photo) {
          return await interaction.reply({ content: '❌ Fotoğraf bulunamadı!', ephemeral: true });
        }

        // Reklam kanalına gönder
        try {
          const config = getConfig();
          const guild = client.guilds.cache.get(config.adChannelGuild);
          const channel = guild?.channels.cache.get(config.adChannelId);

          if (channel) {
            await channel.send({
              files: [photo.filePath],
              embeds: [new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('📢 Reklam')
                .setImage(`attachment://` + path.basename(photo.filePath))
                .setFooter({ text: 'Yüklediği: ' + photo.uploader })
                .setTimestamp()
              ]
            });
          }
        } catch (error) {
          console.error('Reklam gönderme hatası:', error);
        }

        // Pending'den sil
        pending = pending.filter(p => p.id !== photoId);
        savePending(pending);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Fotoğraf Onaylandı')
          .setDescription('Reklam kanalına gönderildi')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      else if (action === 'reject') {
        let pending = getPending();
        const photo = pending.find(p => p.id === photoId);

        if (!photo) {
          return await interaction.reply({ content: '❌ Fotoğraf bulunamadı!', ephemeral: true });
        }

        // Dosyayı sil
        try {
          fs.unlinkSync(photo.filePath);
        } catch (error) {
          console.error('Dosya silme hatası:', error);
        }

        // Pending'den sil
        pending = pending.filter(p => p.id !== photoId);
        savePending(pending);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('❌ Fotoğraf Reddedildi')
          .setDescription('Fotoğraf silinmiştir')
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

  } catch (error) {
    console.error('Interaction hatası:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Hata oluştu!', ephemeral: true }).catch(() => {});
    }
  }
});

// PREFIX COMMANDS
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith('-')) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // RANDOM FOTOĞRAF PAYLAŞ
    if (command === 'randomfoto') {
      if (message.author.id !== OWNER_ID) {
        return await message.reply('❌ Sadece owner kullanabilir!');
      }

      const photos = getPhotos();

      if (photos.length === 0) {
        return await message.reply('❌ Henüz fotoğraf yok!');
      }

      const randomPhoto = photos[Math.floor(Math.random() * photos.length)];

      try {
        const config = getConfig();
        const guild = client.guilds.cache.get(config.adChannelGuild);
        const channel = guild?.channels.cache.get(config.adChannelId);

        if (!channel) {
          return await message.reply('❌ Reklam kanalı ayarlanmamış!');
        }

        await channel.send({
          files: [randomPhoto.filePath],
          embeds: [new EmbedBuilder()
            .setColor('#667eea')
            .setTitle('📢 Random Reklam')
            .setImage(`attachment://` + path.basename(randomPhoto.filePath))
            .setFooter({ text: 'Yüklediği: ' + randomPhoto.uploader })
            .setTimestamp()
          ]
        });

        await message.reply('✅ Fotoğraf paylaşıldı!');
      } catch (error) {
        console.error('Fotoğraf paylaşma hatası:', error);
        await message.reply('❌ Hata oluştu!');
      }
    }

  } catch (error) {
    console.error('Komut hatası:', error);
  }
});

// WEB SERVER

// FOTOĞRAF YÜKLE
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Fotoğraf gerekli' });
    }

    const config = getConfig();
    const photoId = Date.now().toString();

    const photoData = {
      id: photoId,
      filePath: req.file.path,
      fileName: req.file.filename,
      uploader: req.body.uploader || 'Bilinmiyor',
      uploadedAt: new Date().toISOString(),
      status: config.photoCheckEnabled ? 'pending' : 'approved'
    };

    if (config.photoCheckEnabled) {
      // Admin onayı bekle
      let pending = getPending();
      pending.push(photoData);
      savePending(pending);

      // Admin'lere bildirim gönder
      try {
        const guild = client.guilds.cache.first();
        if (guild) {
          const admins = getAdmins()[guild.id] || [];
          
          for (const adminId of admins) {
            const user = await client.users.fetch(adminId);
            
            const approveBtn = new ButtonBuilder()
              .setCustomId(`approve_${photoId}`)
              .setLabel('✅ Onayla')
              .setStyle(ButtonStyle.Success);

            const rejectBtn = new ButtonBuilder()
              .setCustomId(`reject_${photoId}`)
              .setLabel('❌ Reddet')
              .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

            const embed = new EmbedBuilder()
              .setColor('#f39c12')
              .setTitle('📸 Fotoğraf Onayı Bekleniyor')
              .setDescription(`${photoData.uploader} tarafından yüklendi`)
              .setImage(`attachment://` + photoData.fileName)
              .setFooter({ text: 'Onayla veya Reddet' })
              .setTimestamp();

            await user.send({
              embeds: [embed],
              components: [row],
              files: [req.file.path]
            });
          }
        }
      } catch (error) {
        console.error('Admin bildirimi hatası:', error);
      }

      return res.json({ success: true, message: 'Fotoğraf admin onayı bekleniyor', photoId });
    } else {
      // Doğrudan kaydet
      let photos = getPhotos();
      photos.push(photoData);
      savePhotos(photos);

      return res.json({ success: true, message: 'Fotoğraf kaydedildi', photoId });
    }

  } catch (error) {
    console.error('Fotoğraf yükleme hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// BEKLEMEDE OLAN FOTOĞRAFLAR
app.get('/api/pending-photos', (req, res) => {
  try {
    const pending = getPending();
    const config = getConfig();
    
    res.json({
      enabled: config.photoCheckEnabled,
      count: pending.length,
      photos: pending.map(p => ({
        id: p.id,
        uploader: p.uploader,
        uploadedAt: p.uploadedAt,
        status: p.status
      }))
    });
  } catch (error) {
    console.error('Pending fotoğraflar getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// ONAYLANAN FOTOĞRAFLAR
app.get('/api/approved-photos', (req, res) => {
  try {
    const photos = getPhotos();
    res.json({
      count: photos.length,
      photos: photos.map(p => ({
        id: p.id,
        uploader: p.uploader,
        uploadedAt: p.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Onaylanan fotoğraflar getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// BOT AYARLARI
app.get('/api/config', (req, res) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// İSTATİSTİKLER
app.get('/api/stats', (req, res) => {
  try {
    const photos = getPhotos();
    const pending = getPending();
    const config = getConfig();

    res.json({
      approvedPhotos: photos.length,
      pendingPhotos: pending.length,
      photoCheckEnabled: config.photoCheckEnabled,
      adChannelSet: !!config.adChannelId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server
const server = app.listen(PORT, () => {
  console.log('🌐 Web server çalışıyor: port ' + PORT);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} zaten kullanımda!`);
    process.exit(1);
  } else {
    console.error('Server hatası:', err);
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Bot login hatası:', err);
  process.exit(1);
});
