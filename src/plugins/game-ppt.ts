import {definePlugin} from '../core/define-plugin.js';
import {addWalletResource} from '../services/wallet.service.js';

const cooldown = 30_000;
type Jugada = 'piedra' | 'papel' | 'tijera';
type Resultado = 'gana' | 'pierde' | 'empate';

interface RetoPpt {
    retador: string;
    chat: string;
    timeout: ReturnType<typeof setTimeout>;
}

interface PartidaPpt {
    jugadores: [string, string];
    eleccion: Partial<Record<string, Jugada>>;
    timeout: ReturnType<typeof setTimeout>;
}

const retos = new Map<string, RetoPpt>();
const jugadas = new Map<string, PartidaPpt>();
const cooldowns = new Map<string, number>();
const jugadasValidas: Jugada[] = ['piedra', 'papel', 'tijera'];

export default definePlugin({
    help: ['ppt piedra|papel|tijera', 'ppt @usuario'],
    tags: ['game'],
    command: ['ppt', 'suit', 'pvp', 'suitpvp'],
    register: true,
    async execute(m, {conn, args, usedPrefix, command}) {
    const now = Date.now();
    const userId = m.sender;
    const cooldownRestante = (cooldowns.get(userId) || 0) + cooldown - now;
    if (cooldownRestante > 0) return conn.fakeReply(m.chat, `*🕓 𝙃𝙚𝙮, 𝙀𝙨𝙥𝙚𝙧𝙖 ${msToTime(cooldownRestante)} 𝙖𝙣𝙩𝙚𝙨 𝙙𝙚 𝙪𝙨𝙖𝙧 𝙤𝙩𝙧𝙤𝙨 𝙘𝙤𝙢𝙖𝙣𝙙𝙤*`, m.sender, `ᴺᵒ ʰᵃᵍᵃⁿ ˢᵖᵃᵐ`, 'status@broadcast');

    const opponent = m.mentionedJid?.[0];
    const input = args[0]?.toLowerCase();

    if (!opponent && isJugada(input)) {
        cooldowns.set(userId, now);
        const botJugada = jugadasValidas[Math.floor(Math.random() * 3)];
        const resultado = evaluar(input, botJugada);
        const xp = Math.floor(Math.random() * 2000) + 500;

        let text = '';
        let result = "";
        if (resultado === 'gana') {
            await addWalletResource(userId, 'exp', xp);
            text += `✅ *Ganaste* y obtuviste *${formatNumber(xp)} XP*`;
            result = '𝙃𝘼 𝙂𝘼𝙉𝘼𝘿𝙊! 🎉';
        } else if (resultado === 'pierde') {
            await addWalletResource(userId, 'exp', -xp);
            text += `❌ *Perdiste*. Te quitaron *${formatNumber(xp)} XP*`;
            result = '𝙃𝘼 𝙋𝙀𝙍𝘿𝙄𝘿𝙊! 🤡';
        } else {
            result = '𝙀𝙈𝙋𝘼𝙏𝙀 🤝';
            text += `🤝 *Empate*. No ganaste ni perdiste XP.`;
        }

        return m.reply(`\`「 ${result} 」\`\n\n👉 El Bot: ${botJugada}\n👉 Tú: ${input}\n` + text);
    }

    if (opponent) {
        if (retos.has(opponent)) return m.reply('⚠️ Ese usuario ya tiene un reto pendiente.');
        retos.set(opponent, {
            retador: userId,
            chat: m.chat,
            timeout: setTimeout(() => {
                retos.delete(opponent);
                conn.reply(m.chat, `⏳ 𝙏𝙄𝙀𝙈𝙋𝙊 𝘼𝙂𝙊𝙏𝘼𝘿𝙊, 𝙀𝙇 𝙋𝙑𝙋 𝙎𝙀 𝘾𝘼𝙉𝘾𝙀𝙇𝘼 𝙋𝙊𝙍 𝙁𝘼𝙇𝙏𝘼 𝘿𝙀 𝙍𝙀𝙎𝙋𝙐𝙀𝙎𝙏𝘼 𝘿𝙀 ${opponent.split('@')[0]}`, m, {mentions: [opponent]});
            }, 60000)
        });

        return conn.reply(m.chat, `🎮👾 𝙋𝙑𝙋 - 𝙋𝙄𝙀𝘿𝙍𝘼, 𝙋𝘼𝙋𝙀𝙇 𝙊 𝙏𝙄𝙅𝙀𝙍𝘼 👾🎮\n\n@${m.sender.split('@')[0]} 𝘿𝙀𝙎𝘼𝙁𝙄𝘼 𝘼 @${opponent.split('@')[0]}.\n\n> _*Escribe (aceptar) para aceptar*_\n> _*Escribe (rechazar) para rechazar*_`, m, {mentions: [opponent]});
    }

    m.reply(`𝐏𝐢𝐞𝐝𝐫𝐚 🗿, 𝐏𝐚𝐩𝐞𝐥 📄 𝐨 𝐓𝐢𝐣𝐞𝐫𝐚 ✂️\n\n👾 𝙅𝙪𝙜𝙖𝙧 𝙘𝙤𝙣 𝙚𝙡 𝙗𝙤𝙩:\n• ${usedPrefix + command} piedra\n• ${usedPrefix + command} papel\n• ${usedPrefix + command} tijera\n\n🕹 𝙅𝙪𝙜𝙖𝙧 𝙘𝙤𝙣 𝙪𝙣 𝙪𝙨𝙪𝙖𝙧𝙞𝙤:\n${usedPrefix + command} @0`);
    },

    async before(m, {conn}) {
    const text = m.originalText?.toLowerCase();
    const userId = m.sender;
    if (isRetoResponse(text) && retos.has(userId)) {
        const reto = retos.get(userId);
        if (!reto) return;
        const {retador, chat, timeout} = reto;
        clearTimeout(timeout);
        retos.delete(userId);

        if (text === 'rechazar') {
            return conn.reply(chat, `⚠️ @${userId.split('@')[0]} rechazó el reto.`, m, {mentions: [userId, retador]});
        }

        jugadas.set(chat, {
            jugadores: [retador, userId] as [string, string],
            eleccion: {},
            timeout: setTimeout(() => {
                jugadas.delete(chat);
                conn.reply(chat, `⏰ El duelo expiró por inactividad.`, m);
            }, 60000)
        });

        conn.reply(chat, `✅ Reto aceptado. Las opciones serán enviadas por privado a @${retador.split('@')[0]} y @${userId.split('@')[0]}.`, m, {mentions: [retador, userId]});

        await conn.sendMessage(retador, {text: '✊🖐✌️ Escribe *piedra*, *papel* o *tijera* para elegir tu jugada.'});
        await conn.sendMessage(userId, {text: '✊🖐✌️ Escribe *piedra*, *papel* o *tijera* para elegir tu jugada.'});
        return;
    }

    if (isJugada(text)) {
        for (const [chat, partida] of jugadas) {
            const {jugadores, eleccion, timeout} = partida;
            if (!jugadores.includes(userId)) continue;

            eleccion[userId] = text;
            await conn.sendMessage(userId, {text: '✅ Elección recibida. Vuelve al grupo y espera el resultado.'});

            if (Object.keys(eleccion).length < 2) return;
            clearTimeout(timeout);
            jugadas.delete(chat);

            const [j1, j2] = jugadores;
            const jugada1 = eleccion[j1];
            const jugada2 = eleccion[j2];
            if (!jugada1 || !jugada2) return;
            const resultado = evaluar(jugada1, jugada2);
            const xp = Math.floor(Math.random() * 2000) + 500;
            let mensaje = `✊🖐✌️ *Piedra, Papel o Tijera*\n\n@${j1.split('@')[0]} eligió: *${jugada1}*\n@${j2.split('@')[0]} eligió: *${jugada2}*\n\n`;

            if (resultado === 'empate') {
                mensaje += '🤝 ¡Empate! Nadie gana ni pierde XP.';
            } else {
                const ganador = resultado === 'gana' ? j1 : j2;
                const perdedor = ganador === j1 ? j2 : j1;
                await addWalletResource(ganador, 'exp', xp * 2);
                await addWalletResource(perdedor, 'exp', -xp);
                mensaje += `🎉 @${ganador.split('@')[0]} gana *${formatNumber(xp * 2)} XP*\n💀 @${perdedor.split('@')[0]} pierde *${formatNumber(xp)} XP*`;
            }

            return conn.sendMessage(chat, {text: mensaje, mentions: [j1, j2]});
        }
    }
    }
});

function isJugada(value: string | undefined): value is Jugada {
    return value === 'piedra' || value === 'papel' || value === 'tijera';
}

function isRetoResponse(value: string | undefined): value is 'aceptar' | 'rechazar' {
    return value === 'aceptar' || value === 'rechazar';
}

function evaluar(a: Jugada, b: Jugada): Resultado {
    if (a === b) return 'empate';
    if ((a === 'piedra' && b === 'tijera') || (a === 'tijera' && b === 'papel') || (a === 'papel' && b === 'piedra')) return 'gana';
    return 'pierde';
}

function formatNumber(n: number) {
    return n.toLocaleString('en').replace(/,/g, '.');
}

function msToTime(ms: number) {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    return `${m ? `${m}m ` : ''}${s}s`;
}
