export default {
  name: "hq",
  async execute(message, args, client) {
    if (!client.premiumUsers.includes(message.author.id)) {
      return message.reply("❌ This is a premium-only command.");
    }

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("❌ Nothing is playing.");

    try {
      await queue.filters.clear();
      message.channel.send("🎧 High-quality playback enabled — all filters removed for best audio fidelity.");
    } catch (error) {
      console.error("HQ Clear Filter Error:", error);
      message.channel.send("❌ Failed to switch to high-quality playback.");
    }
  }
}
