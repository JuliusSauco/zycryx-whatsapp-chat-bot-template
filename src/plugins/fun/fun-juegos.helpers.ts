import type {GroupParticipant} from '@whiskeysockets/baileys';
import {httpBuffer} from '../../lib/http-client.js';
import type {ExtendedConn} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';
import {delay, pickRandom, randomInt} from '../../utils/random.js';

export const toM = (jid: string) => '@' + jid.split('@')[0];

export type PercentageCommand =
    | 'gay2'
    | 'lesbiana'
    | 'pajero'
    | 'pajera'
    | 'puto'
    | 'puta'
    | 'manco'
    | 'manca'
    | 'rata'
    | 'prostituto'
    | 'prostituta';

export type TopCommand =
    | 'topgays'
    | 'topotakus'
    | 'topintegrantes'
    | 'topintegrante'
    | 'toplagrasa'
    | 'topgrasa'
    | 'toppanafrescos'
    | 'toppanafresco'
    | 'topshiposters'
    | 'topshipost'
    | 'toppajer@s'
    | 'toppajeros'
    | 'toplind@s'
    | 'toplindos'
    | 'topput@s'
    | 'topputos'
    | 'topfamosos'
    | 'topfamos@s'
    | 'topsostero'
    | 'topparejas'
    | 'top5parejas';

