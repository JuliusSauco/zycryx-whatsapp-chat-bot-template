import type {GroupParticipant} from '@whiskeysockets/baileys';
import {httpBuffer} from '../../lib/http-client.js';
import {getRequiredPluginMessage, getRequiredPluginMessageList, renderTemplate} from '../../lib/message-template.js';
import type {ExtendedConn} from '../../types/context.js';
import type {BotMessage} from '../../types/message.js';
import {resolveMention, type ParticipantLike, type ResolvedMention} from '../../utils/mention.js';
import {delay, pickRandom, randomInt} from '../../utils/random.js';

export const toM = (jid: string) => '@' + jid.split('@')[0];
type TopParticipant = ResolvedMention;

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

const percentageCommands: Record<PercentageCommand, true> = {
    gay2: true,
    lesbiana: true,
    pajero: true,
    pajera: true,
    puto: true,
    puta: true,
    manco: true,
    manca: true,
    rata: true,
    prostituto: true,
    prostituta: true,
};

interface TopTemplate {
    render: (users: TopParticipant[]) => string;
}

const topTemplates: Record<TopCommand, TopTemplate> = {
    topgays: {
        render: users => renderTopRows(getTopTitle('topgays'), users, ['🏳️‍🌈', '🪂', '🪁'], 'emoji-both'),
    },
    topotakus: {
        render: users => renderTopRows(getTopTitle('topotakus'), users, ['💮', '🌷'], 'emoji-both'),
    },
    topintegrantes: {
        render: users => renderTopRows(getTopTitle('topintegrantes'), users, ['💎', '👑'], 'emoji-both'),
    },
    topintegrante: {
        render: users => topTemplates.topintegrantes.render(users),
    },
    toplagrasa: {
        render: users => renderCustomTop(getTopTitle('toplagrasa'), users, getRequiredPluginMessageList('fun.games.top.customRows')),
    },
    topgrasa: {
        render: users => topTemplates.toplagrasa.render(users),
    },
    toppanafrescos: {
        render: users => renderTopRows(getTopTitle('toppanafrescos'), users, ['🤑', '🤙', '😎', '👌', '🧐', '😃', '😋', '🤜', '💪', '😉'], 'emoji-both'),
    },
    toppanafresco: {
        render: users => topTemplates.toppanafrescos.render(users),
    },
    topshiposters: {
        render: users => renderTopRows(getTopTitle('topshiposters'), users, ['😈', '🤙', '🥶', '🤑', '🥵', '🤝', '😟', '😨', '😇', '🤠'], 'emoji-both'),
    },
    topshipost: {
        render: users => topTemplates.topshiposters.render(users),
    },
    'toppajer@s': {
        render: users => renderTopRows(getTopTitle('toppajeros'), users, ['🥵'], 'suffix', '💦'),
    },
    toppajeros: {
        render: users => topTemplates['toppajer@s'].render(users),
    },
    'toplind@s': {
        render: users => renderTopRows(getTopTitle('toplindos'), users, ['✨'], 'emoji-both'),
    },
    toplindos: {
        render: users => topTemplates['toplind@s'].render(users),
    },
    'topput@s': {
        render: users => renderTopRows(getTopTitle('topputos'), users, ['👉'], 'suffix', '👌'),
    },
    topputos: {
        render: users => topTemplates['topput@s'].render(users),
    },
    topfamosos: {
        render: users => renderTopRows(getTopTitle('topfamosos'), users, ['🛫', '🥂', '🤩'], 'emoji-both'),
    },
    'topfamos@s': {
        render: users => topTemplates.topfamosos.render(users),
    },
    topsostero: {
        render: users => renderTopRows(getTopTitle('topsostero'), users, ['💪', '🔥', '🏆'], 'emoji-both'),
    },
    topparejas: {
        render: renderCouplesTop,
    },
    top5parejas: {
        render: renderCouplesTop,
    },
};

export function isPercentageCommand(command: string): command is PercentageCommand {
    return command in percentageCommands;
}

export function isTopCommand(command: string): command is TopCommand {
    return command in topTemplates;
}

export function isDoxxeoCommand(command: string): boolean {
    return ['Doxxeo', 'doxxeo', 'doxxear', 'Doxxear', 'doxeo', 'doxear', 'doxxeame', 'doxeame'].includes(command);
}

export async function replyPercentageGame(conn: ExtendedConn, m: BotMessage, command: PercentageCommand, text: string) {
    if (!text) return m.reply(getRequiredPluginMessage('fun.games.missingMention'));

    const juego = renderTemplate(getRequiredPluginMessage(`fun.games.percentages.${command}`), {
        target: text.toUpperCase(),
        percent: String(randomPercent()),
        command: command.toUpperCase(),
    }).trim();
    return conn.reply(m.chat, juego, m, m.mentionedJid ? {mentions: m.mentionedJid} : {});
}

