const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } = require('discord.js');

module.exports = {
  name: 'queue',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');

    const songs = queue.songs;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(songs.length / itemsPerPage);

    // Helper to generate an embed for a given page
    function generateEmbed(page) {
      const start = page * itemsPerPage;
      const currentSongs = songs.slice(start, start + itemsPerPage);

      return new EmbedBuilder()
        .setTitle(`🎶 Queue - Page ${page + 1} / ${totalPages}`)
        .setDescription(
          currentSongs
            .map(
              (song, i) =>
                `${start + i + 1}. [${song.name}](${song.url}) — \`${song.formattedDuration}\``
            )
            .join('\n')
        )
        .setColor('Blue');
    }

    // Buttons for navigation
    const backButton = new ButtonBuilder()
      .setCustomId('back')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true);

    const nextButton = new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(totalPages <= 1);

    const row = new ActionRowBuilder().addComponents(backButton, nextButton);

    let currentPage = 0;
    const embedMessage = await message.channel.send({
      embeds: [generateEmbed(currentPage)],
      components: [row],
    });

    // Create a collector to handle button interactions
    const collector = embedMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000, // 60 seconds timeout
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "This isn't your queue to navigate!", ephemeral: true });
      }

      if (interaction.customId === 'back') {
        currentPage--;
      } else if (interaction.customId === 'next') {
        currentPage++;
      }

      // Update buttons state
      backButton.setDisabled(currentPage === 0);
      nextButton.setDisabled(currentPage === totalPages - 1);

      await interaction.update({
        embeds: [generateEmbed(currentPage)],
        components: [new ActionRowBuilder().addComponents(backButton, nextButton)],
      });
    });

    collector.on('end', () => {
      // Disable buttons after timeout
      backButton.setDisabled(true);
      nextButton.setDisabled(true);
      embedMessage.edit({ components: [new ActionRowBuilder().addComponents(backButton, nextButton)] });
    });
  },
};