const percentageReplies: Record<PercentageCommand, (target: string, command: string) => string> = {
    gay2: target => `_*${target}* *ES* *${randomPercent()}%* *GAY*_ 🏳️‍🌈`,
    lesbiana: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()}*_ 🏳️‍🌈`,
    pajero: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()}*_ 😏💦`,
    pajera: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()}*_ 😏💦`,
    puto: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()},* *MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`,
    puta: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()},* *MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`,
    manco: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()} 💩*_`,
    manca: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()} 💩*_`,
    rata: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()} 🐁 COME QUESO 🧀*_`,
    prostituto: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()} 🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`,
    prostituta: (target, command) => `_*${target}* *ES* *${randomPercent()}%* *${command.toUpperCase()} 🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`,
};

interface TopTemplate {
    render: (users: string[]) => string;
    audioUrl?: string;
    audioFile?: string;
}

const topTemplates: Record<TopCommand, TopTemplate> = {
    topgays: {
        audioUrl: 'https://qu.ax/HfeP.mp3',
        audioFile: 'error.mp3',
        render: users => renderTopRows('*🌈TOP 10 GAYS/LESBIANAS DEL GRUPO🌈*', users, ['🏳️‍🌈', '🪂', '🪁'], 'emoji-both'),
    },
    topotakus: {
        audioUrl: 'https://qu.ax/ZgFZ.mp3',
        audioFile: 'otaku.mp3',
        render: users => renderTopRows('*🌸 TOP 10 OTAKUS DEL GRUPO 🌸*', users, ['💮', '🌷'], 'emoji-both'),
    },
    topintegrantes: {
        render: users => renderTopRows('*_💎TOP 10 L@S MEJORES INTEGRANTES👑_*', users, ['💎', '👑'], 'emoji-both'),
    },
    topintegrante: {
        render: users => topTemplates.topintegrantes.render(users),
    },
    toplagrasa: {
        render: users => renderCustomTop('*_Uwu TOP 10 LA GRASA Uwu_*', users, [
            user => `Bv ${toM(user)} Bv`,
            user => `:v ${toM(user)} :v`,
            user => `:D ${toM(user)} :D`,
            user => `Owo ${toM(user)} Owo`,
            user => `U.u ${toM(user)} U.u`,
            user => `>:v ${toM(user)} >:v`,
            user => `:'v ${toM(user)} :'v`,
            user => `._. ${toM(user)} ._._`,
            user => `:V ${toM(user)} :V`,
            user => `XD ${toM(user)} XD`,
        ]),
    },
    topgrasa: {
        render: users => topTemplates.toplagrasa.render(users),
    },
    toppanafrescos: {
        render: users => renderTopRows('*_👊TOP 10 PANAFRESCOS👊_*', users, ['🤑', '🤙', '😎', '👌', '🧐', '😃', '😋', '🤜', '💪', '😉'], 'emoji-both'),
    },
    toppanafresco: {
        render: users => topTemplates.toppanafrescos.render(users),
    },
    topshiposters: {
        render: users => renderTopRows('*_😱TOP 10 SHIPOSTERS DEL GRUPO😱_*', users, ['😈', '🤙', '🥶', '🤑', '🥵', '🤝', '😟', '😨', '😇', '🤠'], 'emoji-both'),
    },
    topshipost: {
        render: users => topTemplates.topshiposters.render(users),
    },
    'toppajer@s': {
        render: users => renderTopRows('*_😏TOP L@S MAS PAJEROS/AS DEL GRUPO💦_*', users, ['🥵'], 'suffix', '💦'),
    },
    toppajeros: {
        render: users => topTemplates['toppajer@s'].render(users),
    },
    'toplind@s': {
        render: users => renderTopRows('*_😳TOP L@S MAS LIND@S Y SEXIS DEL GRUPO😳_*', users, ['✨'], 'emoji-both'),
    },
    toplindos: {
        render: users => topTemplates['toplind@s'].render(users),
    },
    'topput@s': {
        render: users => renderTopRows('*_😏TOP L@S MAS PUT@S DEL GRUPO SON🔥_*', users, ['👉'], 'suffix', '👌'),
    },
    topputos: {
        render: users => topTemplates['topput@s'].render(users),
    },
    topfamosos: {
        render: users => renderTopRows('*_🌟TOP PERSONAS FAMOSAS EN EL GRUPO🌟_*', users, ['🛫', '🥂', '🤩'], 'emoji-both'),
    },
    'topfamos@s': {
        render: users => topTemplates.topfamosos.render(users),
    },
    topsostero: {
        render: users => renderTopRows('*_🏋️ TOP 10 SOSTEROS DEL GRUPO 🏋️_*', users, ['💪', '🔥', '🏆'], 'emoji-both'),
    },
    topparejas: {
        render: renderCouplesTop,
    },
    top5parejas: {
        render: renderCouplesTop,
    },
};

export function isPercentageCommand(command: string): command is PercentageCommand {
    return command in percentageReplies;
}

export function isTopCommand(command: string): command is TopCommand {
    return command in topTemplates;
}

export function isDoxxeoCommand(command: string): boolean {
    return ['Doxxeo', 'doxxeo', 'doxxear', 'Doxxear', 'doxeo', 'doxear', 'doxxeame', 'doxeame'].includes(command);
}

export async function replyPercentageGame(conn: ExtendedConn, m: BotMessage, command: PercentageCommand, text: string) {
    if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`);

    const juego = percentageReplies[command](text.toUpperCase(), command).trim();
    return conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {});
}

export async function replyRandomPair(m: BotMessage, participants: GroupParticipant[], mode: 'friendship' | 'couple') {
    const [a, b] = getRandomParticipants(participants, 2, m.sender);
    const text = mode === 'friendship'
        ? `*🔰 Vamos a hacer algunas amistades 🔰*\n\n*Oye ${toM(a)} hablale al privado a ${toM(b)} para que jueguen y se haga una amistad 🙆*\n\n*Las mejores amistades empiezan con un juego 😉*`
        : `*${toM(a)}, 𝙔𝙖 𝙚𝙨 𝙝𝙤𝙧𝙖 𝙙𝙚 𝙦𝙪𝙚 𝙩𝙚 💍 𝘾𝙖𝙨𝙚𝙨 𝙘𝙤𝙣 ${toM(b)}, 𝙇𝙞𝙣𝙙𝙖 𝙋𝙖𝙧𝙚𝙟𝙖 😉💓*`;
    return m.reply(text, null, {mentions: [a, b]});
}

