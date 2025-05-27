const lyricsFinder = require('lyrics-finder');

module.exports = {
  name: 'lyrics',
  description: 'Show lyrics of the currently playing song',
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue) return message.channel.send('❌ Nothing is playing!');

    const song = queue.songs[0];

    // Clean up the song title
    function cleanTitle(raw) {
      return raw
        .replace(/\(.*?\)/g, '')     // remove stuff in parentheses
        .replace(/\[.*?\]/g, '')     // remove stuff in brackets
        .replace(/(official|video|lyrics|HD|audio|feat\..*|ft\..*)/gi, '')
        .replace(/[^a-zA-Z0-9\s\-']/g, '') // remove weird symbols
        .trim();
    }

    try {
      const cleaned = cleanTitle(song.name);
      let [artist, title] = cleaned.split(' - ');

      // Fallback if split fails
      if (!title) {
        title = artist;
        artist = '';
      }

      let lyrics = await lyricsFinder(artist?.trim() || '', title?.trim() || '');
      if (!lyrics) return message.channel.send(`❌ No lyrics found for **${song.name}**.`);

      // Trim if too long
      if (lyrics.length > 2000) lyrics = lyrics.substring(0, 1997) + '...';

      message.channel.send(`📜 **Lyrics for ${song.name}:**\n\n${lyrics}`);
    } catch (error) {
      console.error('❌ Lyrics command error:', error);
      message.channel.send('❌ An error occurred while searching for lyrics.');
    }
  }
};

