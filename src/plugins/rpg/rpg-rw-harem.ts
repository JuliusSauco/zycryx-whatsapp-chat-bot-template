import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21

import {listCharactersByOwner} from '../../services/character.service.js'

export default defineSdkPlugin({
    help: ['harem @tag'],
    tags: ['gacha'],
    command: ['harem'],
    register: true,
    async execute(m, {conn, args, sdk}) {

    try {
        let targetUser = m.sender;
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetUser = m.mentionedJid[0];
        }

        const userCharacters = await listCharactersByOwner(targetUser);

        if (userCharacters.length === 0) {
            const targetUsername = targetUser === m.sender ? sdk.content.message('rpg.rw.haremSelf') : `@${targetUser.split('@')[0]}`;
            return conn.reply(m.chat, sdk.content.renderMessage('rpg.rw.haremEmpty', {target: targetUsername}), m, {mentions: [targetUser]});
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

        let message = sdk.content.renderMessage('rpg.rw.haremHeader', {
            user: targetUser.split('@')[0],
            count: userCharacters.length
        });
        currentPageCharacters.forEach((character, index) => {
            message += sdk.content.renderMessage('rpg.rw.haremLine', {
                position: index + 1,
                name: character.name,
                price: character.price.toLocaleString()
            });
        });
        message += sdk.content.renderMessage('rpg.rw.haremFooter', {page, totalPages});
        return conn.reply(m.chat, message, m, {mentions: [targetUser]});
    } catch (e: unknown) {
        return sdk.reply.message('rpg.rw.haremError');
    }
    }
})


;
