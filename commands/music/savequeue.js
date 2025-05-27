const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'savequeue',
  description: 'Save the current queue for later loading',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please provide a name for the saved queue.');
    const name = args[0];
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('Nothing is playing!');

    const savedQueuesPath = path.resolve(__dirname, '../../savedQueues');
    if (!fs.existsSync(savedQueuesPath)) fs.mkdirSync(savedQueuesPath);

    const filePath = path.join(savedQueuesPath, `${name}.json`);
    const data = queue.songs.map(song => ({
      url: song.url,
      name: song.name,
      duration: song.duration,
    }));

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    message.channel.send(`💾 Saved queue as \`${name}\``);
  }
};
