export default {
  name: "loop",
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send("Nothing is playing.");
    const mode = queue.setRepeatMode((queue.repeatMode + 1) % 3);
    const modeText = ["Off", "Repeat Song", "Repeat Queue"];
    message.channel.send(`🔁 Loop mode: **${modeText[mode]}**`);
  }
}
