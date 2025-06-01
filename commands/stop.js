module.exports = {
  name: "stop",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("Nothing is playing!");

    // Check if message author is the user who caused bot to join
    if (client.botJoinerId !== message.author.id) {
      return message.channel.send("❌ Only the user who made me join the voice channel can stop the music.");
    }

    try {
      queue.stop();

      // Disconnect the bot from the voice channel
      const voiceChannel = message.guild.members.me.voice.channel;
      if (voiceChannel) {
        await voiceChannel.leave();
      }

      message.channel.send("🛑 Music stopped and disconnected from the voice channel.");
    } catch (error) {
      message.channel.send("❌ Failed to stop the music.");
      console.error(error);
    }
  },
};
