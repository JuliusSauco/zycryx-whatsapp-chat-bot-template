import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {listCharacterClaimOwners} from '../../services/character.service.js'

export default definePlugin({
    help: ['rw-personajes'],
    tags: ['gacha'],
    command: ['rw-personajes', 'ranking'],
    register: true,
    async execute(m, {conn}) {

    try {
        const characters = await listCharacterClaimOwners();
        const totalCharacters = characters.length;
        const claimedCharacters = characters.filter(c => c.claimed_by);
        const freeCharacters = characters.filter(c => !c.claimed_by);

        const userClaims = claimedCharacters.reduce<Record<string, number>>((acc, character) => {
            if (!character.claimed_by) return acc;
            acc[character.claimed_by] = (acc[character.claimed_by] || 0) + 1;
            return acc;
        }, {});

        const topUsers = Object.entries(userClaims)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 10);

        let textt = `📊 *\`Ranking de Personajes\`* 📊\n- Personajes reclamados: ${claimedCharacters.length}\n\n`;
        textt += '*🏆 Top de usuarios con más personajes reclamados:*\n';
        topUsers.forEach(([user, count], index) => {
            textt += `\n${index + 1}- @${user.split('@')[0]} ${count} personajes`;
        });

        await conn.sendMessage(m.chat, {
            text: textt + `\n\n> _*¡Sigue usando el bot para reclamar más personajes!*_`,
            contextInfo: {mentionedJid: topUsers.map(([user]) => user)}
        }, {quoted: m});
    } catch (e: unknown) {
    }
    }
})


;
