module.exports = {
  name: 'loop',
  description: 'Set loop mode (off, track, queue)',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please specify loop mode: off, track, queue.');
    const mode = args[0].toLowerCase();

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');

    let loopMode;
    switch (mode) {
      case 'off':
        loopMode = 0;
        break;
      case 'track':
        loopMode = 1;
        break;
      case 'queue':
        loopMode = 2;
        break;
      default:
        return message.channel.send('Invalid loop mode. Use off, track, or queue.');
    }
    queue.setRepeatMode(loopMode);
    message.channel.send(`🔁 Loop mode set to \`${mode}\``);
  }
};
