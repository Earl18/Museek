require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');
const fs = require('fs');
const config = require('./utils/config'); // Assuming you use this somewhere
const ytdlExec = require('yt-dlp-exec');
const PlaylistHandler = require('./utils/playlistHandler'); // Add this import

if (!process.env.DISCORD_TOKEN) console.warn('⚠️ DISCORD_TOKEN is missing from .env!');
if (!process.env.SPOTIFY_ID || !process.env.SPOTIFY_SECRET) console.warn('⚠️ SPOTIFY_ID or SPOTIFY_SECRET is missing from .env!');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.voiceSessionOwner = new Map(); // guildId => userId
client.commands = new Collection();

// Initialize playlist handler
client.playlistHandler = new PlaylistHandler(client);

// Load all commands from folders
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    client.commands.set(command.name, command);
  }
}

// Load events
fs.readdirSync('./events').forEach(file => {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
});

// Enhanced DisTube configuration to bypass bot detection
client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: true,
  savePreviousSongs: true,
  emitAddListWhenCreatingQueue: true,
  ytdlOptions: {
    // Add these options to bypass bot detection
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    },
    // Additional options to avoid detection
    quality: 'highestaudio',
    filter: 'audioonly',
    format: 'mp4',
    highWaterMark: 1024 * 1024 * 10, // 10MB buffer
  },
  plugins: [
    new SpotifyPlugin({
      api: {
        clientId: process.env.SPOTIFY_ID,
        clientSecret: process.env.SPOTIFY_SECRET,
      },
    }),
    new YouTubePlugin({
      cookies: [], // Add cookies if needed for region-locked content
      ytdlOptions: {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        }
      }
    }),
    new YtDlpPlugin({
      exec: ytdlExec,
      update: false,
      // YT-DLP options to bypass restrictions
      options: {
        format: 'bestaudio/best',
        'extract-flat': false,
        'no-warnings': true,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'referer': 'https://www.youtube.com/',
      }
    }),
  ],
});

console.log('Spotify ID:', process.env.SPOTIFY_ID ? 'Loaded' : 'Missing');
console.log('Spotify Secret:', process.env.SPOTIFY_SECRET ? 'Loaded' : 'Missing');

// Enhanced DisTube event handlers with better error handling
client.distube
  .on('playSong', (queue, song) => {
    console.log(`🎶 Playing: ${song.name} - ${song.formattedDuration}`);

    queue.setVolume(100);
    
    // Always send playing message
    queue.textChannel.send(`🎶 **Now Playing:** ${song.name}\n⏱️ Duration: \`${song.formattedDuration}\`\n👤 Requested by: ${song.user}`);
  })
  .on('addSong', (queue, song) => {
    console.log(`➕ Added: ${song.name} - ${song.formattedDuration}`);
  
    // Check if this guild is in silent mode (playlist loading)
    const guildId = queue.id;
    const isSilent = client.playlistHandler.isSilentMode(guildId);

    console.log(`[AddSong] isSilent for ${process.env.GUILD_ID}:`, isSilent);
  
    // Only send message if NOT in silent mode
    if (!isSilent) {
      queue.textChannel.send(`➕ **Added to queue:** ${song.name}\n⏱️ Duration: \`${song.formattedDuration}\`\n👤 Requested by: ${song.user}\n📍 Position: \`${queue.songs.length}\``);
    }
  })
  .on('addList', (queue, playlist) => {
    console.log(`📋 Added playlist: ${playlist.name} (${playlist.songs.length} songs)`);
    
    // Check if this is from playlist extraction (silent mode)
    const guildId = queue.id;
    const isPlaylistExtraction = client.playlistHandler.activeExtractions.has(guildId);
    
    // Only send message if NOT from playlist extraction
    if (!isPlaylistExtraction) {
      queue.textChannel.send(`📋 **Added playlist:** ${playlist.name}\n🎵 Songs: \`${playlist.songs.length}\`\n👤 Requested by: ${playlist.user}`);
    }
  })
  .on('playList', (queue, playlist) => {
    console.log(`📋 Playing playlist: ${playlist.name}`);
    
    // Check if this is from playlist extraction (silent mode)
    const guildId = queue.id;
    const isPlaylistExtraction = client.playlistHandler.activeExtractions.has(guildId);
    
    // Only send message if NOT from playlist extraction
    if (!isPlaylistExtraction) {
      queue.textChannel.send(`📋 **Started playlist:** ${playlist.name}\n🎵 Total songs: \`${playlist.songs.length}\``);
    }
  })
  .on('noRelated', (queue) => {
    console.log('❌ No related songs found');
    queue.textChannel.send('❌ No related songs found. Queue ended.');
  })
  .on('error', (channel, error) => {
    console.error('❌ DisTube error:', error);
    
    // Enhanced error handling for bot detection
    let errorMessage = '❌ An error occurred';
    
    if (error.message) {
      if (error.message.includes('Sign in to confirm') || error.message.includes('bot')) {
        errorMessage = '❌ YouTube blocked the request. Trying alternative method...';
        
        // Try to suggest fallback
        if (channel && typeof channel.send === 'function') {
          channel.send(errorMessage + '\n💡 **Suggestion:** Try using a direct YouTube link or search for the song with different keywords.');
        }
        return;
      } else if (error.message.includes('Cannot read properties of undefined')) {
        errorMessage = '❌ Failed to parse playlist. This format may not be supported.';
      } else if (error.message.includes('Unknown Playlist')) {
        errorMessage = '❌ This playlist type is not supported (possibly auto-generated or private).';
      } else if (error.message.includes('Private video')) {
        errorMessage = '❌ This video is private or unavailable.';
      } else if (error.message.includes('Age-restricted')) {
        errorMessage = '❌ This content is age-restricted.';
      } else if (error.message.includes('not available')) {
        errorMessage = '❌ This content is not available in your region.';
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        errorMessage = '❌ Too many requests. Please wait a moment before trying again.';
      } else {
        errorMessage = `❌ Error: ${error.message}`;
      }
    }
    
    if (channel && typeof channel.send === 'function') {
      channel.send(errorMessage);
    } else {
      console.log('❌ Could not send error message to channel.');
    }
  })
  .on('finish', queue => {
    console.log('✅ Queue finished.');
    
    // Clean up any active extractions for this guild
    client.playlistHandler.activeExtractions.delete(queue.id);
    
    queue.textChannel.send('✅ Queue finished! Add more songs or use `!play` to continue the party! 🎉');
  })
  .on('disconnect', queue => {
    console.log('👋 Disconnected from voice channel');
    
    // Clean up any active extractions for this guild
    client.playlistHandler.activeExtractions.delete(queue.id);
    
    queue.textChannel.send('👋 Disconnected from voice channel.');
  })
  .on('empty', queue => {
    console.log('😴 Voice channel is empty');
    
    // Clean up any active extractions for this guild
    client.playlistHandler.activeExtractions.delete(queue.id);
    
    queue.textChannel.send('😴 Voice channel is empty. Leaving to save resources!');
  })
  .on('debug', (msg) => {
    // Only log important debug messages to reduce spam
    if (msg.includes('error') || msg.includes('Error') || msg.includes('fail') || msg.includes('Sign in')) {
      console.log('[DisTube Debug]', msg);
    }
  });

