module.exports = {
  name: 'seek',
  description: 'Seek to a specific time in the current song (seconds)',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please provide the seconds to seek to.');
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0) return message.channel.send('Please enter a valid number of seconds.');

    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');
    if (seconds > queue.songs[0].duration) return message.channel.send('That is past the end of the song.');
    queue.seek(seconds);
    message.channel.send(`⏩ Seeked to ${seconds} seconds`);
  }
};
