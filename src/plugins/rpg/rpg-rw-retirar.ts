import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {findCharacterByName, withdrawCharacterFromSale} from '../../services/character.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
    help: ['rw-retirar'],
    tags: ['gacha'],
    command: ['rw-retirar'],
    register: true,
    async execute(m, {conn, text}) {
    const characterName = text.trim().toLowerCase();
    if (!characterName) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.withdrawMissingName'), m);
    try {
        const characterToRemove = await findCharacterByName(characterName);

        if (!characterToRemove) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.withdrawNotFound'), {name: characterName}), m);
        if (characterToRemove.seller !== m.sender) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.withdrawNotSeller'), m);
        if (!characterToRemove.for_sale) {
            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.withdrawNotForSale'), {name: characterName}), m);
        }

        await withdrawCharacterFromSale(characterToRemove.id);
        return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.withdrawSuccess'), {name: characterToRemove.name}), m);
    } catch (e: unknown) {
        logError(e);
        return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.withdrawError'), m);
    }
    }
});

;
