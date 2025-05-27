module.exports = {
  name: 'move',
  description: 'Move a song to a different position in the queue',
  async execute(message, args, client) {
    if (args.length < 2) return message.channel.send('Please provide the current position and new position.');
    const from = parseInt(args[0]);
    const to = parseInt(args[1]);
    if (isNaN(from) || isNaN(to) || from < 1 || to < 1)
      return message.channel.send('Please provide valid song positions.');

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    if (from > queue.songs.length || to > queue.songs.length)
      return message.channel.send('Positions must be within the queue length.');

    const song = queue.songs.splice(from - 1, 1)[0];
    queue.songs.splice(to - 1, 0, song);

    message.channel.send(`🔀 Moved **${song.name}** from position ${from} to ${to}.`);
  }
};
