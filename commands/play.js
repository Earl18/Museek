// Simple in-memory cache for song info (key: song query)
const ytdlCache = new Map();

module.exports = {
  name: "play",
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply("Join a voice channel first!");

    const song = args.join(" ");
    if (!song) return message.reply("Provide a song name or link.");

    // Store who triggered the bot join (keep your logic)
    client.botJoinerId = message.author.id;

    try {
      // Check cache first
      if (ytdlCache.has(song)) {
        // Play cached song info
        await client.distube.play(voiceChannel, ytdlCache.get(song), {
          textChannel: message.channel,
          member: message.member,
        });
      } else {
        // Play normally and cache the song info
        const queue = await client.distube.play(voiceChannel, song, {
          textChannel: message.channel,
          member: message.member,
        });
        ytdlCache.set(song, song);

        // Limit cache size to 50 items (FIFO)
        if (ytdlCache.size > 50) {
          const firstKey = ytdlCache.keys().next().value;
          ytdlCache.delete(firstKey);
        }
      }
    } catch (error) {
      console.error(error);
      message.reply("Failed to play the song.");
    }
  },
};
