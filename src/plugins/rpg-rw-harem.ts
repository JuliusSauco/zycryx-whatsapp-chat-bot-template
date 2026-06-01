import {definePlugin} from '../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {listCharactersByOwner} from '../services/character.service.js'

export default definePlugin({
    help: ['harem @tag'],
    tags: ['gacha'],
    command: ['harem'],
    register: true,
    async execute(m, {conn, args}) {

    try {
        let targetUser = m.sender;
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetUser = m.mentionedJid[0];
        }

        const userCharacters = await listCharactersByOwner(targetUser);

        if (userCharacters.length === 0) {
            const targetUsername = targetUser === m.sender ? 'tú' : `@${targetUser.split('@')[0]}`;
            return conn.reply(m.chat, `*${targetUsername}* no tienes ningún personaje en tu harem.`, m, {mentions: [targetUser]});
        }

        const itemsPerPage = 6;
        const totalPages = Math.ceil(userCharacters.length / itemsPerPage);
        let page = parseInt(args[0]) || 1;
        if (page < 1 || page > totalPages) {
            page = 1;
        }

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentPageCharacters = userCharacters.slice(startIndex, endIndex);

        let message = `*\`🛍 Inventario de Compras\`*\n\n`;
        message += `*• Usuario:* @${targetUser.split('@')[0]}\n`;
        message += `*• Personajes comprados:* ${userCharacters.length}\n\n`;
        message += `*\`○ Lista de Personajes:\`*\n`;
        currentPageCharacters.forEach((character, index) => {
            message += `${index + 1}. *${character.name}* (${character.price.toLocaleString()})\n`;
        });
        message += `\n> *• Página:* ${page} de ${totalPages}`;
        return conn.reply(m.chat, message, m, {mentions: [targetUser]});
    } catch (e: unknown) {
        return conn.reply(m.chat, '⚠️ Error al mostrar el inventario. Intenta de nuevo.', m);
    }
    }
})


;
