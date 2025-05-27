module.exports = {
  name: 'clear',
  description: 'Clear the entire music queue',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    queue.songs = [queue.songs[0]]; // Keep current song, clear rest
    message.channel.send('🧹 Cleared the queue (except the currently playing song).');
  }
};
