export default {
  name: "play",
  async execute(message, args, client) {
    if (!args.length) return message.reply("Provide a song or playlist URL.");
    client.distube.play(message.member.voice.channel, args.join(" "), {
      member: message.member,
      textChannel: message.channel,
      message,
    });
  }
}
