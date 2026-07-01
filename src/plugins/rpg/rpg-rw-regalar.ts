import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21

import {claimCharacter, findCharacterByName, findOwnedCharacterByName} from '../../services/character.service.js'

export default defineSdkPlugin({
    help: ['give @tag nombre_del_personaje'],
    tags: ['gacha'],
    command: ['give', 'regalar-personajes'],
    register: true,
    async execute(m, {conn, args, sdk}) {
    if (!m.mentionedJid || m.mentionedJid.length === 0 || args.length < 1) return sdk.reply.message('rpg.rw.giftUsage');

    const recipient = m.mentionedJid[0];
    const characterName = args.slice(1).join(' ').trim();
    if (!characterName) return sdk.reply.message('rpg.rw.giftMissingName');
    if (recipient === m.sender) return sdk.reply.message('rpg.rw.giftSelf');
    try {
        const character = await findOwnedCharacterByName(characterName, m.sender);

        if (!character) {
            const exists = await findCharacterByName(characterName);
            if (!exists) return sdk.reply.message('rpg.rw.giftNotFound', {name: characterName});
            return sdk.reply.message('rpg.rw.giftNotOwner', {name: characterName});
        }

        await claimCharacter(character.id, recipient);
        return conn.reply(m.chat, sdk.content.renderMessage('rpg.rw.giftSuccess', {
            name: character.name,
            recipient: recipient.split('@')[0]
        }), m, {mentions: [recipient]});
    } catch (e: unknown) {
    }
    }
})


;
