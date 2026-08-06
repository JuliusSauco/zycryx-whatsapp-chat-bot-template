import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//CÓDIGO CREADO POR elrebelde21 : https://github.com/elrebelde21
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationClockWords} from '../../utils/time.js';

const CRIME_COOLDOWN_MS = 25 * 60 * 1000; // 25 minutos
export default defineSdkPlugin({
    help: ['crime'],
    tags: ['rpg'],
    command: /^(crime|crimen)$/i,
    group: true,
    register: true,
    async execute(m, {metadata, sdk}) {
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return sdk.reply.message('rpg.crime.missingUser');

    const timePassed = now - (user.crime || 0);
    if (timePassed < CRIME_COOLDOWN_MS) return sdk.reply.message('rpg.crime.cooldown', {
        time: formatDurationClockWords(CRIME_COOLDOWN_MS - timePassed)
    });
    const participants = metadata.participants.map(v => v.id).filter(Boolean);
    const randomTarget = pickRandom(participants);
    const exp = randomInt(7000);
    const diamond = randomInt(30);
    const coins = randomInt(9000);
    const type = randomInt(5);
    const crimeSuccessMessages = sdk.content.messageList('rpg.crime.successMessages');
    const crimeFailureMessages = sdk.content.messageList('rpg.crime.failureMessages');

    let text = '';
    switch (type) {
        case 0:
            text = sdk.content.renderMessage('rpg.crime.successXp', {
                message: pickRandom(crimeSuccessMessages),
                xp: exp
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}, reason: 'crime', operation: 'crime'});
            break;
        case 1:
            text = sdk.content.renderMessage('rpg.crime.failureXp', {
                message: pickRandom(crimeFailureMessages),
                xp: exp
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp: -exp}, fields: {crime: now}, reason: 'crime', operation: 'crime'});
            break;
        case 2:
            text = sdk.content.renderMessage('rpg.crime.successResources', {
                message: pickRandom(crimeSuccessMessages),
                diamonds: diamond,
                coins
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: diamond, coins}, fields: {crime: now}, reason: 'crime', operation: 'crime'});
            break;
        case 3:
            text = sdk.content.renderMessage('rpg.crime.failureResources', {
                message: pickRandom(crimeFailureMessages),
                diamonds: diamond,
                coins
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: -diamond, coins: -coins}, fields: {crime: now}, reason: 'crime', operation: 'crime'});
            break;
        case 4:
            text = sdk.content.renderMessage('rpg.crime.stoleFromUser', {
                user: randomTarget.split('@')[0],
                xp: exp
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}, reason: 'crime', operation: 'crime'});
            await addWalletResource(randomTarget, 'exp', -500, 'crime', 'crime_victim');
            break;
    }

    return sdk.sendMessage({text, mentions: [m.sender, randomTarget]});
    }
});

;
