import {definePlugin} from '../../core/define-plugin.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {accessModeLabel} from '../../utils/access-mode.js';
import {canUseNsfw} from '../../utils/nsfw-access.js';

/**
 * Menú de los comandos `msg-gif-*` agrupados por categoría.
 * Estructura inspirada en menu-audios.ts.
 */

type GifEntry = {emoji: string; cmd: string; desc: string};

const CARINIO: GifEntry[] = [
    {emoji: '💋', cmd: 'kiss', desc: 'Besa a alguien'},
    {emoji: '😘', cmd: 'kc', desc: 'Beso en la mejilla'},
    {emoji: '🤗', cmd: 'ab', desc: 'Abraza a alguien'},
    {emoji: '🫳', cmd: 'pat', desc: 'Palmaditas / caricia'},
    {emoji: '👅', cmd: 'lick', desc: 'Lame a alguien'},
];

const AGRESIVO: GifEntry[] = [
    {emoji: '🔪', cmd: 'kill', desc: 'Asesina a alguien'},
    {emoji: '🦷', cmd: 'bt', desc: 'Muerde a alguien'},
    {emoji: '👋', cmd: 'slap', desc: 'Cachetada / golpear'},
    {emoji: '😱', cmd: 'ap', desc: 'Agarra los cachetes'},
    {emoji: '🍑', cmd: 'spank', desc: 'Nalgeas a alguien'},
    {emoji: '🤰', cmd: 'preg', desc: 'Susto de embarazo'},
];

const ADULTO: GifEntry[] = [
    {emoji: '🔥', cmd: 'coger', desc: 'Sexo común'},
    {emoji: '🐶', cmd: 'doggystyle', desc: 'Sexo de a perrito'},
    {emoji: '🍑', cmd: 'cogeranal', desc: 'Sexo anal'},
    {emoji: '🤤', cmd: 'oral', desc: 'Sexo oral'},
    {emoji: '👯', cmd: 'trio', desc: 'Trío'},
    {emoji: '👩‍❤️‍👩', cmd: 'lesbian', desc: 'Sexo lésbico'},
];

function renderSection(title: string, entries: GifEntry[]): string {
    const lines = entries.map(e => `* ${e.emoji}  _${e.cmd}_  — ${e.desc}`).join('\n');
    return `\`<${title}/>\`\n${lines}`;
}

export default definePlugin({
    help: ['menugif'],
    tags: ['main'],
    command: /^(menu3|menugif|menugifs|menú3|menú-gif|menú-gifs|menu-gif|menu-gifs|gifs|gif)$/i,
    register: true,
    async execute(m, {conn, usedPrefix, isAdmin, isOwner, isGroupCreator}) {
    const taguser = '@' + m.sender.split('@')[0];
    const pref = usedPrefix || '#';
    const nsfwSettings = m.isGroup ? await getNsfwSettings(m.chat) : {modohorny: false, nsfwAccessMode: 'all' as const, nsfw_horario: null};
    const nsfwEnabled = canUseNsfw(nsfwSettings, {isAdmin, isOwner, isGroupCreator});
    const adultTitle = nsfwEnabled ? 'ADULTO 🔞 ACTIVO' : 'ADULTO 🔞';
    const adultHint = nsfwEnabled
        ? '> Modo horny activo para ti: estos comandos usan los GIFs explícitos de `nsfw`.'
        : nsfwSettings.modohorny
            ? `> Modo horny activo para: ${accessModeLabel(nsfwSettings.nsfwAccessMode)}. Para ti usa los GIFs normales.`
            : '> Modo horny apagado: estos comandos usan los GIFs normales.';

    const str = `\`Hola ${taguser} 💖彡\`

\`<MENU DE GIFS/>\`
> Usa el comando con el prefijo *${pref}* — etiqueta a alguien, responde a su mensaje, o úsalo sin etiquetar.

${renderSection('CARIÑO', CARINIO)}

${renderSection('AGRESIVO', AGRESIVO)}

${renderSection(adultTitle, ADULTO)}
${adultHint}

*🅛🅞🅛🅘🅑🅞🅣-🅜🅓*`.trim();

    await conn.sendMessage(m.chat, {
        text: str,
        contextInfo: {
            mentionedJid: await conn.parseMention(str),
        },
    }, {quoted: m});
    }
});
