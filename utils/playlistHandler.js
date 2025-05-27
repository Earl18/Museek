const ytdl = require('ytdl-core');
const axios = require('axios');

class PlaylistHandler {
  constructor(client) {
    this.client = client;
    this.maxSongsPerPlaylist = 50; // Limit to prevent spam
    this.immediateSongs = 1; // Only play the first song immediately
    this.activeExtractions = new Map(); // Track active extractions per guild
    this.silentGuilds = new Set(); // Track guilds that should suppress addSong messages
  }

  /**
   * Cancel ongoing extraction for a guild
   */
  cancelExtraction(guildId) {
    if (this.activeExtractions.has(guildId)) {
      const extraction = this.activeExtractions.get(guildId);
      extraction.cancelled = true;
      this.activeExtractions.delete(guildId);
      console.log(`🛑 Cancelled playlist extraction for guild ${guildId}`);
      return true;
    }
    return false;
  }

  /**
   * Check if extraction is cancelled
   */
  isExtractionCancelled(guildId) {
    const extraction = this.activeExtractions.get(guildId);
    return extraction && extraction.cancelled;
  }

  /**
   * Register new extraction
   */
  registerExtraction(guildId, statusMessage) {
    this.activeExtractions.set(guildId, {
      cancelled: false,
      statusMessage: statusMessage,
      startTime: Date.now(),
      isPlaylistLoading: true
    });
  }

  /**
   * Enable silent mode for a guild (suppress addSong messages)
   */
  enableSilentMode(guildId) {
    this.silentGuilds.add(guildId);
  }

  /**
   * Disable silent mode for a guild (allow addSong messages)
   */
  disableSilentMode(guildId) {
    this.silentGuilds.delete(guildId);
  }

  /**
   * Check if guild is in silent mode
   */
  isSilentMode(guildId) {
    return this.silentGuilds.has(guildId);
  }

