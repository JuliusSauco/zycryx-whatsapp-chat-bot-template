import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {findCharacterByName, voteCharacter} from '../../services/character.service.js'
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js'
import {randomInt} from '../../utils/random.js'
import {formatDurationPaddedMinutesSeconds} from '../../utils/time.js'

export default definePlugin({
    help: ['vote <nombre del personaje>'],
    tags: ['gacha'],
    command: ['vote'],
    register: true,
    async execute(m, {conn, args}) {
    try {
        const characterName = args.join(' ').trim();
        if (!characterName) return conn.reply(m.chat, '⚠️ Por favor, especifica el nombre del personaje.', m);

        const user = await getWallet(m.sender);
        const lastVoteTime = user?.timevot || 0;
        const cooldown = 1800000; // 30 minutos
        const now = Date.now();

        if (now - lastVoteTime < cooldown) return m.reply(`Bueno pa 🤚 para con emoción esperar ${formatDurationPaddedMinutesSeconds(cooldown - (now - lastVoteTime))} para volver usar este comando`)
        const character = await findCharacterByName(characterName);
        if (!character) return conn.reply(m.chat, `⚠️ No se encontró el personaje "${characterName}".`, m);

        const currentPrice = character.price ?? 0;
        const newVotes = (character.votes || 0) + 1;
        const increment = randomInt(1, 50);
        const newPrice = currentPrice + increment;

        await voteCharacter(character.id, newVotes, newPrice);
        await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {timevot: now}});

        const formattedPrice = newPrice.toLocaleString();
        return conn.reply(m.chat, `✨️ Votaste por el personaje *${character.name}*, su nuevo precio es *${formattedPrice}* (+${increment})`, m);
    } catch (e: unknown) {
    }
    }
})


;

