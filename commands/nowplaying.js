import { EmbedBuilder } from "discord.js";

function createProgressBar(currentTime, duration, barLength = 25) {
  const current = Math.floor((currentTime / duration) * barLength);
  const bar = "▬".repeat(current) + "🔘" + "▬".repeat(barLength - current);
  return bar;
}

export default {
  name: "nowplaying",
  aliases: ["np"],
  async execute(message, args, client) {
    const queue = client.distube.getQueue(message);
    if (!queue || !queue.songs.length) {
      return message.channel.send("❌ Nothing is currently playing.");
    }

    const song = queue.songs[0];
    const currentTime = queue.currentTime; // in seconds
    const duration = song.duration || 1;

    const status = queue.paused ? "⏸️ Paused" : "▶️ Playing";

    const embed = new EmbedBuilder()
      .setTitle("🎶 Now Playing")
      .setColor(0x1db954)
      .setThumbnail(song.thumbnail)
      .setDescription(`[${song.name}](${song.url})\n\n${createProgressBar(currentTime, duration)}\n\`${formatTime(currentTime)} / ${song.formattedDuration}\``)
      .addFields(
        { name: "Status", value: status, inline: true },
        { name: "Requested by", value: `<@${song.user.id}>`, inline: true }
      )
      .setFooter({ text: "Enjoy the music!" });

    await message.channel.send({ embeds: [embed] });
  }
};

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}