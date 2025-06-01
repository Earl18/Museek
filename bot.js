require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');
const fs = require('fs-extra');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

// Load commands dynamically
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// Setup DisTube
client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    nsfw: true,
    savePreviousSongs: true,
    plugins: [
        new YouTubePlugin(),
        new SpotifyPlugin(),
        new YtDlpPlugin({
            update: true,
            quality: 'highestaudio',
            highWaterMark: 1 << 25 // Higher buffer to reduce lag
        })
    ],
});

client.distube.on('playSong', (queue, song) => {
    queue.setVolume(70); // keep volume at 100 (normal)
});

// Handle Distube errors and search no results
client.distube.on("error", (channel, error) => {
  console.error("Distube error:", error);
  if (channel) channel.send("❌ An error occurred while processing your request.");
});

client.distube.on("searchNoResult", (message, query) => {
  message.channel.send(`No results found for \`${query}\`.`);
});

// Optional: Listen to rate limits if your distube version supports it
client.distube.on("rateLimit", (info) => {
  console.warn("Distube rate limit:", info);
  // You can notify your bot channel or add delay logic here if needed
});


const prefix = '!'

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('❌ There was an error executing that command.');
    }
});

client.login(process.env.TOKEN);