  /**
   * Attempts to handle playlist with fallback methods
   */
  async handlePlaylist(voiceChannel, playlistUrl, textChannel, member) {
    const guildId = voiceChannel.guild.id;
    
    const methods = [
      () => this.directPlaylistMethod(voiceChannel, playlistUrl, textChannel, member),
      () => this.fallbackPlaylistMethod(voiceChannel, playlistUrl, textChannel, member),
      () => this.manualExtractionMethod(voiceChannel, playlistUrl, textChannel, member)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`🔄 Trying playlist method ${i + 1}/3`);
        const result = await methods[i]();
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.log(`❌ Method ${i + 1} failed:`, error.message);
        if (i === methods.length - 1) {
          // Clean up on final failure
          this.activeExtractions.delete(guildId);
          throw error;
        }
      }
    }
  }

  /**
   * Method 1: Direct DisTube playlist handling
   */
  async directPlaylistMethod(voiceChannel, playlistUrl, textChannel, member) {
    const guildId = voiceChannel.guild.id;
    
    // Enable silent mode to suppress individual song messages
    this.enableSilentMode(guildId);
    this.registerExtraction(guildId, null);
    
    try {
      await this.client.distube.play(voiceChannel, playlistUrl, {
        textChannel: textChannel,
        member: member
      });
      
      // Disable silent mode after playlist loads
      setTimeout(() => {
        this.disableSilentMode(guildId);
        this.activeExtractions.delete(guildId);
      }, 10000); // Give it 10 seconds to finish loading
      
      return { success: true, method: 'direct' };
    } catch (error) {
      this.disableSilentMode(guildId);
      this.activeExtractions.delete(guildId);
      throw error;
    }
  }

  /**
   * Method 2: Fallback using yt-dlp to extract playlist info with immediate playback
   */
  async fallbackPlaylistMethod(voiceChannel, playlistUrl, textChannel, member) {
    const guildId = voiceChannel.guild.id;
    const ytdlExec = require('yt-dlp-exec');
    
    try {
      // First, get playlist info with corrected arguments
      const playlistInfo = await ytdlExec(playlistUrl, {
        'flat-playlist': true,
        'quiet': true,
        'no-warnings': true,
        'playlist-end': this.maxSongsPerPlaylist,
        'ignore-errors': true,
        'dump-single-json': true,
        'no-download': true
      });

      let entries = [];
      
      if (playlistInfo && Array.isArray(playlistInfo.entries)) {
        entries = playlistInfo.entries.filter(entry => entry && entry.id);
      } else if (playlistInfo && playlistInfo.entries) {
        entries = Object.values(playlistInfo.entries).filter(entry => entry && entry.id);
      }

      if (entries.length === 0) {
        throw new Error('Could not extract playlist information');
      }

      entries = entries.slice(0, this.maxSongsPerPlaylist);
      
      const statusMessage = await textChannel.send(
        `📋 **Loading playlist:** ${playlistInfo.title || 'Unknown Playlist'}\n` +
        `🎵 **Found ${entries.length} songs - Starting playback...**`
      );

      // Register extraction and enable silent mode
      this.registerExtraction(guildId, statusMessage);
      this.enableSilentMode(guildId);

      // Play first song to start the queue
      const firstEntry = entries[0];
      const firstVideoUrl = `https://www.youtube.com/watch?v=${firstEntry.id}`;
      
      await this.client.distube.play(voiceChannel, firstVideoUrl, {
        textChannel: textChannel,
        member: member
      });

      // Update status after first song starts
      await statusMessage.edit(`🎵 **Playlist started!** Adding remaining ${entries.length - 1} songs silently...`);

      // Add remaining songs in background silently
      const remainingEntries = entries.slice(1);
      if (remainingEntries.length > 0) {
        this.addRemainingPlaylistSongs(remainingEntries, voiceChannel, textChannel, member, statusMessage, 1, 0, entries.length, guildId)
          .then(() => {
            statusMessage.edit(`✅ **Playlist loaded!** ${entries.length} songs ready to play 🎶`);
          })
          .catch(error => {
            if (!this.isExtractionCancelled(guildId)) {
              console.log('Background playlist loading error:', error.message);
              statusMessage.edit(`⚠️ **Playlist partially loaded** - Some songs may have failed to load`);
            }
          })
          .finally(() => {
            this.disableSilentMode(guildId);
            this.activeExtractions.delete(guildId);
          });
      } else {
        await statusMessage.edit(`✅ **Playlist loaded!** 1 song ready to play 🎶`);
        this.disableSilentMode(guildId);
        this.activeExtractions.delete(guildId);
      }
      
      return { 
        success: true, 
        method: 'fallback-immediate',
        stats: { successCount: 1, failCount: 0, total: entries.length }
      };

    } catch (error) {
      console.log('yt-dlp fallback method failed:', error.message);
      this.disableSilentMode(guildId);
      this.activeExtractions.delete(guildId);
      throw error;
    }
  }

  /**
   * Background method to add remaining playlist songs silently
   */
  async addRemainingPlaylistSongs(remainingEntries, voiceChannel, textChannel, member, statusMessage, initialSuccessCount, initialFailCount, totalSongs, guildId) {
    let successCount = initialSuccessCount;
    let failCount = initialFailCount;
    
    for (let i = 0; i < remainingEntries.length; i++) {
      // Check if extraction was cancelled
      if (this.isExtractionCancelled(guildId)) {
        return;
      }

      try {
        const entry = remainingEntries[i];
        if (!entry.id) continue;
        
        const videoUrl = `https://www.youtube.com/watch?v=${entry.id}`;
        
        // Add songs silently without any status updates
        await this.client.distube.play(voiceChannel, videoUrl, {
          textChannel: textChannel,
          member: member
        });

        successCount++;
        
        // Update progress every 5 songs
        if (i > 0 && (i + 1) % 5 === 0) {
          const progress = Math.round(((i + 1) / remainingEntries.length) * 100);
          await statusMessage.edit(`🎵 **Loading playlist...** ${progress}% complete (${successCount}/${totalSongs} songs loaded)`);
        }
        
        // Longer delay for background loading to prevent rate limiting
        await this.sleep(1000);
        
      } catch (error) {
        console.log(`❌ Failed to add background song ${i + 1}:`, error.message);
        failCount++;
        continue;
      }
    }

    console.log(`✅ Playlist loading complete: ${successCount} success, ${failCount} failed`);
  }

  /**
   * Method 3: Manual extraction using YouTube search
   */
  async manualExtractionMethod(voiceChannel, playlistUrl, textChannel, member) {
    const guildId = voiceChannel.guild.id;
    
    // This is a basic implementation - you might want to use a proper YouTube API
    const playlistId = this.extractPlaylistId(playlistUrl);
    if (!playlistId) {
      throw new Error('Could not extract playlist ID');
    }

    // Try to get basic playlist info
    const songs = await this.searchPlaylistSongs(playlistId, textChannel);
    
    if (songs.length === 0) {
      throw new Error('No songs found in playlist');
    }

    const statusMessage = await textChannel.send(`🔍 **Loading playlist...**\n🎵 **Starting playback...**`);
    
    // Register extraction
    this.registerExtraction(guildId, statusMessage);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < songs.length; i++) {
      if (this.isExtractionCancelled(guildId)) {
        return { success: false, cancelled: true };
      }

      try {
        // Search for the song by title silently
        await this.client.distube.play(voiceChannel, songs[i], {
          textChannel: textChannel,
          member: member
        });

        successCount++;
        await this.sleep(800); // Longer delay for searches
        
      } catch (error) {
        console.log(`❌ Failed to add song "${songs[i]}":`, error.message);
        failCount++;
        continue;
      }
    }

    await statusMessage.edit(`✅ **Playlist loaded!** ${successCount} songs ready to play 🎶`);
    this.activeExtractions.delete(guildId);
    
    return { 
      success: true, 
      method: 'manual',
      stats: { successCount, failCount, total: songs.length }
    };
  }

  /**
   * Extract playlist ID from URL
   */
  extractPlaylistId(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('list');
    } catch {
      return null;
    }
  }

  /**
   * Special handler for auto-generated playlists (YouTube Music, Radio, etc.)
   */
  async handleAutoGeneratedPlaylist(voiceChannel, playlistUrl, textChannel, member) {
    const guildId = voiceChannel.guild.id;
    
    try {
      // Method 1: Try using yt-dlp to extract the full playlist with immediate playback
      const result = await this.extractAutoGeneratedPlaylist(voiceChannel, playlistUrl, textChannel, member);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.log('Auto-generated playlist extraction failed:', error.message);
      this.activeExtractions.delete(guildId);
    }

    // Method 2: Try to get related videos from the current video
    try {
      const result = await this.extractRelatedVideos(voiceChannel, playlistUrl, textChannel, member);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.log('Related videos extraction failed:', error.message);
      this.activeExtractions.delete(guildId);
    }

    this.activeExtractions.delete(guildId);
    return { success: false, error: 'Could not extract auto-generated playlist' };
  }

  /**
   * Extract auto-generated playlist using yt-dlp with immediate playback
   */
  async extractAutoGeneratedPlaylist(voiceChannel, playlistUrl, textChannel, member) {
    const guildId = voiceChannel.guild.id;
    const ytdlExec = require('yt-dlp-exec');
    
    try {
      // Use yt-dlp to get playlist information with corrected options
      const playlistInfo = await ytdlExec(playlistUrl, {
        'flat-playlist': true,
        'quiet': true,
        'no-warnings': true,
        'playlist-end': this.maxSongsPerPlaylist,
        'ignore-errors': true,
        'dump-single-json': true,
        'no-download': true,
        // Additional options for auto-generated playlists
        'playlist-items': `1-${this.maxSongsPerPlaylist}`
      });

      let entries = [];
      
      if (playlistInfo && Array.isArray(playlistInfo.entries)) {
        entries = playlistInfo.entries.filter(entry => entry && entry.id);
      } else if (playlistInfo && playlistInfo.entries) {
        // Sometimes it's not an array but an object
        entries = Object.values(playlistInfo.entries).filter(entry => entry && entry.id);
      }

      if (entries.length === 0) {
        throw new Error('No valid entries found in playlist');
      }

      // Limit the number of songs
      entries = entries.slice(0, this.maxSongsPerPlaylist);

      const statusMessage = await textChannel.send(
        `🤖 **Loading auto-generated playlist...**\n` +
        `🎵 **Found ${entries.length} songs - Starting playback...**`
      );

      // Register extraction and enable silent mode
      this.registerExtraction(guildId, statusMessage);
      this.enableSilentMode(guildId);

      // Play first song
      const firstEntry = entries[0];
      const firstVideoUrl = `https://www.youtube.com/watch?v=${firstEntry.id}`;
      
      await this.client.distube.play(voiceChannel, firstVideoUrl, {
        textChannel: textChannel,
        member: member
      });

      await statusMessage.edit(`🎵 **Auto-generated playlist started!** Adding remaining ${entries.length - 1} songs...`);

      // Load remaining songs in background silently
      const remainingEntries = entries.slice(1);
      if (remainingEntries.length > 0) {
        this.addRemainingPlaylistSongs(remainingEntries, voiceChannel, textChannel, member, statusMessage, 1, 0, entries.length, guildId)
          .then(() => {
            statusMessage.edit(`✅ **Auto-generated playlist loaded!** ${entries.length} songs ready 🎶`);
          })
          .catch(error => {
            if (!this.isExtractionCancelled(guildId)) {
              console.log('Background auto-generated playlist loading error:', error.message);
            }
          })
          .then(() => {
            statusMessage.edit(`✅ **Playlist loaded!** ${entries.length} songs ready to play 🎶`);
          })
          .catch(error => {
            if (!this.isExtractionCancelled(guildId)) {
                console.log('Background playlist loading error:', error.message);
                statusMessage.edit(`⚠️ **Playlist partially loaded** - Some songs may have failed to load`);
            }
          })
          .finally(() => {
         // Delay silent mode disable to ensure all 'addSong' events finish
            setTimeout(() => {
            this.disableSilentMode(guildId);
            this.activeExtractions.delete(guildId);
            }, 5000); // Wait an extra 5 seconds after background loading completes
          });
      } else {
        this.disableSilentMode(guildId);
        this.activeExtractions.delete(guildId);
      }
      
      return { 
        success: true, 
        method: 'auto-generated-immediate',
        stats: { successCount: 1, failCount: 0, total: entries.length }
      };

    } catch (error) {
      console.log('yt-dlp auto-generated extraction failed:', error.message);
      this.activeExtractions.delete(guildId);
      throw error;
    }
  }

  /**
   * Extract related videos as fallback
   */
  async extractRelatedVideos(voiceChannel, playlistUrl, textChannel, member) {
    try {
      // Extract the current video ID
      const urlObj = new URL(playlistUrl);
      const videoId = urlObj.searchParams.get('v');
      
      if (!videoId) {
        throw new Error('No video ID found');
      }

      // Start with the current video
      const currentVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      const statusMessage = await textChannel.send(
        `🎵 **Starting with current video...**\n` +
        `💡 **Tip:** Auto-generated playlists are limited. Consider using regular playlists for full functionality.`
      );

      await this.client.distube.play(voiceChannel, currentVideoUrl, {
        textChannel: textChannel,
        member: member
      });

      await statusMessage.edit(`🎵 **Playing current video!**\n💡 For more songs, try searching for similar tracks manually.`);

      return { 
        success: true, 
        method: 'single-video-fallback',
        stats: { successCount: 1, failCount: 0, total: 1 }
      };

    } catch (error) {
      console.log('Related videos extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Basic playlist song search (placeholder - implement based on your needs)
   */
  async searchPlaylistSongs(playlistId, textChannel) {
    // This is a placeholder implementation
    // You would need to implement actual playlist song extraction here
    // For now, return empty array to trigger other methods
    return [];
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if playlist is supported
   */
  isPlaylistSupported(url) {
    try {
      const urlObj = new URL(url);
      const listId = urlObj.searchParams.get('list');
      
      if (!listId) return false;
      
      // Check for unsupported playlist types
      const unsupportedPrefixes = ['RDEM', 'RDMM', 'RD'];
      return !unsupportedPrefixes.some(prefix => listId.startsWith(prefix));
    } catch {
      return false;
    }
  }

  /**
   * Get playlist type for better error messages
   */
  getPlaylistType(url) {
    try {
      const urlObj = new URL(url);
      const listId = urlObj.searchParams.get('list');
      
      if (!listId) return 'unknown';
      
      if (listId.startsWith('RDEM') || listId.startsWith('RDMM')) return 'auto-generated';
      if (listId.startsWith('RD')) return 'radio';
      if (listId.startsWith('UU') || listId.startsWith('UULF')) return 'channel-uploads';
      if (listId.startsWith('PL')) return 'user-playlist';
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

module.exports = PlaylistHandler;