// Prefix command handler
const prefix = '!';

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error('Command execution error:', error);
    
    // Enhanced command error handling
    let errorMsg = '❌ There was an error executing that command.';
    
    if (error.message) {
      if (error.message.includes('Missing Access')) {
        errorMsg = '❌ I don\'t have permission to join your voice channel.';
      } else if (error.message.includes('Connection')) {
        errorMsg = '❌ Failed to connect to voice channel. Please try again.';
      } else if (error.message.includes('Sign in to confirm') || error.message.includes('bot')) {
        errorMsg = '❌ YouTube blocked the request. Please try:\n• Using a different search term\n• Providing a direct YouTube link\n• Waiting a few minutes before trying again';
      }
    }
    
    message.channel.send(errorMsg);
  }
});

// Enhanced error handling for unhandled promises
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled promise rejection:', err);
  
  // Handle YouTube bot detection errors
  if (err.message && err.message.includes('Sign in to confirm')) {
    console.log('🔧 YouTube bot detection error caught - bot continuing to run');
    return;
  }
  
  // Handle specific DisTube errors
  if (err.errorCode === 'NO_UP_NEXT') {
    console.log('🔧 NO_UP_NEXT error caught - this happens when trying to skip with no songs in queue');
    return;
  }
  
  // Don't crash the bot for playlist parsing errors
  if (err.message && (err.message.includes('ytpl') || err.message.includes('Cannot read properties of undefined'))) {
    console.log('🔧 Playlist parsing error caught - bot continuing to run');
    return;
  }
  
  // Handle other DisTube errors gracefully
  if (err.name === 'DisTubeError' || (err.errorCode && err.errorCode.startsWith('DISTUBE'))) {
    console.log('🔧 DisTube error caught - bot continuing to run');
    return;
  }
  
  // Handle rate limiting errors
  if (err.message && (err.message.includes('429') || err.message.includes('Too Many Requests'))) {
    console.log('🔧 Rate limit error caught - bot continuing to run');
    return;
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  
  // Handle YouTube bot detection
  if (err.message && err.message.includes('Sign in to confirm')) {
    console.log('🔧 YouTube bot detection exception caught - bot continuing to run');
    return;
  }
  
  // Handle DisTube exceptions
  if (err.name === 'DisTubeError' || err.errorCode) {
    console.log('🔧 DisTube exception caught - bot continuing to run');
    return;
  }
  
  // Log the error but don't exit for known issues
  if (err.message && err.message.includes('ytpl')) {
    console.log('🔧 YTPL error caught - bot continuing to run');
    return;
  }
  
  process.exit(1);
});

client.login(process.env.DISCORD_TOKEN);
