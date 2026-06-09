import {logError} from '../../lib/logger.js';
import moment from 'moment-timezone';
import {countUsers, getUserById} from '../../services/user.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import type {proto} from '@whiskeysockets/baileys';
import {getRequiredPluginMessage, getRequiredPluginMessageObjectList, renderTemplate} from '../../lib/message-template.js';

interface MenuCooldown {
    lastUsed: number;
    menuMessage: proto.WebMessageInfo | null;
}

interface MenuAccess {
    emoji: string;
    command: string;
    description: string;
    restricted?: string;
}

const cooldowns = new Map<string, MenuCooldown>();
const COOLDOWN_DURATION = 180000;

const infoCommands: MenuAccess[] = [
    ...getRequiredPluginMessageObjectList<MenuAccess>('menus.main.infoCommands'),
];

const menuAccess: MenuAccess[] = [
    ...getRequiredPluginMessageObjectList<MenuAccess>('menus.main.menuAccess'),
];

export default definePlugin({
    help: ['menu'],
    tags: ['main'],
    command: /^(menu|help|allmenu|menú)$/i,
    async execute(m, {conn, usedPrefix}) {
        const chatId = m.key?.remoteJid || m.chat;
        const prefix = usedPrefix || '#';
        const now = Date.now();
        const chatData = cooldowns.get(chatId) || {lastUsed: 0, menuMessage: null};
        const timeLeft = COOLDOWN_DURATION - (now - chatData.lastUsed);

        if (timeLeft > 0) {
            try {
                const senderTag = m.sender ? `@${m.sender.split('@')[0]}` : getRequiredPluginMessage('menus.main.fallbackUser');
                await conn.reply(chatId, renderTemplate(getRequiredPluginMessage('menus.main.cooldown'), {user: senderTag}), chatData.menuMessage || m);
            } catch {
                return;
            }
            return;
        }

        const text = await buildMainMenuText(m.sender, m.pushName || getRequiredPluginMessage('menus.main.fallbackName'), prefix, conn.user?.id);

        try {
            const menuMessage = await conn.sendMessage(chatId, {
                text,
                contextInfo: {
                    mentionedJid: await conn.parseMention(text),
                },
            }, {quoted: m});
            cooldowns.set(chatId, {lastUsed: now, menuMessage});
            m.react('🙌');
        } catch (err: unknown) {
            m.react('❌');
            logError(err);
        }
    },
});

async function buildMainMenuText(sender: string, name: string, prefix: string, botId?: string): Promise<string> {
    const fecha = moment.tz('America/Argentina/Buenos_Aires').format('DD/MM/YYYY');
    const hora = moment.tz('America/Argentina/Buenos_Aires').format('HH:mm:ss');
    const muptime = clockString(process.uptime() * 1000);
    const user = await getMenuUser(sender);
    const {total, registered} = await getUserCounts();
    const botOfc = buildBotLine(botId);

    return renderTemplate(getRequiredPluginMessage('menus.main.menu'), {
        watermark: info.wm,
        name,
        date: fecha,
        time: hora,
        totalUsers: toNum(total),
        registeredUsers: toNum(registered),
        uptime: muptime,
        limit: user.limite,
        botLine: botOfc,
        infoCommands: renderAccessList(infoCommands, prefix),
        menuAccess: renderAccessList(menuAccess, prefix)
    }).trim();
}

async function getMenuUser(sender: string): Promise<{limite: number}> {
    try {
        const user = await getUserById(sender);
        return {limite: user?.limite || 0};
    } catch {
        return {limite: 0};
    }
}

async function getUserCounts(): Promise<{total: number; registered: number}> {
    try {
        return await countUsers();
    } catch {
        return {total: 0, registered: 0};
    }
}

function renderAccessList(items: MenuAccess[], prefix: string): string {
    return items
        .map((item) => {
            const restricted = item.restricted ? renderTemplate(getRequiredPluginMessage('menus.main.restricted'), {value: item.restricted}) : '';
            return renderTemplate(getRequiredPluginMessage('menus.main.accessItem'), {...item, prefix, restricted});
        })
        .join('\n');
}

function buildBotLine(botId?: string): string {
    if (!botId) return '';
    const jidNum = botId.replace(/:\d+/, '').split('@')[0];
    const globalId = global.conn?.user?.id;
    if (!globalId || botId === globalId) return renderTemplate(getRequiredPluginMessage('menus.main.officialBot'), {bot: jidNum});
    const mainBot = globalId.replace(/:\d+/, '').split('@')[0];
    return renderTemplate(getRequiredPluginMessage('menus.main.subBot'), {bot: mainBot});
}

const clockString = (ms: number) => {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

const toNum = (n: number) => (n >= 1_000_000) ? `${(n / 1_000_000).toFixed(1)}M`
    : (n >= 1_000) ? `${(n / 1_000).toFixed(1)}k`
        : n.toString();
