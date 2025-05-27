require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');
const fs = require('fs');
const config = require('./utils/config'); // Assuming you use this somewhere
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

// DisTube v5 configuration with corrected options
client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: true,
  savePreviousSongs: true,
  emitAddListWhenCreatingQueue: true,
  nsfw: false,
  plugins: [
    new SpotifyPlugin({
      api: {
        clientId: process.env.SPOTIFY_ID,
        clientSecret: process.env.SPOTIFY_SECRET,
      },
    }),
    // Prioritize YT-DLP over YouTube plugin for better reliability
    new YtDlpPlugin({
      // Enhanced YT-DLP configuration for bypassing YouTube parsing issues
      ytdlOptions: {
        format: 'bestaudio[ext=webm+acodec=opus]/bestaudio[ext=m4a]/bestaudio/best',
        'extract-flat': false,
        'no-warnings': true,
        'no-check-certificate': true,
        'prefer-free-formats': true,
        'ignore-errors': true,
        'no-abort-on-error': true,
        // Enhanced headers to bypass bot detection
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'referer': 'https://www.youtube.com/',
        'add-header': [
          'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language:en-US,en;q=0.9',
          'Accept-Encoding:gzip, deflate, br',
          'DNT:1',
          'Connection:keep-alive',
          'Upgrade-Insecure-Requests:1',
          'Sec-Fetch-Dest:document',
          'Sec-Fetch-Mode:navigate',
          'Sec-Fetch-Site:none',
          'Sec-Fetch-User:?1',
          'sec-ch-ua:"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile:?0',
          'sec-ch-ua-platform:"Windows"'
        ],
        // Rate limiting to avoid detection
        'sleep-requests': 1,
        'max-sleep-interval': 3,
        'sleep-subtitles': 1,
        // Alternative extraction methods
        'extractor-retries': 3,
        'fragment-retries': 3,
        'retry-sleep-functions': 'exp',
        'retry-sleep': 'linear:1::5',
        // Force IPv4 to avoid some regional blocks
        'force-ipv4': true,
        // Use alternative extraction methods
        'youtube-skip-dash-manifest': true,
        'youtube-skip-hls-manifest': false,
        // Geo-bypass options
        'geo-bypass': true,
        'geo-bypass-country': 'US'
      }
    }),
    new YouTubePlugin({
      // Enhanced configuration with fallback options
      ytdlOptions: {
        quality: 'highestaudio',
        filter: 'audioonly',
        format: 'mp4',
        highWaterMark: 1024 * 1024 * 64, // Increased buffer to 64MB
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 30000,
          maxRedirects: 5
        },
        // Additional bypass options
        begin: undefined,
        liveBuffer: 20000
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

    // Set volume to 100%
    queue.setVolume(100);
    
    // Always send playing message
    queue.textChannel.send(`🎶 **Now Playing:** ${song.name}\n⏱️ Duration: \`${song.formattedDuration}\`\n👤 Requested by: ${song.user}`);
  })
  .on('addSong', (queue, song) => {
    console.log(`➕ Added: ${song.name} - ${song.formattedDuration}`);
  
    // Check if this guild is in silent mode (playlist loading)
    const guildId = queue.id;
    const isSilent = client.playlistHandler.isSilentMode(guildId);

    console.log(`[AddSong] isSilent for ${guildId}:`, isSilent);
  
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
    
    // Enhanced error handling for YouTube parsing and other issues
    let errorMessage = '❌ An error occurred';
    
    if (error.message) {
      if (error.message.includes('Error when parsing watch.html') || error.message.includes('YouTube made a change')) {
        errorMessage = '❌ **YouTube Parsing Error**\n\n' +
                     '🔧 **This is usually temporary! Try:**\n' +
                     '• Waiting 5-10 minutes and trying again\n' +
                     '• Using a different search term\n' +
                     '• Trying a direct YouTube link\n' +
                     '• Using the song title + artist name\n\n' +
                     '💡 YouTube frequently updates their system, causing temporary issues.';
      } else if (error.message.includes('Sign in to confirm') || error.message.includes('bot')) {
        errorMessage = '❌ **YouTube Bot Detection**\n\n' +
                     '🔧 **Possible Solutions:**\n' +
                     '• Wait 10-15 minutes and try again\n' +
                     '• Use a more specific search term\n' +
                     '• Try a different song\n' +
                     '• Use a direct YouTube link\n\n' +
                     '💡 This is temporary and usually resolves itself.';
      } else if (error.message.includes('Cannot read properties of undefined')) {
        errorMessage = '❌ Failed to parse content. This format may not be supported.';
      } else if (error.message.includes('Unknown Playlist')) {
        errorMessage = '❌ This playlist type is not supported (possibly auto-generated or private).';
      } else if (error.message.includes('Private video')) {
        errorMessage = '❌ This video is private or unavailable.';
      } else if (error.message.includes('Age-restricted')) {
        errorMessage = '❌ This content is age-restricted.';
      } else if (error.message.includes('not available')) {
        errorMessage = '❌ This content is not available in your region.';
      } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        errorMessage = '❌ Rate limited. Please wait a moment before trying again.';
      } else if (error.message.includes('Video unavailable')) {
        errorMessage = '❌ This video is unavailable or has been removed.';
      } else if (error.message.includes('Premieres in')) {
        errorMessage = '❌ This video is a premiere that hasn\'t started yet.';
      } else if (error.message.includes('PlayingError')) {
        errorMessage = '❌ **Playback Error**\n\n' +
                     '🔧 **Try:**\n' +
                     '• A different search term\n' +
                     '• Waiting a few minutes\n' +
                     '• Using a direct link\n' +
                     '• Searching for the artist name only';
      } else {
        errorMessage = `❌ **Playback Error:** ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}`;
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
    if (msg.includes('error') || msg.includes('Error') || msg.includes('fail') || msg.includes('Sign in') || msg.includes('parsing')) {
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
        errorMsg = '❌ **YouTube Bot Detection Active**\n\n' +
                  '🔧 **Quick Fixes:**\n' +
                  '• Try a different search term\n' +
                  '• Use a direct YouTube link\n' +
                  '• Wait 10-15 minutes\n' +
                  '• Try searching for the artist name only';
      } else if (error.message.includes('No voice connection')) {
        errorMsg = '❌ I\'m not connected to a voice channel.';
      } else if (error.message.includes('Error when parsing watch.html')) {
        errorMsg = '❌ **YouTube Parsing Issue**\n\n' +
                  '🔧 **This is temporary! Try:**\n' +
                  '• Waiting a few minutes\n' +
                  '• Using a different search term\n' +
                  '• Trying again with the same query';
      }
    }
    
    message.channel.send(errorMsg);
  }
});

