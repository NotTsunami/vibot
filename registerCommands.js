import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { SlashCommandBuilder } from '@discordjs/builders';
import { token, clientId } from './configs/config.js';

// Define the slash commands using the builder pattern
const commands = [
    // General commands
    new SlashCommandBuilder()
        .setName('art')
        .setDescription('Returns random MapleStory art.'),
    new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Starts a trivia question. Only available for Poggers server.'),
    new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Rolls a dice with a specified number of sides.')
        .addIntegerOption(option =>
            option.setName('sides')
                .setDescription('Number of sides on the dice')
                .setRequired(true)),
    // Chat trigger commands
    new SlashCommandBuilder()
        .setName('addtrigger')
        .setDescription('Adds a new chat trigger.')
        .addStringOption(option =>
            option.setName('trigger')
                .setDescription('The trigger phrase')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('response')
                .setDescription('The bot response for the trigger')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('removetrigger')
        .setDescription('Removes an existing chat trigger.')
        .addStringOption(option =>
            option.setName('trigger')
                .setDescription('The trigger phrase to remove')
                .setRequired(true)),
    // Music commands
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube.')
        .addStringOption(option => option.setName('url').setDescription('The URL of the song to play').setRequired(true)),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music and clears the queue.'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song.'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Returns the current queue.'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leaves the voice channel.')
].map(command => command.toJSON());

// Create a new REST instance and set the bot token
const rest = new REST({ version: '9' }).setToken(token);

// Function to register the commands with the Discord API
 (async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
})();
