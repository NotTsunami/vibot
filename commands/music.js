import { joinVoiceChannel, createAudioResource, createAudioPlayer, getVoiceConnection, AudioPlayerStatus } from '@discordjs/voice';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import ytdl from 'ytdl-core';

// Initialize music queue and leave timeouts maps
export const musicQueues = new Map();
const leaveTimeouts = new Map();
const appendFileAsync = promisify(fs.appendFile);

async function logErrorToFile(message) {
    const logFilePath = path.join(__dirname, '../errors.log');
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    try {
        await appendFileAsync(logFilePath, logMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

function setupAudioPlayer(guildId) {
    const player = createAudioPlayer({ maxMissedFrames: 999999999 });
    player.on('error', async error => {
        await logErrorToFile(`Stream error in guild ${guildId}: ${error.message}`);
        processQueue(guildId);
    });
    return player;
}

function processQueue(guildId) {
    const queue = musicQueues.get(guildId);
    if (queue && queue.songs.length > 0) {
        playSong(guildId); // Immediately attempt to play the next song
    } else {
        handleNoSongsLeft(guildId);
    }
}

function handleNoSongsLeft(guildId) {
    if (leaveTimeouts.has(guildId)) {
        clearTimeout(leaveTimeouts.get(guildId));
    }
    const timeout = setTimeout(() => {
        const connection = getVoiceConnection(guildId);
        if (connection) {
            connection.destroy();
            musicQueues.delete(guildId);
            leaveTimeouts.delete(guildId);
        }
    }, 120000);
    leaveTimeouts.set(guildId, timeout);
}

function playSong(guildId) {
    const queue = musicQueues.get(guildId);
    if (!queue || queue.songs.length === 0) {
        handleNoSongsLeft(guildId);
        return;
    }

    // Clear leave timeout when a new song starts playing
    if (leaveTimeouts.has(guildId)) {
        clearTimeout(leaveTimeouts.get(guildId));
        leaveTimeouts.delete(guildId);
    }

    const songUrl = queue.songs.shift();
    const stream = ytdl(songUrl, { filter: 'audioonly', highWaterMark: 1 << 25, dlChunkSize: 0 })
        .on('error', async error => {
            await logErrorToFile(`Stream error in guild ${guildId}: ${error.message}`);
            queue.textChannel.send('An error occurred while trying to play the song. Skipping...').catch(console.error);
            processQueue(guildId); // Attempt to play the next song or end playback
        });

    const resource = createAudioResource(stream);
    queue.player.play(resource);
    queue.player.once(AudioPlayerStatus.Idle, () => processQueue(guildId));
    queue.textChannel.send(`🎶 Now playing: ${songUrl}`).catch(console.error);
}

export async function handlePlayCommand(interaction) {
    const url = interaction.options.getString('url');
    const guildId = interaction.guildId;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        await interaction.reply("You're not in a voice channel.");
        return;
    }
    if (!ytdl.validateURL(url)) {
        await interaction.reply('Please provide a valid YouTube URL.');
        return;
    }

    if (!musicQueues.has(guildId)) {
        const player = setupAudioPlayer(guildId);
        const queue = {
            voiceChannel,
            textChannel: interaction.channel,
            connection: null,
            player,
            songs: [url],
        };

        musicQueues.set(guildId, queue);

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
            connection.subscribe(player);
            queue.connection = connection;
            playSong(guildId);
            await interaction.reply(`🎶 Added to queue: ${url}`);
        } catch (err) {
            console.error(err);
            musicQueues.delete(guildId);
            await interaction.reply('Failed to queue the song.');
        }
    } else {
        const queue = musicQueues.get(guildId);
        queue.songs.push(url);
        await interaction.reply(`🎶 Added to queue: ${url}`);
    }
}

export async function handleStopCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    if (queue) {
        queue.songs = [];
        queue.player.stop();
        await interaction.reply('Stopped the music and cleared the queue.');
    }
}

export async function handleSkipCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    if (queue && queue.player) {
        queue.player.stop(); // This ensures the current song is stopped and the next song starts
        await interaction.reply('Skipped the current song.');
    } else {
        await interaction.reply('There is no song currently playing.');
    }
}

export async function handleQueueCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        await interaction.reply('The music queue is currently empty.');
        return;
    }

    let message = '**Current Queue:**\n';
    queue.songs.forEach((song, index) => {
        if (index === 0) {
            message += `🎶 **Now Playing:** ${song}\n\n**Up Next:**\n`;
        } else {
            message += `${index}. ${song}\n`;
        }
    });

    if (message.length >= 2000) {
        message = message.substring(0, 1997) + '...';
    }

    await interaction.reply(message);
}

export async function handleLeaveCommand(interaction) {
    const guildId = interaction.guildId;
    const voiceConnection = getVoiceConnection(guildId);
    if (voiceConnection) {
        voiceConnection.destroy();
        musicQueues.delete(guildId);
        leaveTimeouts.delete(guildId);
        await interaction.reply('Left the voice channel and cleared the queue.');
    } else {
        await interaction.reply('I am not in a voice channel.');
    }
}
