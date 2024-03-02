import { joinVoiceChannel, createAudioResource, createAudioPlayer, getVoiceConnection, AudioPlayerStatus } from '@discordjs/voice';
import ytdl from 'ytdl-core';

export const musicQueues = new Map();
let leaveTimeouts = new Map(); // Track leave timeouts per guild

function setupAudioPlayer(guildId) {
    const player = createAudioPlayer({ maxMissedFrames: 9999 });
    player.on('error', error => {
        console.error(`Error occurred in audio player for guild ${guildId}:`, error.message);
        const queue = musicQueues.get(guildId);
        if (queue) {
            queue.textChannel.send('An error occurred during playback. Trying the next song...').catch(console.error);
            skipSong(guildId); // Skip to the next song in case of an error
        }
    });
    return player;
}

function skipSong(guildId) {
    const queue = musicQueues.get(guildId);
    if (queue && queue.songs.length > 0) {
        playSong(guildId); // Immediately attempt to play the next song
    } else {
        handleNoSongsLeft(guildId);
    }
}

function handleNoSongsLeft(guildId) {
    // Clear existing timeout to avoid multiple timeouts
    if (leaveTimeouts.has(guildId)) {
        clearTimeout(leaveTimeouts.get(guildId));
        leaveTimeouts.delete(guildId);
    }

    // Set a new timeout for leaving the voice channel
    const timeout = setTimeout(() => {
        const connection = getVoiceConnection(guildId);
        if (connection) {
            connection.destroy();
            musicQueues.delete(guildId);
            const queue = musicQueues.get(guildId);
            if (queue) {
                queue.textChannel.send('Leaving the voice channel due to inactivity.').catch(console.error);
            }
        }
        leaveTimeouts.delete(guildId);
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

    const song = queue.songs.shift();
    const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1 << 25 })
        .on('error', error => {
            console.error(`Stream error in guild ${guildId}:`, error.message);
            queue.textChannel.send('An error occurred while trying to play the song. Skipping...').catch(console.error);
            skipSong(guildId); // Attempt to play the next song or end playback
        });

    const resource = createAudioResource(stream);
    queue.player.play(resource);
    queue.player.once(AudioPlayerStatus.Idle, () => playSong(guildId));
}

export async function handlePlayCommand(interaction) {
    const url = interaction.options.getString('url');
    const guildId = interaction.guildId;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply("You're not in a voice channel.");
    }
    if (!ytdl.validateURL(url)) {
        return interaction.reply('Please provide a valid YouTube URL.');
    }

    const song = { url };

    if (!musicQueues.has(guildId)) {
        const player = setupAudioPlayer(guildId);
        const queue = {
            voiceChannel,
            textChannel: interaction.channel,
            connection: null,
            player,
            songs: [song],
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
            await interaction.reply(`🎶 Now playing: ${url}`);
        } catch (err) {
            console.error(err);
            musicQueues.delete(guildId);
            await interaction.reply('Failed to play the song.');
        }
    } else {
        const queue = musicQueues.get(guildId);
        queue.songs.push(song);
        await interaction.reply(`🎶 Added to queue: ${url}`);
    }
}

export async function handleStopCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    if (queue) {
        queue.songs = []; // Clear the queue
        queue.player.stop(); // Stop the player
        await interaction.reply('Stopped the music and cleared the queue.');
    }
}

export async function handleSkipCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        await interaction.reply('The music queue is currently empty.');
        return;
    }

    // Skip logic should ensure there's a next song
    if (queue.songs.length > 1) {
        queue.player.stop(); // Triggering the next song
        const nextSong = queue.songs[1]; // Access the next song after skipping
        await interaction.reply(`Skipped! Now playing: **${nextSong.title}**`);
    } else {
        await interaction.reply("There's no song to skip to.");
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
            message += `🎶 **Now Playing:** ${song.title}\n\n**Up Next:**\n`;
        } else {
            message += `${index}. ${song.title}\n`;
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
        // Clear the music queue for the guild
        const queue = musicQueues.get(guildId);
        if (queue) {
            queue.songs = []; // Clear the song array or reset the queue object
            musicQueues.delete(guildId);
        }

        voiceConnection.destroy(); // Disconnects from the voice channel
        await interaction.reply('Left the voice channel and cleared the queue.');
    } else {
        await interaction.reply('I am not in a voice channel.');
    }
}
