import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21

import {findCharacterByName, voteCharacter} from '../../services/character.service.js'
import {addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js'
import {randomInt} from '../../utils/random.js'
import {formatDurationPaddedMinutesSeconds} from '../../utils/time.js'

export default defineSdkPlugin({
    help: ['vote <nombre del personaje>'],
    tags: ['gacha'],
    command: ['vote'],
    register: true,
    async execute(m, {args, sdk}) {
    try {
        const characterName = args.join(' ').trim();
        if (!characterName) return sdk.reply.message('rpg.rw.voteMissingName');

        const user = await getWallet(m.sender);
        const lastVoteTime = user?.timevot || 0;
        const cooldown = 1800000; // 30 minutos
        const now = Date.now();

        if (now - lastVoteTime < cooldown) return sdk.reply.message('rpg.rw.voteCooldown', {
            time: formatDurationPaddedMinutesSeconds(cooldown - (now - lastVoteTime))
        })
        const character = await findCharacterByName(characterName);
        if (!character) return sdk.reply.message('rpg.rw.voteNotFound', {name: characterName});

        const currentPrice = character.price ?? 0;
        const newVotes = (character.votes || 0) + 1;
        const increment = randomInt(1, 50);
        const newPrice = currentPrice + increment;

        await voteCharacter(character.id, newVotes, newPrice);
        await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {timevot: now}});

        const formattedPrice = newPrice.toLocaleString();
        return sdk.reply.message('rpg.rw.voteSuccess', {
            name: character.name,
            price: formattedPrice,
            increment
        });
    } catch (e: unknown) {
    }
    }
})


;