export async function replyActionTarget(conn: ExtendedConn, m: BotMessage, command: string, text: string) {
    if (!text) return m.reply(`*Ingrese el @ o el nombre de la persona que quieras saber si te puedes ${command.replace('how', '')}*`);
    const target = m.mentionedJid[0] || m.quoted?.sender;
    if (!target) return m.reply(`*Etiqueta o responde a la persona que quieras saber si te puedes ${command.replace('how', '')}*`);

    return conn.reply(m.chat, `🤤👅🥵 *𝐀𝐂𝐀𝐁𝐀𝐒 𝐃𝐄 𝐅𝐎𝐋𝐋𝐀𝐑𝐓𝐄𝐋@!*🥵👅🤤\n\n*𝙏𝙚 𝙖𝙘𝙖𝙗𝙖𝙨 𝙙𝙚 𝙛𝙤𝙡𝙡𝙖𝙧 𝙖 𝙡𝙖 𝙥𝙚𝙧𝙧𝙖 𝙙𝙚* *${text}* ⁩ *𝙖 𝟰 𝙥𝙖𝙩𝙖𝙨 𝙢𝙞𝙚𝙣𝙩𝙧𝙖𝙨 𝙩𝙚 𝙜𝙚𝙢𝙞𝙖 𝙘𝙤𝙢𝙤 𝙪𝙣𝙖 𝙢𝙖𝙡𝙙𝙞𝙩𝙖 𝙯𝙤𝙧𝙧𝙖 "𝐀𝐚𝐚𝐡.., 𝐀𝐚𝐚𝐡𝐡, 𝐬𝐢𝐠𝐮𝐞, 𝐧𝐨 𝐩𝐚𝐫𝐞𝐬, 𝐧𝐨 𝐩𝐚𝐫𝐞𝐬.." 𝙮 𝙡𝙖 𝙝𝙖𝙨 𝙙𝙚𝙟𝙖𝙙𝙤 𝙩𝙖𝙣 𝙧𝙚𝙫𝙚𝙣𝙩𝙖𝙙𝙖 𝙦𝙪𝙚 𝙣𝙤 𝙥𝙪𝙚𝙙𝙚 𝙨𝙤𝙨𝙩𝙚𝙣𝙚𝙧 𝙣𝙞 𝙨𝙪 𝙥𝙧𝙤𝙥𝙞𝙤 𝙘𝙪𝙚𝙧𝙥𝙤 𝙡𝙖 𝙢𝙖𝙡𝙙𝙞𝙩𝙖 𝙯𝙤𝙧𝙧𝙖!*\n\n*${text}*\n🤤🥵 *¡𝐘𝐀 𝐓𝐄 𝐇𝐀𝐍 𝐅𝐎𝐋𝐋𝐀𝐃𝐎!* 🥵🤤`, undefined, {mentions: [target]});
}

