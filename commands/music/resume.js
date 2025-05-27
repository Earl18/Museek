module.exports = {
  name: 'resume',
  description: 'Resume the music',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue || queue.playing) return message.channel.send('Queue is already playing!');
    queue.resume();
    message.channel.send('▶️ Resumed.');
  }
};
