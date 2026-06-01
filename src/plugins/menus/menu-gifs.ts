import fs from 'fs';
import {definePlugin} from '../../core/define-plugin.js';

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
];

const ADULTO: GifEntry[] = [
    {emoji: '🔥', cmd: 'coger', desc: 'Sexo común'},
    {emoji: '🐶', cmd: 'doggystyle', desc: 'Sexo de a perrito'},
    {emoji: '🍑', cmd: 'cogeranal', desc: 'Sexo anal'},
    {emoji: '🤤', cmd: 'oral', desc: 'Sexo oral'},
    {emoji: '👯', cmd: 'trio', desc: 'Trío'},
    {emoji: '👩‍❤️‍👩', cmd: 'lesbian', desc: 'Sexo lésbico'},
    {emoji: '🤰', cmd: 'preg', desc: 'Embarazar'},
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
    async execute(m, {conn, usedPrefix}) {
    const nombreBot = conn.user?.name || 'Bot';
    const isPrincipal = conn === global.conn;
    const tipo = isPrincipal ? 'Bot Oficial' : 'Sub Bot';
    const taguser = '@' + m.sender.split('@')[0];
    const pref = usedPrefix || '#';

    const str = `\`Hola ${taguser} 💖彡\`

\`<MENU DE GIFS/>\`
> Usa el comando con el prefijo *${pref}* — etiqueta a alguien, responde a su mensaje, o úsalo sin etiquetar.

${renderSection('CARIÑO', CARINIO)}

${renderSection('AGRESIVO', AGRESIVO)}

${renderSection('ADULTO 🔞', ADULTO)}

*🅛🅞🅛🅘🅑🅞🅣-🅜🅓*`.trim();

    let pp: Buffer | null = null;
    try {
        pp = fs.readFileSync('./media/Menu2.jpg');
    } catch {
        pp = null;
    }

    await conn.sendMessage(m.chat, {
        text: str,
        contextInfo: {
            mentionedJid: await conn.parseMention(str),
        },
    }, {quoted: m});
    }
});
