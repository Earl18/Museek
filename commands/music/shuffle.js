module.exports = {
  name: 'shuffle',
  description: 'Shuffle the queue',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    queue.shuffle();
    message.channel.send('🔀 Queue shuffled!');
  }
};
