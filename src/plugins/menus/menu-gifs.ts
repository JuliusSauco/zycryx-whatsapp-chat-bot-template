import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getNsfwSettings} from '../../services/group-settings.service.js';
import {canUseNsfwGifs} from '../../utils/nsfw-access.js';

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
    {emoji: '🪢', cmd: 'ahorcar', desc: 'Ahorca a alguien'},
    {emoji: '🦷', cmd: 'bt', desc: 'Muerde a alguien'},
    {emoji: '👋', cmd: 'slap', desc: 'Cachetada / golpear'},
    {emoji: '😱', cmd: 'ap', desc: 'Agarra los cachetes'},
    {emoji: '🍑', cmd: 'spank', desc: 'Nalgeas a alguien'},
    {emoji: '🤰', cmd: 'preg', desc: 'Susto de embarazo'},
];

const ADULTO: GifEntry[] = [
    {emoji: '6️⃣9️⃣', cmd: '69', desc: 'Posición 69 (requiere NSFW para la versión explícita)'},
    {emoji: '🔥', cmd: 'coger', desc: 'Sexo común'},
    {emoji: '🐶', cmd: 'doggystyle', desc: 'Sexo de a perrito'},
    {emoji: '🍑', cmd: 'cogeranal', desc: 'Sexo anal'},
    {emoji: '🤤', cmd: 'oral', desc: 'Sexo oral'},
    {emoji: '🫴', cmd: 'dedeo', desc: 'Dedea a alguien (versión explícita con NSFW)'},
    {emoji: '👄', cmd: 'deepthroat', desc: 'Deepthroat (versión explícita con NSFW)'},
    {emoji: '⚔️', cmd: 'espadasos', desc: 'Duelo de espadas (exclusivamente NSFW)'},
    {emoji: '🍒', cmd: 'titfuck', desc: 'Juego entre pechos (también: pajarusa, larusa, rusa)'},
    {emoji: '💦', cmd: 'venirse', desc: 'Venirse sobre alguien (versión explícita con NSFW)'},
    {emoji: '👯', cmd: 'trio', desc: 'Trío'},
    {emoji: '🥂', cmd: 'orgia', desc: 'Remitente + 3 personas (versión explícita con NSFW)'},
    {emoji: '👩‍❤️‍👩', cmd: 'lesbian', desc: 'Sexo lésbico'},
];

function renderSection(title: string, entries: GifEntry[]): string {
    const lines = entries.map(e => `* ${e.emoji}  _${e.cmd}_  — ${e.desc}`).join('\n');
    return `\`<${title}/>\`\n${lines}`;
}

export default defineSdkPlugin({
    help: ['menugif'],
    tags: ['main'],
    command: /^(menu3|menugif|menugifs|menú3|menú-gif|menú-gifs|menu-gif|menu-gifs|gifs|gif)$/i,
    register: true,
    async execute(m, {conn, usedPrefix, isAdmin, isOwner, isGroupCreator}) {
    const taguser = '@' + m.sender.split('@')[0];
    const pref = usedPrefix || '#';
    const nsfwSettings = m.isGroup ? await getNsfwSettings(m.chat) : {modohorny: false, nsfwAccessMode: 'owner' as const, nsfwGifEnabled: false, nsfwGifAccessMode: 'owner' as const, nsfw_horario: null};
    const nsfwEnabled = canUseNsfwGifs(nsfwSettings, {isAdmin, isOwner, isGroupCreator});
    const adultTitle = nsfwEnabled ? 'ADULTO 🔞 ACTIVO' : 'ADULTO 🔞';
    const adultHint = nsfwEnabled
        ? '> Modo horny activo para ti: estos comandos usan los GIFs explícitos de `nsfw`.'
        : '> GIFs NSFW desactivados o restringidos para tu nivel; las reacciones compatibles usan su versión normal.';

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
