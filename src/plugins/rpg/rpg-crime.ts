import {definePlugin} from '../../core/define-plugin.js'
//CÓDIGO CREADO POR elrebelde21 : https://github.com/elrebelde21
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../../services/wallet.service.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationClockWords} from '../../utils/time.js';
import {crimeFailureMessages, crimeSuccessMessages} from './rpg-crime.data.js';

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
    if (!user) return m.reply('❌ En usuarios no aparece en mi base de datos');

    const timePassed = now - (user.crime || 0);
    if (timePassed < cooldown) return m.reply(`『🚓︎』𝙇𝘼 𝙋𝙊𝙇𝙄𝘾𝙄𝘼 𝙀𝙎𝙏𝘼 𝙑𝙄𝙂𝙄𝙇𝘼𝙉𝘿𝙊, 𝙑𝙐𝙀𝙇𝙑𝙀 𝙀𝙉 : ${formatDurationClockWords(cooldown - timePassed)}`);
    const participants = metadata.participants.map(v => v.id).filter(Boolean);
    const randomTarget = pickRandom(participants);
    const exp = randomInt(7000);
    const diamond = randomInt(30);
    const money = randomInt(9000);
    const type = randomInt(5);

    let text = '';
    switch (type) {
        case 0:
            text = `《💰》${pickRandom(crimeSuccessMessages)} ${exp} XP`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}});
            break;
        case 1:
            text = `《🚓》${pickRandom(crimeFailureMessages)} ${exp} XP`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp: -exp}, fields: {crime: now}});
            break;
        case 2:
            text = `《💰》${pickRandom(crimeSuccessMessages)}\n\n${diamond} 💎 DIAMANTE\n${money} 🪙 LOLICOINS`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: diamond, money}, fields: {crime: now}});
            break;
        case 3:
            text = `《🚓》${pickRandom(crimeFailureMessages)}\n\n${diamond} 💎 DIAMANTE\n${money} 🪙 LOLICOINS`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: -diamond, money: -money}, fields: {crime: now}});
            break;
        case 4:
            text = `《💰》Le has robado a @${randomTarget.split('@')[0]} una cantidad de ${exp} XP`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}});
            await addWalletResource(randomTarget, 'exp', -500);
            break;
    }

    return conn.sendMessage(m.chat, {text, mentions: [m.sender, randomTarget]}, {quoted: m});
    }
});

;
