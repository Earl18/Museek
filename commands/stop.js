export default {
  name: "stop",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("Nothing is playing.");
    queue.stop();
    message.channel.send("Playback stopped.");
  }
}
