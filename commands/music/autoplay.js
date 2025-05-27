module.exports = {
  name: 'autoplay',
  description: 'Toggle autoplay mode',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    const newAutoplay = !queue.autoplay;
    queue.toggleAutoplay();
    message.channel.send(`🔁 Autoplay is now \`${newAutoplay ? 'enabled' : 'disabled'}\``);
  }
};
