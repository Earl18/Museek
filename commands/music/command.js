const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'commands',
  aliases: ['help'],
  description: 'List all available commands',
  async execute(message, args, client) {
    const commandList = client.commands.map(cmd => {
      const aliasList = cmd.aliases?.length ? ` *(aliases: ${cmd.aliases.join(', ')})*` : '';
      return `• **!${cmd.name}** – ${cmd.description || 'No description'}${aliasList}`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🛠️ Available Commands')
      .setDescription(commandList.join('\n'))
      .setColor('Green')
      .setFooter({ text: `Use !<command> to interact with the bot.` });

    message.channel.send({ embeds: [embed] });
  }
};
