const responses = [
    "It is certain.",
    "Without a doubt.",
    "Reply hazy, try again.",
    "Cannot predict now.",
    "Don't count on it.",
    "My sources say no.",
];

export async function handleChooseCommand(interaction) {
    const optionsString = interaction.options.getString('options');
        const options = optionsString.split(',').map(option => option.trim()); // Split by commas and trim whitespace

        if (options.length < 2) {
            await interaction.reply('Please provide at least two options separated by commas.');
            return;
        }

        const chosenOption = options[Math.floor(Math.random() * options.length)]; // Randomly select an option
        await interaction.reply(`I choose: **${chosenOption}**`);
}

export async function handleEightBallCommand(interaction) {
    const question = interaction.options.getString('question');
    const answer = responses[Math.floor(Math.random() * responses.length)];
    await interaction.reply(`🎱 ${question}\n${answer}`);
}

export async function handleRollCommand(interaction) {
    const sides = interaction.options.getInteger('sides');
    const roll = Math.floor(Math.random() * sides) + 1;
    await interaction.reply(`🎲 Rolled a ${sides}-sided dice and got: ${roll}`);
}
