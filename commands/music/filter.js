const filters = [
  '3d', 'bassboost', 'echo', 'karaoke', 'nightcore', 'vaporwave',
  'flanger', 'gate', 'haas', 'reverse', 'surround', 'mcompand',
  'phaser', 'tremolo', 'earwax'
];

module.exports = {
  name: 'filter',
  description: 'Toggle audio filters',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please specify a filter to toggle.');
    const filter = args[0].toLowerCase();
    if (!filters.includes(filter)) return message.channel.send(`Invalid filter. Valid filters: ${filters.join(', ')}`);

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');

    if (queue.filters.has(filter)) {
      queue.filters.remove(filter);
      message.channel.send(`🔈 Removed filter: \`${filter}\``);
    } else {
      queue.filters.add(filter);
      message.channel.send(`🎛️ Added filter: \`${filter}\``);
    }
  }
};
