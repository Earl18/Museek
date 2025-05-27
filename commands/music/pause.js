module.exports = {
  name: 'pause',
  description: 'Pause the music',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue || !queue.playing) return message.channel.send('Nothing is playing!');
    queue.pause();
    message.channel.send('⏸️ Paused.');
  }
};