// Enhanced error handling for unhandled promises
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled promise rejection:', err);
  
  // Handle YouTube parsing errors
  if (err.message && (err.message.includes('Error when parsing watch.html') || err.message.includes('YouTube made a change'))) {
    console.log('🔧 YouTube parsing error caught - bot continuing to run');
    return;
  }
  
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
  
  // Handle PlayingError specifically
  if (err.name === 'PlayingError' || err.message.includes('PlayingError')) {
    console.log('🔧 PlayingError caught - bot continuing to run');
    return;
  }
  
  // Handle rate limiting errors
  if (err.message && (err.message.includes('429') || err.message.includes('Too Many Requests'))) {
    console.log('🔧 Rate limit error caught - bot continuing to run');
    return;
  }
  
  // Handle video unavailable errors
  if (err.message && err.message.includes('Video unavailable')) {
    console.log('🔧 Video unavailable error caught - bot continuing to run');
    return;
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  
  // Handle YouTube parsing errors
  if (err.message && (err.message.includes('Error when parsing watch.html') || err.message.includes('YouTube made a change'))) {
    console.log('🔧 YouTube parsing exception caught - bot continuing to run');
    return;
  }
  
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
  
  // Handle PlayingError exceptions
  if (err.name === 'PlayingError') {
    console.log('🔧 PlayingError exception caught - bot continuing to run');
    return;
  }
  
  // Log the error but don't exit for known issues
  if (err.message && (err.message.includes('ytpl') || err.message.includes('Video unavailable'))) {
    console.log('🔧 Known error caught - bot continuing to run');
    return;
  }
  
  process.exit(1);
});

client.login(process.env.DISCORD_TOKEN);
