import { Client, GatewayIntentBits, Collection } from "discord.js";
import { DisTube } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { premiumUsers } from "./config.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const commandsPath = path.join("./commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.default.name, command.default);
}

const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin()],
  emitNewSongOnly: true,
  leaveOnFinish: true,
});

client.distube = distube;
client.premiumUsers = premiumUsers;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (!message.content.startsWith("!") || message.author.bot) return;
  const args = message.content.slice(1).split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (!client.commands.has(cmd)) return;
  try {
    await client.commands.get(cmd).execute(message, args, client);
  } catch (err) {
    console.error(err);
    message.channel.send("There was an error!");
  }
});

client.login(process.env.DISCORD_TOKEN);
