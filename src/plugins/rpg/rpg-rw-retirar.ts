import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {findCharacterByName, withdrawCharacterFromSale} from '../../services/character.service.js'

export default defineSdkPlugin({
    help: ['rw-retirar'],
    tags: ['gacha'],
    command: ['rw-retirar'],
    register: true,
    async execute(m, {text, sdk}) {
    const characterName = text.trim().toLowerCase();
    if (!characterName) return sdk.reply.message('rpg.rw.withdrawMissingName');
    try {
        const characterToRemove = await findCharacterByName(characterName);

        if (!characterToRemove) return sdk.reply.message('rpg.rw.withdrawNotFound', {name: characterName});
        if (characterToRemove.seller !== m.sender) return sdk.reply.message('rpg.rw.withdrawNotSeller');
        if (!characterToRemove.for_sale) {
            return sdk.reply.message('rpg.rw.withdrawNotForSale', {name: characterName});
        }

        await withdrawCharacterFromSale(characterToRemove.id);
        return sdk.reply.message('rpg.rw.withdrawSuccess', {name: characterToRemove.name});
    } catch (e: unknown) {
        logError(e);
        return sdk.reply.message('rpg.rw.withdrawError');
    }
    }
});

;
