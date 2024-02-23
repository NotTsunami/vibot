export async function handleRollCommand(interaction) {
    const sides = interaction.options.getInteger('sides');
    const roll = Math.floor(Math.random() * sides) + 1;
    await interaction.reply(`🎲 Rolled a ${sides}-sided dice and got: ${roll}`);
}
