const skipVotes = new Map();

module.exports.skipVotes = skipVotes;

module.exports = {
  name: 'skip',
  aliases: ['s', 'next'],
  description: 'Vote to skip the current song, or skip instantly if you requested it',
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send('❌ You need to be in a voice channel to use this command!');
    }

    const queue = client.distube.getQueue(message.guild.id);
    if (!queue || !queue.songs || queue.songs.length === 0) {
      return message.channel.send('❌ There is no music playing right now!');
    }

    const currentSong = queue.songs[0];
    const guildId = message.guild.id;
    const userId = message.author.id;

    const isRequester = currentSong.user?.id === userId;
    const isAdmin = message.member.permissions.has('ManageGuild');

    // Instaskip by requester or admin
    if (isRequester || isAdmin) {
      await queue.skip();
      skipVotes.delete(guildId);
      return message.channel.send(`⏭️ **Skipped:** ${currentSong.name}`);
    }

    // Get vote state for this guild
    let votes = skipVotes.get(guildId) || new Set();

    // If already voted, block repeat
    if (votes.has(userId)) {
      return message.channel.send(`🗳️ You already voted to skip **${currentSong.name}**.`);
    }

    votes.add(userId);
    skipVotes.set(guildId, votes);

    // Count eligible listeners
    const nonBotListeners = voiceChannel.members.filter(m => !m.user.bot);
    const voteCount = votes.size;
    const requiredVotes = Math.ceil(nonBotListeners.size / 2);

    if (voteCount >= requiredVotes) {
      await queue.skip();
      skipVotes.delete(guildId);
      return message.channel.send(`✅ **Vote passed!** Skipped: ${currentSong.name}`);
    } else {
      return message.channel.send(
        `🗳️ **${message.member.displayName}** voted to skip!\n` +
        `✅ ${voteCount}/${requiredVotes} votes to skip **${currentSong.name}**.`
      );
    }
  }
};
