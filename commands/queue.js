import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export default {
  name: "queue",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("❌ Nothing is playing.");

    const songsPerPage = 10;
    const totalPages = Math.ceil(queue.songs.length / songsPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * songsPerPage;
      const end = start + songsPerPage;
      const currentSongs = queue.songs.slice(start, end);

      const description = currentSongs.map((song, i) => {
        const index = start + i;
        return `${index === 0 ? "🎶" : `${index}.`} ${song.name} - \`${song.formattedDuration}\``;
      }).join('\n');

      return new EmbedBuilder()
        .setTitle("🎵 Music Queue")
        .setDescription(description || "No songs in queue.")
        .setColor(0x1DB954)
        .setFooter({ text: `Page ${page + 1} of ${totalPages}` });
    };

    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⏮️ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('⏭️ Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const messageReply = await message.channel.send({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
    });

    const collector = messageReply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000 // 2 minutes
    });

    collector.on('collect', async (interaction) => {
      if (!interaction.isButton()) return;

      if (interaction.customId === 'prev' && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === 'next' && currentPage < totalPages - 1) {
        currentPage++;
      }

      await interaction.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
      });
    });

    collector.on('end', async () => {
      try {
        await messageReply.edit({ components: [] }); // Disable buttons after timeout
      } catch (e) {
        console.error("Failed to disable buttons:", e.message);
      }
    });
  }
};

