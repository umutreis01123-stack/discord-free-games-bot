// ========== YENİ FONKSİYONLAR ==========

// Restart komutu
async function handleRestart(interaction, user) {
    // Sadece umutpapa123 yapabilir
    if (user.username !== 'umutpapa123') {
        await interaction.reply({
            content: '❌ Bu komutu sadece umutpapa123 kullanabilir!',
            ephemeral: true
        });
        return;
    }
    
    await interaction.reply({
        content: '🔄 Bot yeniden başlatılıyor...',
        ephemeral: true
    });
    
    console.log(`Bot ${user.tag} tarafından yeniden başlatıldı.`);
    
    // 3 saniye bekle ve process'i yeniden başlat
    setTimeout(() => {
        process.exit(0);
    }, 3000);
}

// Ticket kanalı ayarla
async function handleTicketChannelSet(interaction, options) {
    const channel = options.getChannel('kanal');
    const guildId = interaction.guildId;
    
    config.ticketChannels[guildId] = channel.id;
    saveConfig();
    
    // Ticket açma butonu oluştur
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('🎫 Ticket Aç')
                .setStyle(ButtonStyle.Primary)
        );
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🎫 TICKET SİSTEMİ')
        .setDescription('Bir sorununuz mu var? Şikayetiniz mi var? Aşağıdaki butona tıklayarak ticket açabilirsiniz.\n\n**Önemli:** Lütfen kanıtlarınızı (ekran görüntüsü, video, link) ticket açarken ekleyin.')
        .addFields(
            { name: '📋 Ticket Türleri', value: '• Şikayet\n• Sorun\n• Öneri\n• Diğer', inline: true },
            { name: '⏱️ Yanıt Süresi', value: '24 saat içinde', inline: true }
        )
        .setTimestamp();
    
    await channel.send({ embeds: [embed], components: [row] });
    
    await interaction.reply({
        content: `✅ Ticket kanalı ${channel} olarak ayarlandı ve buton eklendi!`,
        ephemeral: true
    });
}

