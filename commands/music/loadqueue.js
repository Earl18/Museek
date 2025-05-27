const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'loadqueue',
  description: 'Load a saved queue by name',
  async execute(message, args, client) {
    if (!args.length) return message.channel.send('Please provide the name of the saved queue.');
    const name = args[0];
    const filePath = path.resolve(__dirname, '../../savedQueues', `${name}.json`);

    if (!fs.existsSync(filePath)) return message.channel.send('No saved queue found with that name.');

    const songs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send('You need to be in a voice channel to load a queue.');

    try {
      for (const song of songs) {
        await client.distube.play(voiceChannel, song.url, {
          textChannel: message.channel,
          member: message.member,
          skipIfPlaying: true,
        });
      }
      message.channel.send(`📂 Loaded queue \`${name}\` with ${songs.length} songs.`);
    } catch (e) {
      console.error(e);
      message.channel.send('❌ Error loading saved queue.');
    }
  }
};
