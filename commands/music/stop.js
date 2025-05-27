module.exports = {
  name: 'stop',
  aliases: ['disconnect', 'leave', 'end', 'clear'],
  description: 'Stop the music, clear the queue, cancel playlist extractions, and leave voice channel',
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send('❌ You need to be in a voice channel to use this command!');
    }

    // Check if the user is allowed to stop
    const ownerId = client.voiceSessionOwner.get(message.guild.id);
    const isAdmin = message.member.permissions.has('ManageGuild');
    const isOwner = ownerId === message.author.id;

    if (!isOwner && !isAdmin) {
      return message.channel.send(
        `🚫 Only the person who started the music session or an admin can use \`!stop\`.\n` +
        `🎧 Session owner: <@${ownerId}>`
      );
    }

    const guildId = message.guild.id;
    let stoppedElements = [];
    let hadQueue = false;
    let hadExtraction = false;

    try {
      // Cancel any ongoing playlist extractions first
      if (client.playlistHandler && client.playlistHandler.cancelExtraction(guildId)) {
        stoppedElements.push('⏹️ Cancelled ongoing playlist extraction');
        hadExtraction = true;
        console.log(`🛑 Cancelled playlist extraction for guild ${guildId}`);
      }

      // Check if there's a queue
      const queue = client.distube.getQueue(guildId);
      
      if (queue) {
        hadQueue = true;
        const songsCount = queue.songs.length;
        
        // Stop the music and clear the queue completely
        await client.distube.stop(voiceChannel);
        
        stoppedElements.push(`🗑️ Cleared **${songsCount}** song${songsCount !== 1 ? 's' : ''} from queue`);
        stoppedElements.push('🎵 Stopped music playback');
        
        console.log(`🛑 Stopped queue with ${songsCount} songs for guild ${guildId}`);
      }

      // Force disconnect from voice channel as additional safety
      const botMember = message.guild.members.me;
      if (botMember.voice.channel) {
        try {
          await client.distube.voices.leave(guildId);
          stoppedElements.push('👋 Left voice channel');
          console.log(`👋 Left voice channel for guild ${guildId}`);
        } catch (leaveError) {
          console.log('Voice leave error (non-critical):', leaveError.message);
          // Try alternative disconnect method
          try {
            const connection = botMember.voice.channel;
            if (connection) {
              connection.disconnect();
              stoppedElements.push('👋 Disconnected from voice channel');
            }
          } catch (disconnectError) {
            console.log('Disconnect error:', disconnectError.message);
            stoppedElements.push('⚠️ May still be connected to voice channel');
          }
        }
      }

      // Send appropriate response based on what was stopped
      if (hadQueue || hadExtraction || botMember.voice.channel) {
        const emoji = hadQueue ? '⏹️' : (hadExtraction ? '🛑' : '👋');
        const title = hadQueue ? '**Music stopped!**' : (hadExtraction ? '**Extraction cancelled!**' : '**Left voice channel!**');
        
        message.channel.send(`${emoji} ${title}\n${stoppedElements.join('\n')}`);
      } else {
        message.channel.send('❌ Nothing to stop! I\'m not playing music or extracting playlists.');
      }
      client.voiceSessionOwner.delete(guildId);
      
    } catch (error) {
      console.error('Stop command error:', error);
      
      // Handle different error types gracefully
      let errorHandled = false;
      
      if (error.errorCode === 'NO_QUEUE' || error.message?.includes('No queue')) {
        // Still show extraction cancellation if it happened
        if (hadExtraction) {
          stoppedElements.push('❌ No music queue found (already stopped)');
          message.channel.send(`🛑 **Extraction cancelled!**\n${stoppedElements.join('\n')}`);
          errorHandled = true;
        } else {
          message.channel.send('❌ There is no music queue for this server!');
          errorHandled = true;
        }
      }
      
      if (!errorHandled) {
        // Try force cleanup methods
        try {
          // Force clear any remaining queue references
          if (client.distube.queues && client.distube.queues.has(guildId)) {
            client.distube.queues.delete(guildId);
            stoppedElements.push('🔧 Force cleared queue references');
          }
          
          // Force disconnect
          const botMember = message.guild.members.me;
          if (botMember.voice.channel) {
            try {
              await client.distube.voices.leave(guildId);
              stoppedElements.push('🔧 Force disconnected from voice');
            } catch (forceError) {
              // Try direct voice channel disconnect
              botMember.voice.channel.disconnect();
              stoppedElements.push('🔧 Direct voice disconnect');
            }
          }
          
          if (stoppedElements.length > 0) {
            message.channel.send(`⚠️ **Cleanup completed**\n${stoppedElements.join('\n')}\n*Note: Some components may have already been stopped*`);
          } else {
            message.channel.send(`❌ Error stopping music: ${error.message || 'Unknown error'}\n💡 **Try:** Manually disconnecting the bot or restarting`);
          }
          
        } catch (forceError) {
          console.error('Force cleanup error:', forceError);
          message.channel.send(`❌ Failed to stop music cleanly: ${error.message || 'Unknown error'}\n🔧 **Suggestion:** Try using the command again or restart the bot`);
        }
      }
    }
  }
};