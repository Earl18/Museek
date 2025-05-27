const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'queue',
  aliases: ['q', 'list'],
  description: 'Show the current music queue',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message.guild.id);

    if (!queue || queue.songs.length === 0) {
      return message.channel.send('❌ The queue is empty! Use `!play <song>` to add music.');
    }

    const songsPerPage = 10;
    const pages = Math.ceil((queue.songs.length - 1) / songsPerPage);
    let page = 0;

    const generateQueueEmbed = (pageIndex) => {
      const currentSong = queue.songs[0];
      const start = pageIndex * songsPerPage + 1;
      const end = Math.min(start + songsPerPage, queue.songs.length);

      const embed = new EmbedBuilder()
        .setTitle('🎶 Music Queue')
        .setColor('Blue')
        .addFields([
          {
            name: '🎵 Now Playing',
            value: `**${currentSong.name}** \`${currentSong.formattedDuration}\`\n👤 Requested by: ${currentSong.user}`,
            inline: false
          }
        ]);

      const nextSongs = queue.songs.slice(start, end);
      if (nextSongs.length > 0) {
        embed.addFields([
          {
            name: '📋 Up Next:',
            value: nextSongs.map((song, i) =>
              `**${start + i}.** ${song.name} \`${song.formattedDuration}\``
            ).join('\n'),
            inline: false
          }
        ]);
      }

      const totalDuration = queue.songs.reduce((sum, s) => sum + s.duration, 0);
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);

      embed.setFooter({
        text: `Page ${pageIndex + 1}/${pages || 1} • Total: ${queue.songs.length} songs • Duration: ${hours > 0 ? `${hours}h ` : ''}${minutes}m`
      });

      return embed;
    };

    const generateButtons = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= pages - 1),
        new ButtonBuilder()
          .setCustomId('last')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= pages - 1),
      );
    };

    const embedMessage = await message.channel.send({
      embeds: [generateQueueEmbed(page)],
      components: [generateButtons()]
    });

    const collector = embedMessage.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      switch (interaction.customId) {
        case 'first': page = 0; break;
        case 'prev': page = Math.max(page - 1, 0); break;
        case 'next': page = Math.min(page + 1, pages - 1); break;
        case 'last': page = pages - 1; break;
      }

      await embedMessage.edit({
        embeds: [generateQueueEmbed(page)],
        components: [generateButtons()]
      });
    });

    collector.on('end', async () => {
      // Disable all buttons when collector ends
      const disabledRow = new ActionRowBuilder().addComponents(
        generateButtons().components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
      );

      await embedMessage.edit({
        components: [disabledRow]
      });
    });
  }
};
