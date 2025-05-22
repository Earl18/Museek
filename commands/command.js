import { EmbedBuilder } from "discord.js";

export default {
  name: "command",
  aliases: ["help"],
  async execute(message, args, client) {
    const embed = new EmbedBuilder()
      .setTitle("📜 Available Commands")
      .setColor(0x00AE86)
      .setDescription("Here's a list of all available commands:\n")
      .addFields(
        { name: "🎵 Music Controls", value: `
\`!play <song>\` - Play a song or playlist from YouTube.
\`!pause\` - Pause the current song.
\`!resume\` - Resume the paused song.
\`!skip\` - Skip to the next song.
\`!stop\` - Stop and clear the queue.
\`!queue\` - View the current queue with pagination.
\`!loop\` - Toggle repeat mode.
\`!nowplaying\` - Show the current song.
        ` }
      )
      .setFooter({ text: "Use ! before each command, e.g. !play despacito" });

    await message.channel.send({ embeds: [embed] });
  }
};
