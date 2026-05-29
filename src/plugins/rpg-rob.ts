import {definePlugin} from '../core/define-plugin.js'
import {addWalletResourcesAndSetFields, getWallet, transferWalletResource} from '../services/wallet.service.js';

const ro = 3000;

export default definePlugin({
    help: ['rob', 'robar'],
    tags: ['econ'],
    command: /^(robar|rob)$/i,
    register: true,
    async execute(m, {conn, usedPrefix, command}) {
    const now = Date.now();
    const robber = await getWallet(m.sender);
    if (!robber) return m.reply('❌ En usuarios no aparece en mi base de datos');
    const cooldown = 3600000;
    const timeLeft = (robber.lastrob ?? 0) + cooldown - now;
    if (timeLeft > 0) return m.reply(`🚓 La policía está vigilando, vuelve en: *${msToTime(timeLeft)}*`);

    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted?.sender;
    } else {
        who = m.chat;
    }

    if (!who) return conn.reply(m.chat, `⚠️ *Etiqueta a un usuario para robarle XP*`, m);
    if (who === m.sender) return m.reply(`❌ No puedes robarte a ti mismo.`);
    const victim = await getWallet(who);
    if (!victim) return m.reply(`❌ El usuarios no se encuentra en mi base de datos.`);

    const cantidad = Math.floor(Math.random() * ro);
    if ((victim.exp ?? 0) < cantidad) return conn.reply(m.chat, `@${who.split('@')[0]} tiene menos de ${ro} XP.\n> No robes a un pobre v:`, m, {mentions: [who]});
    const transferred = await transferWalletResource({from: who, to: m.sender, resource: 'exp', amount: cantidad});
    if (!transferred) return m.reply('❌ No se pudo completar el robo.');
    await addWalletResourcesAndSetFields({userId: m.sender, resources: {}, fields: {lastrob: now}});
    return conn.reply(m.chat, `*Robaste ${cantidad} XP a @${who.split('@')[0]}*`, m, {mentions: [who]});
    }
});

;

function msToTime(duration: any) {
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    return `${hours} Hora(s) ${minutes} Minuto(s)`;
}
