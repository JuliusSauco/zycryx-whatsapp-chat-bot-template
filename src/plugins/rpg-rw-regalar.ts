import {definePlugin} from '../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {claimCharacter, findCharacterByName, findOwnedCharacterByName} from '../services/character.service.js'

export default definePlugin({
    help: ['give @tag nombre_del_personaje'],
    tags: ['gacha'],
    command: ['give', 'regalar-personajes'],
    register: true,
    async execute(m, {conn, args}) {
    if (!m.mentionedJid || m.mentionedJid.length === 0 || args.length < 1) return conn.reply(m.chat, '⚠️ Formato incorrecto. Usa: /give @tag nombre_del_personaje', m);

    const recipient = m.mentionedJid[0];
    const characterName = args.slice(1).join(' ').trim();
    if (!characterName) return conn.reply(m.chat, '⚠️ Por favor, especifica el nombre del personaje.', m);
    if (recipient === m.sender) return conn.reply(m.chat, 'No puedes regalarte un personaje a ti mismo 😆.', m);
    try {
        const character = await findOwnedCharacterByName(characterName, m.sender);

        if (!character) {
            const exists = await findCharacterByName(characterName);
            if (!exists) return conn.reply(m.chat, `No se encontró el personaje "${characterName}".`, m);
            return conn.reply(m.chat, `No eres el propietario de *${characterName}*. Solo el propietario puede regalarlo.`, m);
        }

        await claimCharacter(character.id, recipient);
        return conn.reply(m.chat, `🎉 ¡Has regalado a *${character.name}* a @${recipient.split('@')[0]}!`, m, {mentions: [recipient]});
    } catch (e: any) {
    }
    }
})


;
