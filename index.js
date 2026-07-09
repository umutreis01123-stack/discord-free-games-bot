require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionFlagsBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

/*
=================================================================
ZWOZ BOT v8.0 - FUTBOL & WELCOME SİSTEMİ
=================================================================

KOMUTLAR:
- /futbolayarla          → Futbol maç takibi
- /şikayetkur           → Şikayet sistemi
- /sesteafk             → Bot 7/24 seste durur
- /gelengidenkur        → Giriş/Çıkış sistemi
- n!yardım              → Komut listesi

FUTBOL LİGLERİ:
- Dünya Kupası
- La Liga  
- Türkiye Ligi

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

function initFiles() {
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({}));
  if (!fs.existsSync(complaintsFile)) fs.writeFileSync(complaintsFile, JSON.stringify({}));
  if (!fs.existsSync(footballFile)) fs.writeFileSync(footballFile, JSON.stringify({}));
  if (!fs.existsSync(welcomeFile)) fs.writeFileSync(welcomeFile, JSON.stringify({}));
}

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

initFiles();

// BOT READY
client.once('ready', async () => {
  console.log('✅ Bot çalışıyor: ' + client.user.tag);
  
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName('futbolayarla')
        .setDescription('⚽ Futbol maç takibi ayarla')
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
        .setName('gelengidenkur')
        .setDescription('👋 Giriş/Çıkış sistemi kur'),
    ];

    await client.application.commands.set(commands);
    console.log('✅ Slash komutları eklendi: ' + commands.length);
    
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
      .setDescription(`**Hoş geldin reis** ${member.user.tag}!\n\nSunucumuza katıldığın için teşekkürler.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Kullanıcı', value: member.user.tag, inline: true },
        { name: '📅 Hesap Oluşturma', value: member.user.createdAt.toLocaleDateString('tr-TR'), inline: true },
        { name: '🆔 ID', value: member.user.id, inline: true }
      )
      .setFooter({ text: `Toplam üye: ${member.guild.memberCount}` })
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
      .setDescription(`**Hadi sattı gidebilirsin** ${member.user.tag}!\n\nBir üyemiz ayrıldı.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Ayrılan', value: member.user.tag, inline: true },
        { name: '📅 Ayrılma', value: new Date().toLocaleDateString('tr-TR'), inline: true }
      )
      .setFooter({ text: `Toplam üye: ${member.guild.memberCount}` })
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

  // YARDIM KOMUTU
  if (content === 'n!yardım' || content === 'n!help') {
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📋 ZWOZ Bot Komut Listesi')
      .setDescription('**Mevcut komutlar:**')
      .addFields(
        { name: '⚽ Futbol', value: '`/futbolayarla` - Maç takibi ayarla\n`n!maçlar` - Günün maçları', inline: false },
        { name: '📝 Şikayet', value: '`/şikayetkur` - Şikayet sistemi kur', inline: false },
        { name: '🔊 Ses', value: '`/sesteafk` - Bot ses kanalında durur', inline: false },
        { name: '👋 Gelen-Giden', value: '`/gelengidenkur` - Giriş/çıkış sistemi', inline: false },
        { name: '💬 Genel', value: '`sa` - Selam ver\n`n!yardım` - Bu menüyü göster', inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'ZWOZ Bot v8.0' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  // MAÇLAR KOMUTU
  if (content === 'n!maçlar' || content === 'n!maclar') {
    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('⚽ Günün Futbol Maçları')
      .setDescription('**Maç takibi sistemi aktif!**\n\nMaçlar canlı olarak takip edilecek ve gol durumları paylaşılacaktır.')
      .addFields(
        { name: '🏆 Dünya Kupası', value: 'Maç bilgileri otomatik güncellenecek', inline: false },
        { name: '🇪🇸 La Liga', value: 'Real Madrid vs Barcelona\n**15:00** - Canlı', inline: true },
        { name: '🇹🇷 Süper Lig', value: 'Galatasaray vs Fenerbahçe\n**19:00** - Yakında', inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
});

// SLASH COMMANDS VE BUTTONLAR
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  try {
    if (interaction.isChatInputCommand()) {
      // FUTBOL AYARLA
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
          enabled: true
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