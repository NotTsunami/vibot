import { Client, GatewayIntentBits } from 'discord.js';
import { handleMapleStoryArtCommand } from './commands/art.js';
import { handleChooseCommand, handleEightBallCommand, handleRollCommand } from './commands/misc.js';
import { handleTriviaCommand } from './commands/trivia.js';
import { handleAddTriggerCommand, handleRemoveTriggerCommand, checkForTriggers } from './commands/chatTriggers.js';
import { handleLeaveCommand, handlePlayCommand, handleQueueCommand, handleSkipCommand, handleStopCommand, musicQueues } from './commands/music.js';
import { token } from './configs/config.js';

const statusMessages = [
    "VIII HIIII",
    "It's wap o' clock!",
    "bearbear check",
];

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

client.on('ready', () => {
    let statusIndex = 0;

    setInterval(() => {
        const status = statusMessages[statusIndex];
        client.user.setActivity(status, { type: "PLAYING" }); // You can change the type: PLAYING, STREAMING, LISTENING, WATCHING

        // Update the index to point to the next status message,
        // looping back to the first message when reaching the end of the array
        statusIndex = (statusIndex + 1) % statusMessages.length;
    }, 60000); // 60000 milliseconds = 1 minute
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // NOTE: Any changes to commands needs to updated via `npm run register`
    switch (interaction.commandName) {
        // General commands
        case 'vi8ball':
            await handleEightBallCommand(interaction);
            break;
        case 'viart':
            await handleMapleStoryArtCommand(interaction);
            break;
        case 'vichoose':
            await handleChooseCommand(interaction);
            break;
        case 'vitrivia':
            await handleTriviaCommand(interaction);
            break;
        case 'viroll':
            await handleRollCommand(interaction);
            break;
        // Chat trigger commands
        case 'viaddtrigger':
            await handleAddTriggerCommand(interaction);
            break;
        case 'viremovetrigger':
            await handleRemoveTriggerCommand(interaction);
            break;
        // Music commands
        case 'viplay':
            await handlePlayCommand(interaction);
            break;
        case 'viskip':
            await handleSkipCommand(interaction);
            break;
        case 'vistop':
            await handleStopCommand(interaction);
            break;
        case 'viqueue':
            await handleQueueCommand(interaction);
            break;
        case 'vileave':
            await handleLeaveCommand(interaction);
            break;
    }
});

client.on('messageCreate', checkForTriggers);

client.on('voiceStateUpdate', (oldState, newState) => {
    // Check if the bot was disconnected from a voice channel
    if (oldState.channelId && !newState.channelId && oldState.member.id === client.user.id) {
        // The bot was disconnected from a voice channel
        const guildId = oldState.guild.id;
        const queue = musicQueues.get(guildId);

        if (queue) {
            const textChannel = queue.textChannel;
            textChannel.send('I was disconnected from the voice channel, so I cleared the queue.');

            // Clear the queue
            queue.songs = [];
            musicQueues.delete(guildId);
        }
    }
});

client.login(token);
