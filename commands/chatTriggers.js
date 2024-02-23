import fs from 'fs';

export async function handleAddTriggerCommand(interaction) {
    const trigger = interaction.options.getString('trigger');
    const response = interaction.options.getString('response');
    const serverId = interaction.guildId;

    let triggers = {};
    try {
        triggers = JSON.parse(fs.readFileSync('./configs/triggers.json', 'utf8'));
    } catch (error) {
        console.error('Error reading triggers file:', error);
    }

    if (!triggers[serverId]) {
        triggers[serverId] = [];
    }
    triggers[serverId].push({ trigger, response });
    fs.writeFileSync('./configs/triggers.json', JSON.stringify(triggers, null, 2));

    await interaction.reply(`Added new trigger: ${trigger}`);
}

export async function handleRemoveTriggerCommand(interaction) {
    const triggerToRemove = interaction.options.getString('trigger');
    const serverId = interaction.guildId;

    const triggersData = fs.readFileSync('./configs/triggers.json', 'utf8');
    let triggers = JSON.parse(triggersData);

    if (triggers[serverId]) {
        const index = triggers[serverId].findIndex(({ trigger }) => trigger === triggerToRemove);
        if (index !== -1) {
            triggers[serverId].splice(index, 1);
            fs.writeFileSync('./configs/triggers.json', JSON.stringify(triggers, null, 2));
            await interaction.reply(`Removed trigger: ${triggerToRemove}`);
        } else {
            await interaction.reply(`Trigger not found: ${triggerToRemove}`);
        }
    } else {
        await interaction.reply('No triggers found for this server.');
    }
}

export function checkForTriggers(message) {
    if (!message.guild) return;

    const serverId = message.guild.id;
    const triggersData = fs.readFileSync('./configs/triggers.json', 'utf8');
    const triggers = JSON.parse(triggersData);

    const serverTriggers = triggers[serverId];
    if (!serverTriggers) return;

    serverTriggers.forEach(({ trigger, response }) => {
        if (message.content.trim() === trigger) {
            message.reply(response);
        }
    });
}
