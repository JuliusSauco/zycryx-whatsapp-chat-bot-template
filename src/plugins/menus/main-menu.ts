import {logError} from '../../lib/logger.js';
import moment from 'moment-timezone';
import {countUsers, getUserById} from '../../services/user.service.js';
import {definePlugin} from '../../core/define-plugin.js';
import type {proto} from '@whiskeysockets/baileys';

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
    {emoji: '⏱️', command: 'uptime', description: 'Muestra cuánto tiempo lleva activo el bot.'},
    {emoji: '📡', command: 'speedtest', description: 'Mide velocidad y latencia del entorno del bot.'},
    {emoji: '🧾', command: 'sc', description: 'Muestra información del código fuente o runtime.'},
    {emoji: '🤖', command: 'infobot', description: 'Muestra datos generales sobre el bot.'},
    {emoji: '💖', command: 'donar', description: 'Muestra formas de apoyar el mantenimiento del bot.'},
    {emoji: '📝', command: 'reporte <mensaje>', description: 'Envía un reporte o sugerencia al equipo.'},
];

const menuAccess: MenuAccess[] = [
    {emoji: '🔊', command: 'menu2', description: 'Audios y frases que responden sin prefijo.'},
    {emoji: '🎞️', command: 'menu3', description: 'GIFs de reacción organizados por categoría.'},
    {emoji: '👥', command: 'menugrupo', description: 'Comandos generales disponibles dentro de grupos.', restricted: 'grupo'},
    {emoji: '🛡️', command: 'menuadmin', description: 'Moderación y configuración del grupo.', restricted: 'admins'},
    {emoji: '👑', command: 'menuowner', description: 'Mantenimiento global y comandos privados del bot.', restricted: 'owners'},
    {emoji: '🔧', command: 'menutools', description: 'Herramientas, convertidores e inspección.'},
    {emoji: '🎮', command: 'menujuegos', description: 'Juegos, retos y dinámicas sociales.'},
    {emoji: '💎', command: 'menurpg', description: 'Economía, registro, niveles y gacha.'},
    {emoji: '🚀', command: 'menudescargas', description: 'Descargas de música, video, redes y archivos.'},
    {emoji: '🔍', command: 'menubuscar', description: 'Buscadores, letras, imágenes e IA.'},
    {emoji: '🧧', command: 'menusticker', description: 'Creación, edición y descarga de stickers.'},
    {emoji: '🪄', command: 'menurandom', description: 'Anime, memes e imágenes aleatorias SFW.'},
    {emoji: '🔞', command: 'menunsfw', description: 'Contenido adulto si el grupo lo tiene habilitado.', restricted: 'NSFW'},
    {emoji: '✨', command: 'menusubbot', description: 'Sesiones y personalización de subbots.'},
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
                const senderTag = m.sender ? `@${m.sender.split('@')[0]}` : '@usuario';
                await conn.reply(chatId, `⚠️ Hey ${senderTag}, ahí está el menú 🙄\n> Solo se enviará cada 3 minutos para evitar spam. Desplázate hacia arriba para verlo completo. 👆`, chatData.menuMessage || m);
            } catch {
                return;
            }
            return;
        }

        const text = await buildMainMenuText(m.sender, m.pushName || 'sin name', prefix, conn.user?.id);

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

    return `
「 ${info.wm} 」

Hola 👋🏻 *${name}*

*• Fecha:* ${fecha}
*• Hora:* ${hora} (🇦🇷)
*• Usuarios:* ${toNum(total)}
*• Registrados:* ${toNum(registered)}
*• Tiempo activo:* ${muptime}
*• Tu limite:* ${user.limite}
${botOfc}

\`<COMANDOS DE INFORMACION/>\`
${renderAccessList(infoCommands, prefix)}

\`<MENUS DISPONIBLES/>\`
${renderAccessList(menuAccess, prefix)}

> Usa el comando del menú que necesites para ver descripción y modo de uso de cada comando.
`.trim();
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
            const restricted = item.restricted ? ` (${item.restricted})` : '';
            return `${item.emoji} *${prefix}${item.command}* — ${item.description}${restricted}`;
        })
        .join('\n');
}

function buildBotLine(botId?: string): string {
    if (!botId) return '';
    const jidNum = botId.replace(/:\d+/, '').split('@')[0];
    const globalId = global.conn?.user?.id;
    if (!globalId || botId === globalId) return `*• Bot Ofc:* wa.me/${jidNum}`;
    const mainBot = globalId.replace(/:\d+/, '').split('@')[0];
    return `*• Soy un sub bot del:* wa.me/${mainBot}`;
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
