import {definePlugin} from '../../core/define-plugin.js'
//CÓDIGO CREADO POR elrebelde21 : https://github.com/elrebelde21
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js';
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationClockWords} from '../../utils/time.js';

const cooldown = 3600000; // 1 hora
export default definePlugin({
    help: ['crime'],
    tags: ['econ'],
    command: /^(crime|crimen)$/i,
    group: true,
    register: true,
    async execute(m, {conn, metadata}) {
    const now = Date.now();
    const user = await getWallet(m.sender);
    if (!user) return m.reply(getRequiredPluginMessage('rpg.crime.missingUser'));

    const timePassed = now - (user.crime || 0);
    if (timePassed < cooldown) return m.reply(renderTemplate(getRequiredPluginMessage('rpg.crime.cooldown'), {
        time: formatDurationClockWords(cooldown - timePassed)
    }));
    const participants = metadata.participants.map(v => v.id).filter(Boolean);
    const randomTarget = pickRandom(participants);
    const exp = randomInt(7000);
    const diamond = randomInt(30);
    const money = randomInt(9000);
    const type = randomInt(5);
    const crimeSuccessMessages = getRequiredPluginMessageList('rpg.crime.successMessages');
    const crimeFailureMessages = getRequiredPluginMessageList('rpg.crime.failureMessages');

    let text = '';
    switch (type) {
        case 0:
            text = renderTemplate(getRequiredPluginMessage('rpg.crime.successXp'), {
                message: pickRandom(crimeSuccessMessages),
                xp: exp
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}});
            break;
        case 1:
            text = renderTemplate(getRequiredPluginMessage('rpg.crime.failureXp'), {
                message: pickRandom(crimeFailureMessages),
                xp: exp
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp: -exp}, fields: {crime: now}});
            break;
        case 2:
            text = renderTemplate(getRequiredPluginMessage('rpg.crime.successResources'), {
                message: pickRandom(crimeSuccessMessages),
                diamonds: diamond,
                money
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: diamond, money}, fields: {crime: now}});
            break;
        case 3:
            text = renderTemplate(getRequiredPluginMessage('rpg.crime.failureResources'), {
                message: pickRandom(crimeFailureMessages),
                diamonds: diamond,
                money
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: -diamond, money: -money}, fields: {crime: now}});
            break;
        case 4:
            text = renderTemplate(getRequiredPluginMessage('rpg.crime.stoleFromUser'), {
                user: randomTarget.split('@')[0],
                xp: exp
            });
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}});
            await addWalletResource(randomTarget, 'exp', -500);
            break;
    }

    return conn.sendMessage(m.chat, {text, mentions: [m.sender, randomTarget]}, {quoted: m});
    }
});

;
