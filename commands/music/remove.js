module.exports = {
  name: 'remove',
  description: 'Remove a song from the queue by position',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please provide the position of the song to remove.');
    const pos = parseInt(args[0]);
    if (isNaN(pos) || pos < 1) return message.channel.send('Please provide a valid song position.');

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    if (pos > queue.songs.length) return message.channel.send('That position is not in the queue.');

    const removedSong = queue.songs.splice(pos - 1, 1)[0];
    message.channel.send(`🗑️ Removed **${removedSong.name}** from the queue.`);
  }
};
