import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21

import {listCharacterClaimOwners} from '../../services/character.service.js'

export default defineSdkPlugin({
    help: ['rw-personajes'],
    tags: ['gacha'],
    command: ['rw-personajes', 'ranking'],
    register: true,
    async execute(m, {sdk}) {

    try {
        const characters = await listCharacterClaimOwners();
        const claimedCharacters = characters.filter(c => c.claimed_by);

        const userClaims = claimedCharacters.reduce<Record<string, number>>((acc, character) => {
            if (!character.claimed_by) return acc;
            acc[character.claimed_by] = (acc[character.claimed_by] || 0) + 1;
            return acc;
        }, {});

        const topUsers = Object.entries(userClaims)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 10);

        let textt = sdk.content.renderMessage('rpg.rw.rankingHeader', {
            claimedCount: claimedCharacters.length
        });
        textt += sdk.content.message('rpg.rw.rankingTopHeader');
        topUsers.forEach(([user, count], index) => {
            textt += sdk.content.renderMessage('rpg.rw.rankingLine', {
                position: index + 1,
                user: user.split('@')[0],
                count
            });
        });

        await sdk.sendMessage({
            text: textt + sdk.content.message('rpg.rw.rankingFooter'),
            contextInfo: {mentionedJid: topUsers.map(([user]) => user)}
        });
    } catch (e: unknown) {
    }
    }
})


;