// Ticket aç
async function handleTicketOpen(interaction, options) {
    const subject = options.getString('konu');
    const description = options.getString('açıklama');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    // Ticket kanalı var mı?
    const ticketChannelId = config.ticketChannels[guildId];
    if (!ticketChannelId) {
        await interaction.reply({
            content: '❌ Önce ticket kanalı ayarlayın! `/ticketkanalıayarla`',
            ephemeral: true
        });
        return;
    }
    
    // Ticket ID oluştur
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    // Ticket kanalı oluştur
    const guild = interaction.guild;
    const category = guild.channels.cache.find(c => c.type === 4 && c.name.includes('Tickets')) || 
                     await guild.channels.create({
                         name: '🎫 Tickets',
                         type: 4 // Category
                     });
    
    const ticketChannel = await guild.channels.create({
        name: `ticket-${ticketId.toLowerCase()}`,
        type: 0, // Text channel
        parent: category.id,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: userId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: client.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
            }
        ]
    });
    
    // Moderator'ları ekle
    for (const modId of config.moderators) {
        await ticketChannel.permissionOverwrites.create(modId, {
            ViewChannel: true,
            SendMessages: true
        });
    }
    
    // Ticket'ı kaydet
    if (!config.activeTickets[guildId]) {
        config.activeTickets[guildId] = {};
    }
    
    config.activeTickets[guildId][ticketId] = {
        userId: userId,
        channelId: ticketChannel.id,
        subject: subject,
        description: description,
        createdAt: Date.now(),
        status: 'open'
    };
    saveConfig();
    
    // Ticket kanalına mesaj gönder
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`🎫 TICKET #${ticketId}`)
        .addFields(
            { name: '👤 Açan', value: `${interaction.user.tag} (${userId})`, inline: true },
            { name: '📌 Konu', value: subject, inline: true },
            { name: '📝 Açıklama', value: description, inline: false },
            { name: '🕐 Açılma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '📊 Durum', value: '🔓 Açık', inline: true }
        )
        .setFooter({ text: 'Lütfen kanıtlarınızı bu kanala gönderin' })
        .setTimestamp();
    
    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`close_ticket_${ticketId}`)
                .setLabel('🔒 Ticketı Kapat')
                .setStyle(ButtonStyle.Danger)
        );
    
    await ticketChannel.send({ 
        content: `${interaction.user} hoş geldin! Yetkililer yakında ilgilenecek.\n\n**Yetkililer:** ${config.moderators.map(id => `<@${id}>`).join(' ')}`,
        embeds: [embed],
        components: [closeButton]
    });
    
    // Log kanalına bildir
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🎫 YENİ TICKET AÇILDI')
                .addFields(
                    { name: 'Ticket ID', value: ticketId, inline: true },
                    { name: 'Kullanıcı', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Konu', value: subject, inline: false },
                    { name: 'Kanal', value: `${ticketChannel}`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
    
    // Yetkililere DM
    for (const modId of config.moderators) {
        try {
            const mod = await guild.members.fetch(modId);
            if (mod) {
                await mod.send(`🔔 **YENİ TICKET!**\nTicket ID: ${ticketId}\nKullanıcı: ${interaction.user.tag}\nKonu: ${subject}\nKanal: ${ticketChannel}`);
            }
        } catch (e) {
            console.log('Moderatöre DM gönderilemedi:', modId);
        }
    }
    
    await interaction.reply({
        content: `✅ Ticket açıldı! Kanal: ${ticketChannel}\n**Ticket ID:** ${ticketId}`,
        ephemeral: true
    });
}

// Ticket kapat
async function handleTicketClose(interaction, options) {
    const ticketId = options.getString('ticketid');
    const guildId = interaction.guildId;
    
    if (!config.activeTickets[guildId] || !config.activeTickets[guildId][ticketId]) {
        await interaction.reply({
            content: '❌ Ticket bulunamadı!',
            ephemeral: true
        });
        return;
    }
    
    const ticket = config.activeTickets[guildId][ticketId];
    
    // Sadece yetkili veya ticket sahibi kapatabilir
    const isModerator = config.moderators.includes(interaction.user.id);
    const isOwner = ticket.userId === interaction.user.id;
    
    if (!isModerator && !isOwner) {
        await interaction.reply({
            content: '❌ Bu ticketı kapatma yetkiniz yok!',
            ephemeral: true
        });
        return;
    }
    
    // Ticket kanalını bul
    const ticketChannel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);
    
    if (ticketChannel) {
        // Kapatma mesajı
        const closeEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`🔒 TICKET KAPATILDI #${ticketId}`)
            .addFields(
                { name: '👤 Açan', value: `<@${ticket.userId}>`, inline: true },
                { name: '👮 Kapatan', value: `${interaction.user.tag}`, inline: true },
                { name: '📌 Konu', value: ticket.subject, inline: false },
                { name: '🕐 Açılma', value: `<t:${Math.floor(ticket.createdAt / 1000)}:R>`, inline: true },
                { name: '🕐 Kapanma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
        
        await ticketChannel.send({ embeds: [closeEmbed] });
        
        // 10 saniye sonra kanalı sil
        setTimeout(async () => {
            try {
                await ticketChannel.delete('Ticket kapatıldı');
            } catch (e) {
                console.error('Kanal silinemedi:', e);
            }
        }, 10000);
    }
    
    // Ticket'ı sil
    delete config.activeTickets[guildId][ticketId];
    saveConfig();
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 TICKET KAPATILDI')
                .addFields(
                    { name: 'Ticket ID', value: ticketId, inline: true },
                    { name: 'Kullanıcı', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Kapatan', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Süre', value: `${Math.floor((Date.now() - ticket.createdAt) / 60000)} dakika`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
    
    await interaction.reply({
        content: `✅ Ticket #${ticketId} kapatıldı! Kanal 10 saniye sonra silinecek.`,
        ephemeral: true
    });
}

// Giveaway başlat
async function handleGiveawayStart(interaction, options) {
    const prize = options.getString('ödül');
    const winners = options.getInteger('kazanan');
    const duration = options.getInteger('süre'); // dakika
    
    const guildId = interaction.guildId;
    const giveawayId = `GIVEAWAY-${Date.now()}`;
    
    const endTime = Date.now() + (duration * 60 * 1000);
    
    // Giveaway'ı kaydet
    if (!config.giveaways[guildId]) {
        config.giveaways[guildId] = {};
    }
    
    config.giveaways[guildId][giveawayId] = {
        prize: prize,
        winners: winners,
        endTime: endTime,
        participants: [],
        creator: interaction.user.id,
        channelId: interaction.channelId,
        messageId: null
    };
    saveConfig();
    
    // Giveaway embed'i
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎉 GIVEAWAY BAŞLADI! 🎉')
        .setDescription(`**Ödül:** ${prize}\n**Kazanan Sayısı:** ${winners}\n**Süre:** ${duration} dakika`)
        .addFields(
            { name: '🎁 Katılımcılar', value: '0 kişi', inline: true },
            { name: '⏱️ Bitiş', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Katılmak için 🎉 emojisine tıklayın!' })
        .setTimestamp();
    
    const joinButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`join_giveaway_${giveawayId}`)
                .setLabel('🎉 Katıl')
                .setStyle(ButtonStyle.Success)
        );
    
    const message = await interaction.reply({ 
        content: '@everyone 🎉 **YENİ GIVEAWAY!** 🎉',
        embeds: [embed],
        components: [joinButton],
        fetchReply: true 
    });
    
    // Message ID'yi kaydet
    config.giveaways[guildId][giveawayId].messageId = message.id;
    saveConfig();
    
    // Giveaway bitiş zamanlayıcısı
    setTimeout(async () => {
        await endGiveaway(guildId, giveawayId);
    }, duration * 60 * 1000);
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎉 YENİ GIVEAWAY')
                .addFields(
                    { name: 'Ödül', value: prize, inline: true },
                    { name: 'Kazanan', value: `${winners} kişi`, inline: true },
                    { name: 'Süre', value: `${duration} dakika`, inline: true },
                    { name: 'Başlatan', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Giveaway ID', value: giveawayId, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
}

// Giveaway bitir
async function endGiveaway(guildId, giveawayId) {
    const giveaway = config.giveaways[guildId]?.[giveawayId];
    if (!giveaway) return;
    
    const participants = giveaway.participants;
    
    // Kazananları seç
    let winners = [];
    if (participants.length > 0) {
        const shuffled = [...participants].sort(() => 0.5 - Math.random());
        winners = shuffled.slice(0, Math.min(giveaway.winners, participants.length));
    }
    
    // Mesajı güncelle
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (channel) {
            const message = await channel.messages.fetch(giveaway.messageId);
            
            const resultEmbed = new EmbedBuilder()
                .setColor(winners.length > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle('🎉 GIVEAWAY SONA ERDİ! 🎉')
                .setDescription(`**Ödül:** ${giveaway.prize}\n**Katılımcı Sayısı:** ${participants.length}`)
                .addFields(
                    { name: '🏆 Kazananlar', value: winners.length > 0 ? winners.map(id => `<@${id}>`).join('\n') : 'Kazanan yok!', inline: false }
                )
                .setFooter({ text: 'Giveaway sona erdi' })
                .setTimestamp();
            
            await message.edit({ 
                embeds: [resultEmbed],
                components: [] // Butonları kaldır
            });
            
            // Kazananlara bildir
            for (const winnerId of winners) {
                try {
                    const winner = await channel.guild.members.fetch(winnerId);
                    await winner.send(`🎉 **TEBRİKLER!** Giveaway kazandınız!\n**Ödül:** ${giveaway.prize}\n**Sunucu:** ${channel.guild.name}`);
                } catch (e) {
                    console.log('Kazana DM gönderilemedi:', winnerId);
                }
            }
            
            // Kazananları kanalda duyur
            if (winners.length > 0) {
                await channel.send(`🎉 **GIVEAWAY SONUÇLARI!**\nÖdül: ${giveaway.prize}\nKazananlar: ${winners.map(id => `<@${id}>`).join(', ')}\nTebrikler! 🎁`);
            }
        }
    } catch (e) {
        console.error('Giveaway sonlandırma hatası:', e);
    }
    
    // Giveaway'ı sil
    delete config.giveaways[guildId][giveawayId];
    saveConfig();
    
    // Log
    const logChannelId = config.logChannels[guildId];
    if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 GIVEAWAY SONA ERDİ')
                .addFields(
                    { name: 'Ödül', value: giveaway.prize, inline: true },
                    { name: 'Katılımcı', value: `${participants.length} kişi`, inline: true },
                    { name: 'Kazanan', value: `${winners.length} kişi`, inline: true },
                    { name: 'Giveaway ID', value: giveawayId, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }
}

// Button interaksiyonları
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { customId, guildId, user } = interaction;
    
    try {
        // Ticket açma butonu
        if (customId === 'open_ticket') {
            // Modal göster
            // (Discord.js v14'te modal desteği var ama basit tutalım)
            await interaction.reply({
                content: 'Ticket açmak için `/ticketaç` komutunu kullanın!',
                ephemeral: true
            });
        }
        
        // Ticket kapatma butonu
        else if (customId.startsWith('close_ticket_')) {
            const ticketId = customId.replace('close_ticket_', '');
            await handleTicketClose(interaction, { getString: () => ticketId });
        }
        
        // Giveaway katılma butonu
        else if (customId.startsWith('join_giveaway_')) {
            const giveawayId = customId.replace('join_giveaway_', '');
            const giveaway = config.giveaways[guildId]?.[giveawayId];
            
            if (!giveaway) {
                await interaction.reply({
                    content: '❌ Giveaway bulunamadı!',
                    ephemeral: true
                });
                return;
            }
            
            if (giveaway.endTime < Date.now()) {
                await interaction.reply({
                    content: '❌ Giveaway sona ermiş!',
                    ephemeral: true
                });
                return;
            }
            
            if (!giveaway.participants.includes(user.id)) {
                giveaway.participants.push(user.id);
                saveConfig();
                
                // Katılımcı sayısını güncelle
                try {
                    const channel = await client.channels.fetch(giveaway.channelId);
                    if (channel) {
                        const message = await channel.messages.fetch(giveaway.messageId);
                        const embed = message.embeds[0];
                        
                        const newEmbed = EmbedBuilder.from(embed)
                            .spliceFields(0, 1, { 
                                name: '🎁 Katılımcılar', 
                                value: `${giveaway.participants.length} kişi`, 
                                inline: true 
                            });
                        
                        await message.edit({ embeds: [newEmbed] });
                    }
                } catch (e) {
                    console.error('Giveaway güncelleme hatası:', e);
                }
                
                await interaction.reply({
                    content: '✅ Giveaway\'a katıldınız! 🎉',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Zaten giveaway\'a katıldınız!',
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error('Button hatası:', error);
        await interaction.reply({
            content: '❌ İşlem sırasında hata!',
            ephemeral: true
        });
    }
});

async function notifyModerators(guild, message) {
    for (const modId of config.moderators) {
        try {
            const mod = await guild.members.fetch(modId);
            if (mod) {
                await mod.send(`🔔 **MODERASYON BİLDİRİMİ**\nSunucu: ${guild.name}\n${message}`);
            }
        } catch (e) {
            console.log('Moderatöre DM gönderilemedi:', modId);
        }
    }
}