export async function replyPersonality(conn: ExtendedConn, m: BotMessage, text: string) {
    if (!text) return conn.reply(m.chat, 'Ingrese un nombre?', m);
    const percentageOptions = ['6%', '12%', '20%', '27%', '35%', '41%', '49%', '54%', '60%', '66%', '73%', '78%', '84%', '92%', '93%', '94%', '96%', '98,3%', '99,7%', '99,9%', '1%', '2,9%', '0%', '0,4%'];
    const personalidad = `┏━━°❀❬ *PERSONALIDAD}* ❭❀°━━┓
*┃*
*┃• Nombre* : ${text}
*┃• Buena Moral* : ${pickRandom(percentageOptions)}
*┃• Mala Moral* : ${pickRandom(percentageOptions)}
*┃• Tipo de persona* : ${pickRandom(['De buen corazón', 'Arrogante', 'Tacaño', 'Generoso', 'Humilde', 'Tímido', 'Cobarde', 'Entrometido', 'Cristal', 'No binarie XD', 'Pendejo'])}
*┃• Siempre* : ${pickRandom(['Pesado', 'De malas', 'Distraido', 'De molestoso', 'Chismoso', 'Pasa jalandosela', 'De compras', 'Viendo anime', 'Chatea en WhatsApp porque esta soltero', 'Acostado bueno para nada', 'De mujeriego', 'En el celular'])}
*┃• Inteligencia* : ${pickRandom(percentageOptions)}
*┃• Morosidad* : ${pickRandom(percentageOptions)}
*┃• Coraje* : ${pickRandom(percentageOptions)}
*┃• Miedo* : ${pickRandom(percentageOptions)}
*┃• Fama* : ${pickRandom(percentageOptions)}
*┃• Género* : ${pickRandom(['Hombre', 'Mujer', 'Homosexual', 'Bisexual', 'Pansexual', 'Feminista', 'Heterosexual', 'Macho alfa', 'Mujerzona', 'Marimacha', 'Palosexual', 'PlayStationSexual', 'Sr. Manuela', 'Pollosexual'])}
┗━━━━━━━━━━━━━━━━`;
    return conn.reply(m.chat, personalidad, m, {mentions: conn.parseMention(personalidad)});
}

export async function replyShip(conn: ExtendedConn, m: BotMessage, text: string) {
    if (!text) return m.reply(`⚠️ 𝐄𝐬𝐜𝐫𝐢𝐛𝐚 𝐞𝐥 𝐧𝐨𝐦𝐛𝐫𝐞 𝐝𝐞 𝐝𝐨𝐬 𝐩𝐞𝐫𝐬𝐨𝐧𝐚𝐬 𝐩𝐚𝐫𝐚 𝐜𝐚𝐥𝐜𝐮𝐥𝐚𝐫 𝐬𝐮𝐬 𝐚𝐦𝐨𝐫`);
    const [text1, ...text2Parts] = text.split(' ');
    const text2 = text2Parts.join(' ');
    if (!text2) return m.reply(`⚠️ 𝐅𝐚𝐥𝐭𝐚 𝐞𝐥 𝐧𝐨𝐦𝐛𝐫𝐞 𝐝𝐞 𝐥𝐚 𝐬𝐞𝐠𝐮𝐧𝐝𝐚 𝐩𝐞𝐫𝐬𝐨𝐧𝐚`);
    const love = `_❤️ *${text1}* tu oportunidad de enamorarte de *${text2}* es de *${randomInt(100)}%* 👩🏻‍❤️‍👨🏻_ `.trim();
    return m.reply(love, null, {mentions: conn.parseMention(love)});
}

export async function replyLoveMeter(conn: ExtendedConn, m: BotMessage, text: string) {
    if (!text) return m.reply(`🤔 𝙋𝙚𝙣𝙙𝙚𝙟𝙤 𝙚𝙩𝙞𝙦𝙪𝙚𝙩𝙖𝙨 𝙖𝙡 𝙡𝙖 𝙥𝙚𝙧𝙨𝙤𝙣𝙖 𝙘𝙤𝙣 𝙚𝙡 @Tag`);
    return conn.reply(m.chat, ` *❤️❤️ MEDIDOR DE AMOR ❤️❤️* 
*El amor de ${text} por ti es de* *${randomInt(100)}%* *de un 100%*
*Deberias pedirle que sea tu  novia/o ?*`.trim(), m, m.mentionedJid ? {
        mentions: m.mentionedJid
    } : {});
}

