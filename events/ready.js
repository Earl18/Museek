module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`🎵 Logged in as ${client.user.tag} and ready to rock!`);
    },
};
