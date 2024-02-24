import { joinVoiceChannel, createAudioResource, createAudioPlayer, getVoiceConnection, AudioPlayerStatus } from '@discordjs/voice';
import ytdl from 'ytdl-core';

export const musicQueues = new Map();

function setupAudioPlayer(guildId) {
    const player = createAudioPlayer({ maxMissedFrames: 9999 });
    player.on('error', error => {
        console.error(`Error occurred in audio player for guild ${guildId}:`, error.message);
        const queue = musicQueues.get(guildId);
        if (queue) {
            queue.textChannel.send('An error occurred during playback. Trying the next song...').catch(console.error);
            playSong(guildId); // Attempt to play the next song
        }
    });
    return player;
}

function playSong(guildId) {
    const queue = musicQueues.get(guildId);
    if (!queue || queue.songs.length === 0) {
        setTimeout(() => {
            const connection = getVoiceConnection(guildId);
            if (connection && queue.songs.length === 0) {
                connection.destroy();
                musicQueues.delete(guildId);
                queue.textChannel.send('Leaving the voice channel due to inactivity.').catch(console.error);
            }
        }, 120000); // 2 minutes
        return;
    }

    const song = queue.songs.shift();
    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    queue.player.play(resource);

    queue.player.once(AudioPlayerStatus.Idle, () => {
        playSong(guildId);
    });
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
        const player = setupAudioPlayer(guildId); // Use the setup function to get a player with error handling
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
    if (queue) {
        queue.player.stop(); // This will trigger the next song to play
        await interaction.reply('Skipped the current song.');
    }
}

export async function handleQueueCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        return interaction.reply('The music queue is currently empty.');
    }

    let replyMessage = '**Current Music Queue:**\n';
    queue.songs.forEach((song, index) => {
        if (index === 0) {
            replyMessage += `**Now Playing:** ${song.title} (${song.url})\n\n**Up Next:**\n`;
        } else {
            replyMessage += `${index}. ${song.title} (${song.url})\n`;
        }
    });

    // Discord messages have a max length of 2000 characters. Consider splitting long messages.
    if (replyMessage.length >= 2000) {
        // Split the message or truncate with a note about the queue size
        return interaction.reply('The music queue is too long to display fully.');
    }

    await interaction.reply(replyMessage);
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
