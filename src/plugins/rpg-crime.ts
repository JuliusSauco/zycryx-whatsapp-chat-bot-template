import {definePlugin} from '../core/define-plugin.js'
//CÓDIGO CREADO POR elrebelde21 : https://github.com/elrebelde21
import {addWalletResource, addWalletResourcesAndSetFields, getWallet} from '../services/wallet.service.js';

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
    if (timePassed < cooldown) return m.reply(`『🚓︎』𝙇𝘼 𝙋𝙊𝙇𝙄𝘾𝙄𝘼 𝙀𝙎𝙏𝘼 𝙑𝙄𝙂𝙄𝙇𝘼𝙉𝘿𝙊, 𝙑𝙐𝙀𝙇𝙑𝙀 𝙀𝙉 : ${msToTime(cooldown - timePassed)}`);
    const participants = metadata.participants.map(v => v.id).filter(Boolean);
    const randomTarget = participants[Math.floor(Math.random() * participants.length)];
    const exp = Math.floor(Math.random() * 7000);
    const diamond = Math.floor(Math.random() * 30);
    const money = Math.floor(Math.random() * 9000);
    const type = Math.floor(Math.random() * 5);

    let text = '';
    switch (type) {
        case 0:
            text = `《💰》${pickRandom(robar)} ${exp} XP`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp}, fields: {crime: now}});
            break;
        case 1:
            text = `《🚓》${pickRandom(robmal)} ${exp} XP`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {exp: -exp}, fields: {crime: now}});
            break;
        case 2:
            text = `《💰》${pickRandom(robar)}\n\n${diamond} 💎 DIAMANTE\n${money} 🪙 LOLICOINS`;
            await addWalletResourcesAndSetFields({userId: m.sender, resources: {limite: diamond, money}, fields: {crime: now}});
            break;
        case 3:
            text = `《🚓》${pickRandom(robmal)}\n\n${diamond} 💎 DIAMANTE\n${money} 🪙 LOLICOINS`;
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

function msToTime(duration: number) {
    const minutes = Math.floor((duration / 1000 / 60) % 60);
    const hours = Math.floor((duration / 1000 / 60 / 60) % 24);
    return `${hours.toString().padStart(2, '0')} Hora(s) ${minutes.toString().padStart(2, '0')} Minuto(s)`;
}

function pickRandom<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
}

let robar = [
    'Robaste un Banco 🏦 y Obtuviste',
    'Negociaste con el jefe de la mafia y Obtuviste:',
    'Casi te atrapa la policía, pero lograste robar una cantidad valiosa de 💰. ¡Ten cuidado la próxima vez! Obtuviste:',
    'Los mafiosos te han pagado:',
    'Le has robado al Administrador del Grupo:',
    'Le robaste a tu presidente una suma de:',
    'Le robaste a un famoso un valor de:',
    'Entraste sigilosamente en el museo y robaste una obra de arte valiosa:',
    'Infiltraste una joyería y obtuviste un botín impresionante:',
    'Te convertiste en el ladrón más buscado del país, obtuviste:',
    'Robaste un camión lleno de productos valiosos y obtuviste:',
    'Asaltaste un tren y conseguiste:',
    'Robaste un avión cargado de mercancía y obtuviste:',
    'Te hiciste pasar por un millonario para robar una joya única, obtuviste:',
    'Entraste a la casa de un coleccionista de arte y robaste una pieza invaluable, obtuviste:',
    'Secuestraste a un empresario y conseguiste un rescate importante:',
    'Amenazaste a un político y obtuviste una gran suma de dinero:',
    'Sobornaste a un oficial de policía para obtener información valiosa, conseguiste:',
];

let robmal = [
    'LA POLICIA TE VIO 🙀👮‍♂️ PERDISTE',
    'Fuiste a robar un banco 🏦 y tu ayudante te vendió a la policía, perdiste:',
    'No pudiste escapar de la Policía 🚔🤡, perdiste:',
    'Intentaste robar un casino pero te descubrieron, perdiste:',
    'Te atraparon tratando de robar una tienda, perdiste:',
    'La alarma sonó cuando intentabas robar un almacén, perdiste:',
    'El dueño del lugar te atrapó in fraganti, perdiste:',
    'Intentaste hackear una cuenta bancaria pero te rastrearon, perdiste:',
    'Fuiste descubierto tratando de sobornar a un oficial, perdiste:',
    'Tu plan para chantajear a un empresario salió mal, perdiste:',
];
