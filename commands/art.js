import fetch from 'node-fetch';
import { EmbedBuilder } from 'discord.js';

export async function handleMapleStoryArtCommand(interaction) {
    const url = 'https://danbooru.donmai.us/posts.json?tags=maplestory+rating:general&limit=250';
    
    try {
        const response = await fetch(url);
        const posts = await response.json();

        if (!posts.length) {
            await interaction.reply('No images found.');
            return;
        }

        // Select a random post
        const post = posts[Math.floor(Math.random() * posts.length)];
        const imageUrl = post.file_url;

        // Create and send the embed
        const embed = new EmbedBuilder()
            .setTitle('Random MapleStory Art')
            .setImage(imageUrl)
            .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
            .setColor('#FFFFFF');

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to fetch MapleStory art:', error);
        await interaction.reply('Failed to fetch image.');
    }
}
