import {definePlugin} from '../core/define-plugin.js';
import {addWalletResource} from '../services/wallet.service.js';
import type {ExtendedConn} from '../types/context.js';

type TttSymbol = '❌' | '⭕';
type BoardCell = TttSymbol | string;
type TttResult = TttSymbol | 'empate' | null;

interface SalaTTT {
    nombre: string;
    chat: string;
    jugadores: string[];
    tablero: BoardCell[];
    turno: string;
}

const salasTTT = new Map<string, SalaTTT>();
const symbols: [TttSymbol, TttSymbol] = ['❌', '⭕'];
const numerosEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

function renderTablero(tablero: BoardCell[]) {
    return `
     ${tablero.slice(0, 3).join('')}
     ${tablero.slice(3, 6).join('')}
     ${tablero.slice(6).join('')}`;
}

function verificarGanador(tablero: BoardCell[]): TttResult {
    const combinaciones = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of combinaciones) {
        if (tablero[a] === tablero[b] && tablero[b] === tablero[c]) {
            return isTttSymbol(tablero[a]) ? tablero[a] : null;
        }
    }
    return tablero.every((x) => x === '❌' || x === '⭕') ? 'empate' : null;
}

function isTttSymbol(value: BoardCell): value is TttSymbol {
    return value === '❌' || value === '⭕';
}

async function enviarEstado(conn: ExtendedConn, sala: SalaTTT, textoExtra = '') {
    const [j1, j2] = sala.jugadores;
    const simboloJ1 = symbols[0];
    const simboloJ2 = symbols[1];

    const msg = `💖 𝙅𝙪𝙚𝙜𝙤 𝙩𝙖𝙩𝙚𝙩𝙞
🫂 𝙅𝙪𝙜𝙖𝙙𝙤𝙧𝙚𝙨:
*┈┈┈┈┈┈┈┈┈*
${simboloJ1} = @${j1?.split('@')[0]}
${simboloJ2} = @${j2?.split('@')[0] || 'esperando'}
*┈┈┈┈┈┈┈┈┈*${renderTablero(sala.tablero)}
*┈┈┈┈┈┈┈┈┈*
${textoExtra ? `
${textoExtra}` : `𝙏𝙪𝙧𝙣𝙤 𝙙𝙚:
@${sala.turno.split('@')[0]}`}`;

    await conn.sendMessage(sala.chat, {text: msg, mentions: sala.jugadores});
}

export default definePlugin({
    help: ['ttt', 'ttt nombre', 'delttt', 'tttlist'],
    tags: ['game'],
    command: ['ttt', 'ttc', 'tictactoe', 'delttt', 'tttlist', 'deltt', 'deltictactoe'],
    register: true,
    async execute(m, {conn, args, command}) {
    const customNombre = args[0]?.toLowerCase();

    if (command === 'tttlist') {
        if (salasTTT.size === 0) return m.reply('⚠️ No hay salas activas actualmente.');
        let text = '🎮 *Salas activas:*';
        let count = 1;
        for (const [nombre] of salasTTT) {
            text += `\n\n${count++}- *${nombre}*\nIngresa con: /ttt ${nombre}`;
        }
        return m.reply(text.trim());
    }

    if (command === 'delttt' || command === 'deltt' || command === 'deltictactoe') {
        const salaDel = [...salasTTT.values()].find(s => s.jugadores.includes(m.sender));
        if (!salaDel) return m.reply('⚠️ No estás en ninguna sala activa.');
        salasTTT.delete(salaDel.nombre);
        return conn.reply(salaDel.chat, `❌ La sala fue eliminada por @${m.sender.split('@')[0]}.`, m, {mentions: [m.sender]});
    }

    if (customNombre) {
        let sala = salasTTT.get(customNombre);
        if (sala && sala.jugadores.includes(m.sender)) return m.reply('⚠️ Ya estás en esta sala.');

        if (!sala) {
            salasTTT.set(customNombre, {
                nombre: customNombre,
                chat: m.chat,
                jugadores: [m.sender],
                tablero: [...numerosEmoji],
                turno: m.sender
            });
            return m.reply(`🏃 Esperando oponente para *${customNombre}*.\nUsa: /ttt ${customNombre}`);
        }

        if (sala.jugadores.length >= 2) return m.reply('⚠️ Esta sala ya tiene 2 jugadores.');
        sala.jugadores.push(m.sender);
        salasTTT.set(customNombre, sala);
        return await enviarEstado(conn, sala);
    }

    let salaLibre = [...salasTTT.values()].find(s => s.jugadores.length === 1 && !s.nombre.startsWith('sala-'));
    if (!salaLibre) {
        const nuevaNombre = `p${Date.now()}`;
        salasTTT.set(nuevaNombre, {
            nombre: nuevaNombre,
            chat: m.chat,
            jugadores: [m.sender],
            tablero: [...numerosEmoji],
            turno: m.sender
        });
        return m.reply(`🏃 Esperando oponente...
Usa: /ttt para unirte.`);
    }

    if (salaLibre.jugadores.includes(m.sender)) return m.reply('⚠️ Ya estás en una sala.');
    salaLibre.jugadores.push(m.sender);
    salasTTT.set(salaLibre.nombre, salaLibre);
    return await enviarEstado(conn, salaLibre);
    },

    async before(m, {conn}) {
    const numero = parseInt(m.originalText.trim());
    if (!numero || numero < 1 || numero > 9) return;

    for (const [nombre, sala] of salasTTT) {
        if (!sala.jugadores.includes(m.sender)) continue;
        if (sala.turno !== m.sender) return;
        const idx = numero - 1;
        if (sala.tablero[idx] !== symbols[0] && sala.tablero[idx] !== symbols[1]) {
            sala.tablero[idx] = sala.jugadores.indexOf(m.sender) === 0 ? symbols[0] : symbols[1];
            const ganador = verificarGanador(sala.tablero);

            if (ganador) {
                let texto = '';
                if (ganador === 'empate') {
                    texto = '🤝 ¡Empate! Buen juego.';
                } else {
                    const xp = Math.floor(Math.random() * 3000) + 1000;
                    const ganadorId = sala.jugadores[sala.tablero[idx] === symbols[0] ? 0 : 1];
                    const perdedorId = sala.jugadores.find((j) => j !== ganadorId);
                    if (!ganadorId || !perdedorId) return;
                    await addWalletResource(ganadorId, 'exp', xp);
                    await addWalletResource(perdedorId, 'exp', -xp);
                    texto = `🎉 @${ganadorId.split('@')[0]} *ganarte* y recibe *${xp} XP*!`;
                }
                await enviarEstado(conn, sala, texto);
                salasTTT.delete(nombre);
                return;
            }

            const nextTurn = sala.jugadores.find((j) => j !== m.sender);
            if (!nextTurn) return;
            sala.turno = nextTurn;
            await enviarEstado(conn, sala);
        } else {
            m.reply('❌ Esa casilla ya está ocupada.');
        }
    }
    }
});
