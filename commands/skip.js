export default {
  name: "skip",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("❌ Nothing is playing.");

    try {
      await queue.skip();
      message.channel.send("⏭️ Skipped the current song.");
    } catch (error) {
      if (error?.errorCode === "NO_UP_NEXT") {
        message.channel.send("⚠️ There is no next song in the queue.");
      } else {
        console.error("Skip error:", error);
        message.channel.send("❌ An unexpected error occurred while skipping.");
      }
    }
  }
}
