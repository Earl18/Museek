export default {
  name: "resume",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("Nothing is playing.");
    queue.resume();
    message.channel.send("▶️ Resumed.");
  }
}