export async function replyRandomPair(m: BotMessage, participants: GroupParticipant[], mode: 'friendship' | 'couple') {
    const [a, b] = getRandomParticipantIds(participants, 2, m.sender);
    const text = mode === 'friendship'
        ? renderTemplate(getRequiredPluginMessage('fun.games.friendshipPair'), {first: toM(a), second: toM(b)})
        : renderTemplate(getRequiredPluginMessage('fun.games.couplePair'), {first: toM(a), second: toM(b)});
    return m.reply(text, null, {mentions: [a, b]});
}

export async function replyActionTarget(conn: ExtendedConn, m: BotMessage, command: string, text: string) {
    const action = command.replace('how', '');
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('fun.games.actionMissingText'), {action}));
    const target = m.mentionedJid[0] || m.quoted?.sender;
    if (!target) return m.reply(renderTemplate(getRequiredPluginMessage('fun.games.actionMissingTarget'), {action}));

    return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('fun.games.actionResult'), {targetText: text}), undefined, {mentions: [target]});
}

export async function replyPersonality(conn: ExtendedConn, m: BotMessage, text: string) {
    if (!text) return conn.reply(m.chat, getRequiredPluginMessage('fun.games.personalityMissingName'), m);
    const percentageOptions = getRequiredPluginMessageList('fun.games.personalityOptions.percentages');
    const personTypes = getRequiredPluginMessageList('fun.games.personalityOptions.personTypes');
    const alwaysOptions = getRequiredPluginMessageList('fun.games.personalityOptions.always');
    const genders = getRequiredPluginMessageList('fun.games.personalityOptions.genders');
    const personalidad = renderTemplate(getRequiredPluginMessage('fun.games.personalityResult'), {
        name: text,
        goodMoral: pickRandom(percentageOptions),
        badMoral: pickRandom(percentageOptions),
        personType: pickRandom(personTypes),
        always: pickRandom(alwaysOptions),
        intelligence: pickRandom(percentageOptions),
        debt: pickRandom(percentageOptions),
        courage: pickRandom(percentageOptions),
        fear: pickRandom(percentageOptions),
        fame: pickRandom(percentageOptions),
        gender: pickRandom(genders),
    });
    return conn.reply(m.chat, personalidad, m, {mentions: conn.parseMention(personalidad)});
}

export async function replyShip(conn: ExtendedConn, m: BotMessage, text: string) {
    if (!text) return m.reply(getRequiredPluginMessage('fun.games.shipMissingNames'));
    const [text1, ...text2Parts] = text.split(' ');
    const text2 = text2Parts.join(' ');
    if (!text2) return m.reply(getRequiredPluginMessage('fun.games.shipMissingSecond'));
    const love = renderTemplate(getRequiredPluginMessage('fun.games.shipResult'), {
        first: text1,
        second: text2,
        percent: String(randomInt(100)),
    });
    return m.reply(love, null, {mentions: conn.parseMention(love)});
}

export async function replyLoveMeter(conn: ExtendedConn, m: BotMessage, text: string) {
    if (!text) return m.reply(getRequiredPluginMessage('fun.games.missingMention'));
    return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('fun.games.loveMeterResult'), {
        target: text,
        percent: String(randomInt(100)),
    }).trim(), m, m.mentionedJid ? {
        mentions: m.mentionedJid
    } : {});
}

export async function replyDoxxeo(conn: ExtendedConn, m: BotMessage, text: string) {
    const sentMessage = await conn.sendMessage(m.chat, {
        text: getRequiredPluginMessage('fun.games.doxxeoStart'),
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
        await conn.sendMessage(m.chat, {text: renderTemplate(getRequiredPluginMessage('fun.games.doxxeoProgress'), {boost}), edit: key});
    }

    const start = performance.now();
    const speed = `${performance.now() - start}`;
    await conn.sendMessage(m.chat, {text: buildDoxxeoResult(text, speed), edit: key});
}

export async function replyGayCanvas(conn: ExtendedConn, m: BotMessage) {
    const audioUrl = 'https://qu.ax/HfeP.mp3';
    const who = m.isGroup ? (m.mentionedJid[0] || m.sender) : m.sender;
    const gayScore = randomInt(100);
    const caption = renderTemplate(getRequiredPluginMessage('fun.games.gayCaption'), {
        user: who.split("@")[0],
        score: String(gayScore),
        label: getGayLabel(gayScore),
    });
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
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('fun.games.freeTopUsage'), {prefix: usedPrefix}));
    const users = getRandomParticipants(participants, 10, m.sender);
    const mentions = users.map(user => user.mentionJid);
    const x = pickRandom(['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚']);
    const top = renderTemplate(getRequiredPluginMessage('fun.games.freeTopResult'), {
        emoji: x,
        topic: text,
        rows: users.map((user, index) => `*${index + 1}. ${user.tag}*`).join('\n'),
    });
    await m.reply(top, null, {mentions});
}

