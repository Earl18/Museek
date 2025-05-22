export default {
  name: "pause",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("Nothing is playing.");
    queue.pause();
    message.channel.send("⏸️ Paused.");
  }
}