export async function replyDoxxeo(conn: ExtendedConn, m: BotMessage, text: string) {
    const sentMessage = await conn.sendMessage(m.chat, {
        text: `*😱 ¡¡𝙀𝙢𝙥𝙚𝙯𝙖𝙣𝙙𝙤 𝙙𝙤𝙭𝙭𝙚𝙤!! 😱*`,
        mentions: await conn.parseMention(text)
    }, {quoted: m});
    if (!sentMessage) return;

    const {key} = sentMessage;
    const boosts = [
        pickRandom(['21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40']),
        pickRandom(['41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60']),
        pickRandom(['61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80']),
        pickRandom(['81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '100']),
    ];

    for (const boost of boosts) {
        await delay(1000);
        await conn.sendMessage(m.chat, {text: `*${boost}%*`, edit: key});
    }

    const start = performance.now();
    const speed = `${performance.now() - start}`;
    await conn.sendMessage(m.chat, {text: buildDoxxeoResult(text, speed), edit: key});
}

export async function replyGayCanvas(conn: ExtendedConn, m: BotMessage) {
    const audioUrl = 'https://qu.ax/HfeP.mp3';
    const who = m.isGroup ? (m.mentionedJid[0] || m.sender) : m.sender;
    const gayScore = randomInt(100);
    const caption = `@${who.split("@")[0]} Es 🏳️‍🌈 ${gayScore}% Gay\n\n${getGayLabel(gayScore)}`;
    const avatar = await conn.profilePictureUrl(who, 'image').catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');
    const buffer = await httpBuffer(`https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(String(avatar))}`);

    await conn.sendMessage(m.chat, {
        image: buffer,
        caption,
        contextInfo: {
            mentionedJid: [who],
            forwardingScore: 9999999,
            isForwarded: false
        }
    }, {quoted: m, ephemeralExpiration: 24 * 60 * 1000});

    await conn.sendFile(m.chat, audioUrl, 'gay.mp3', undefined, m, true, {
        type: 'audioMessage',
        ptt: true
    });
}

export async function replyFreeTop(conn: ExtendedConn, m: BotMessage, participants: GroupParticipant[], text: string, usedPrefix: string) {
    if (!text) return m.reply(`𝙔 𝙚𝙡 𝙩𝙚𝙭𝙩𝙤? 🤔\n📍 Ejemplo: ${usedPrefix}top nedro`);
    const users = getRandomParticipants(participants, 10, m.sender);
    const k = randomInt(70);
    const x = pickRandom(['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚']);
    const vn = `https://hansxd.nasihosting.com/sound/sound${k}.mp3`;
    const top = `*${x} Top 10 ${text} ${x}*\n    \n${users.map((jid, index) => `*${index + 1}. ${toM(jid)}*`).join('\n')}`;
    await m.reply(top, null, {mentions: users});
    return conn.sendFile(m.chat, vn, 'error.mp3', undefined, m, true, {
        type: 'audioMessage',
        ptt: true
    });
}

export async function replyTopCommand(conn: ExtendedConn, m: BotMessage, participants: GroupParticipant[], command: TopCommand) {
    const users = getRandomParticipants(participants, 10, m.sender);
    const template = topTemplates[command];
    const text = template.render(users);
    await m.reply(text, null, {mentions: users});

    if (template.audioUrl) {
        await conn.sendFile(m.chat, template.audioUrl, template.audioFile || 'top.mp3', undefined, m, true, {
            type: 'audioMessage',
            ptt: true
        });
    }
}

function randomPercent(): number {
    return randomInt(500);
}

function getRandomParticipants(participants: GroupParticipant[], count: number, fallback: string): string[] {
    const ids = participants.map(participant => participant.id).filter(Boolean);
    const source = ids.length ? ids : [fallback];
    return Array.from({length: count}, () => pickRandom(source));
}

function renderTopRows(title: string, users: string[], emojis: string[], mode: 'emoji-both' | 'suffix', suffix?: string): string {
    const rows = users.map((jid, index) => {
        const emoji = emojis[index % emojis.length];
        const label = `${emoji} ${toM(jid)}`;
        const end = mode === 'emoji-both' ? emoji : suffix || '';
        return `*_${index + 1}.- ${label}_* ${end}`;
    });
    return `${title}\n    \n${rows.join('\n')}`;
}

function renderCustomTop(title: string, users: string[], renderers: Array<(jid: string) => string>): string {
    const rows = users.map((jid, index) => `*_${index + 1}.- ${renderers[index](jid)}_*`);
    return `${title} \n    \n${rows.join('\n')}`;
}

function renderCouplesTop(users: string[]): string {
    return `*_😍 Las 5 maravillosas parejas del grupo 😍_*
    
*_1.- ${toM(users[0])} 💘 ${toM(users[1])}_* 
Que hermosa pareja 💖, me invitan a su Boda 🛐

*_2.- ${toM(users[2])} 💘 ${toM(users[3])}_*  
🌹 Ustedes se merecen lo mejor del mundo 💞

*_3.- ${toM(users[4])} 💘 ${toM(users[5])}_* 
Tan enamorados 😍, para cuando la familia 🥰

*_4.- ${toM(users[6])} 💘 ${toM(users[7])}_* 
💗 Decreto que ustedes son la pareja del Año 💗 

*_5.- ${toM(users[8])} 💘 ${toM(users[9])}_* 
Genial! 💝, están de Luna de miel 🥵✨❤️‍🔥`;
}

function getGayLabel(score: number): string {
    if (score < 20) return 'Usted es hetero 🤪🤙';
    if (score <= 30) return 'Mas o menos 🤔';
    if (score <= 40) return 'Tengo mi dudas 😑';
    if (score <= 49) return 'Tengo razon? 😏';
    if (score === 50) return 'Eres o no? 🧐';
    return 'Usted es gay 🥸';
}

function buildDoxxeoResult(text: string, speed: string): string {
    return `*✅ 𝐏𝐞𝐫𝐬𝐨𝐧𝐚 𝐡𝐚𝐜𝐤𝐞𝐚𝐝𝐚 𝐜𝐨𝐧 𝐞𝐱𝐢𝐭𝐨𝐬 🤣*\n\n*𝐓𝐢𝐞𝐦𝐩𝐨: ${speed} 𝐒𝐞𝐠𝐮𝐧𝐝𝐨𝐬!*

*𝐑𝐞𝐬𝐮𝐥𝐭𝐚𝐝𝐨𝐬:*
*Nombre:* ${text}
*Ip:* 192.28.213.234
*N:* 43 7462
*W:* 12.4893
*SS NUMBER:* 6979191519182016
*IPV6:* fe80::5dcd::ef69::fb22::d9888%12 
*UPNP:* Enabled
*DMZ:* 10.112.42.15
*MAC:* 5A:78:3E:7E:00
*ISP:* TORNADO SLK PRODUCTION
*DNS:* 8.8.8.8
*ALT DNS:* 1.1.1.1.1  
*DNS SUFFIX:* TORNADO WI-FI
*WAN:* 100.23.10.90
*WAN TYPE:* private nat
*GATEWAY:* 192.168.0.1
*SUBNET MASK:* 255.255.0.255
*UDP OPEN PORTS:* 8080.80
*TCP OPEN PORTS:* 443
*ROUTER VENDEDOR:* ERICCSON
*DEVICE VENDEDOR:* WIN32-X
*CONNECTION TYPE:* TORNADO SLK PRODUCTION
*ICMPHOPS:* 192.168.0.1 192.168.1.1 100.73.43.4
host-132.12.32.167.ucom.com
host-132.12.111.ucom.com
36.134.67.189 216.239.78.11
Sof02s32inf14.1e100.net
*HTTP:* 192.168.3.1:433-->92.28.211.234:80
*Http:* 192.168.625-->92.28.211.455:80
*Http:* 192.168.817-->92.28.211.8:971
*Upd:* 192.168452-->92.28.211:7265288
*Tcp:* 192.168.682-->92.28.211:62227.7
*Tcp:* 192.168.725-->92.28.211:67wu2
*Tcp:* 192.168.629-->92.28.211.167:8615
*EXTERNAL MAC:* 6U:77:89:ER:O4
*MODEM JUMPS:* 58`;
}
