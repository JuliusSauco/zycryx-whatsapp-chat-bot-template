import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {claimCharacter, findCharacterByName, findOwnedCharacterByName} from '../../services/character.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
    help: ['give @tag nombre_del_personaje'],
    tags: ['gacha'],
    command: ['give', 'regalar-personajes'],
    register: true,
    async execute(m, {conn, args}) {
    if (!m.mentionedJid || m.mentionedJid.length === 0 || args.length < 1) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.giftUsage'), m);

    const recipient = m.mentionedJid[0];
    const characterName = args.slice(1).join(' ').trim();
    if (!characterName) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.giftMissingName'), m);
    if (recipient === m.sender) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.giftSelf'), m);
    try {
        const character = await findOwnedCharacterByName(characterName, m.sender);

        if (!character) {
            const exists = await findCharacterByName(characterName);
            if (!exists) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.giftNotFound'), {name: characterName}), m);
            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.giftNotOwner'), {name: characterName}), m);
        }

        await claimCharacter(character.id, recipient);
        return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.giftSuccess'), {
            name: character.name,
            recipient: recipient.split('@')[0]
        }), m, {mentions: [recipient]});
    } catch (e: unknown) {
    }
    }
})


;