export async function replyTopCommand(_conn: ExtendedConn, m: BotMessage, participants: GroupParticipant[], command: TopCommand) {
    const users = getRandomParticipants(participants, 10, m.sender);
    const template = topTemplates[command];
    const text = template.render(users);
    await m.reply(text, null, {mentions: users.map(user => user.mentionJid)});
}

function randomPercent(): number {
    return randomInt(500);
}

function getRandomParticipantIds(participants: GroupParticipant[], count: number, fallback: string): string[] {
    const source = getParticipantIdSource(participants, fallback);
    return Array.from({length: count}, () => pickRandom(source));
}

function getRandomParticipants(participants: GroupParticipant[], count: number, fallback: string): TopParticipant[] {
    const source = getParticipantIdSource(participants, fallback);
    const shuffled = shuffle(source);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    const seen = new Set<string>();

    return selected
        .map(jid => resolveMention(jid, participants as ParticipantLike[]))
        .filter(user => {
            if (seen.has(user.mentionJid)) return false;
            seen.add(user.mentionJid);
            return true;
        });
}

function getParticipantIdSource(participants: GroupParticipant[], fallback: string): string[] {
    const ids = participants.map(participant => participant.id).filter(Boolean);
    return ids.length ? ids : [fallback];
}

function shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getTopTitle(key: string): string {
    return getRequiredPluginMessage(`fun.games.top.titles.${key}`);
}

function renderTopRows(title: string, users: TopParticipant[], emojis: string[], mode: 'emoji-both' | 'suffix', suffix?: string): string {
    const rows = users.map((user, index) => {
        const emoji = emojis[index % emojis.length];
        const label = `${emoji} ${user.tag}`;
        const end = mode === 'emoji-both' ? emoji : suffix || '';
        return renderTemplate(getRequiredPluginMessage('fun.games.top.row'), {
            index: String(index + 1),
            label,
            suffix: end,
        });
    });
    return `${title}\n    \n${rows.join('\n')}`;
}

function renderCustomTop(title: string, users: TopParticipant[], rowTemplates: string[]): string {
    const rows = users.map((user, index) => renderTemplate(getRequiredPluginMessage('fun.games.top.customRow'), {
        index: String(index + 1),
        label: renderTemplate(rowTemplates[index], {user: user.tag}),
    }));
    return `${title} \n    \n${rows.join('\n')}`;
}

function renderCouplesTop(users: TopParticipant[]): string {
    const pairMessages = getRequiredPluginMessageList('fun.games.top.couplesMessages');
    const pairCount = Math.floor(users.length / 2);

    if (pairCount === 0) return getRequiredPluginMessage('fun.games.top.couplesEmpty');

    const rows = Array.from({length: pairCount}, (_, index) => {
        const first = users[index * 2];
        const second = users[index * 2 + 1];
        return renderTemplate(getRequiredPluginMessage('fun.games.top.couplesRow'), {
            index: String(index + 1),
            first: first.tag,
            second: second.tag,
            message: pairMessages[index],
        });
    });

    return renderTemplate(getRequiredPluginMessage('fun.games.top.couplesTitle'), {
        count: String(pairCount),
        rows: rows.join('\n\n'),
    });
}

function getGayLabel(score: number): string {
    if (score < 20) return getRequiredPluginMessage('fun.games.gayLabels.low');
    if (score <= 30) return getRequiredPluginMessage('fun.games.gayLabels.mediumLow');
    if (score <= 40) return getRequiredPluginMessage('fun.games.gayLabels.medium');
    if (score <= 49) return getRequiredPluginMessage('fun.games.gayLabels.mediumHigh');
    if (score === 50) return getRequiredPluginMessage('fun.games.gayLabels.half');
    return getRequiredPluginMessage('fun.games.gayLabels.high');
}

function buildDoxxeoResult(text: string, speed: string): string {
    return renderTemplate(getRequiredPluginMessage('fun.games.doxxeoResult'), {
        name: text,
        speed,
    });
}
