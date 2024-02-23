import fs from 'fs';
import { triviaGuildIds } from '../configs/config.js';

export async function handleTriviaCommand(interaction) {
    if (!triviaGuildIds.includes(interaction.guildId)) {
        await interaction.reply('Trivia is not available in this server.');
        return;
    }

    const questionsData = fs.readFileSync('./configs/trivia.json', 'utf8');
    const questions = JSON.parse(questionsData);
    const question = questions[Math.floor(Math.random() * questions.length)];

    await interaction.reply(question.question);

    const filter = response => {
        return response.content.trim().toLowerCase() === question.answer.trim().toLowerCase() && response.author.id !== interaction.client.user.id;
    };

    const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

    collector.on('collect', m => {
        interaction.followUp(`${m.author} got the answer correct: ${question.answer}!`);
        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.followUp("Time's up! No one got the answer.");
        }
    });
}
