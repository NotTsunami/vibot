const responses = [
    "It is certain.",
    "Without a doubt.",
    "Reply hazy, try again.",
    "Cannot predict now.",
    "Don't count on it.",
    "My sources say no.",
];

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
  