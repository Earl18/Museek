module.exports = {
  name: "skip",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("Nothing is playing.");
    if (queue.songs.length <= 1) return message.channel.send("No song to skip to.");

    const currentSong = queue.songs[0];
    if (currentSong.user.id !== message.author.id) {
      return message.channel.send("❌ Only the user who added the current song can skip it.");
    }

    try {
      await client.distube.skip(message);
      message.channel.send("⏭️ Skipped to the next song.");
    } catch (error) {
      message.channel.send("❌ Failed to skip the song.");
      console.error(error);
    }
  },
};
