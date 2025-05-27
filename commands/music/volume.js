module.exports = {
  name: 'volume',
  description: 'Set the playback volume (0-100)',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please provide a volume percent (0-100).');
    const volume = parseInt(args[0]);
    if (isNaN(volume) || volume < 0 || volume > 100)
      return message.channel.send('Volume must be a number between 0 and 100.');

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    queue.setVolume(volume);
    message.channel.send(`🔊 Volume set to ${volume}%`);
  }
};
