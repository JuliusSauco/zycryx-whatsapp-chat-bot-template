import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {addWalletResource} from '../../services/wallet.service.js';
import type {ExtendedConn} from '../../types/context.js';
import {randomInt} from '../../utils/random.js';

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
    const footer = textoExtra || renderTemplate(getRequiredPluginMessage('games.ttt.turnFooter'), {
        turn: sala.turno.split('@')[0]
    });

    const msg = renderTemplate(getRequiredPluginMessage('games.ttt.state'), {
        symbol1: simboloJ1,
        player1: j1?.split('@')[0],
        symbol2: simboloJ2,
        player2: j2?.split('@')[0] || getRequiredPluginMessage('games.ttt.waitingPlayer'),
        board: renderTablero(sala.tablero),
        footer
    });

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
        if (salasTTT.size === 0) return m.reply(getRequiredPluginMessage('games.ttt.noRooms'));
        let text = getRequiredPluginMessage('games.ttt.roomsHeader');
        let count = 1;
        for (const [nombre] of salasTTT) {
            text += renderTemplate(getRequiredPluginMessage('games.ttt.roomItem'), {
                index: count++,
                room: nombre
            });
        }
        return m.reply(text.trim());
    }

    if (command === 'delttt' || command === 'deltt' || command === 'deltictactoe') {
        const salaDel = [...salasTTT.values()].find(s => s.jugadores.includes(m.sender));
        if (!salaDel) return m.reply(getRequiredPluginMessage('games.ttt.notInRoom'));
        salasTTT.delete(salaDel.nombre);
        return conn.reply(salaDel.chat, renderTemplate(getRequiredPluginMessage('games.ttt.roomDeleted'), {
            user: m.sender.split('@')[0]
        }), m, {mentions: [m.sender]});
    }

    if (customNombre) {
        let sala = salasTTT.get(customNombre);
        if (sala && sala.jugadores.includes(m.sender)) return m.reply(getRequiredPluginMessage('games.ttt.alreadyInRoom'));

        if (!sala) {
            salasTTT.set(customNombre, {
                nombre: customNombre,
                chat: m.chat,
                jugadores: [m.sender],
                tablero: [...numerosEmoji],
                turno: m.sender
            });
            return m.reply(renderTemplate(getRequiredPluginMessage('games.ttt.waitingCustom'), {
                room: customNombre
            }));
        }

        if (sala.jugadores.length >= 2) return m.reply(getRequiredPluginMessage('games.ttt.roomFull'));
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
        return m.reply(getRequiredPluginMessage('games.ttt.waitingDefault'));
    }

    if (salaLibre.jugadores.includes(m.sender)) return m.reply(getRequiredPluginMessage('games.ttt.alreadyInAnyRoom'));
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
                    texto = getRequiredPluginMessage('games.ttt.tie');
                } else {
                    const xp = randomInt(1000, 3999);
                    const ganadorId = sala.jugadores[sala.tablero[idx] === symbols[0] ? 0 : 1];
                    const perdedorId = sala.jugadores.find((j) => j !== ganadorId);
                    if (!ganadorId || !perdedorId) return;
                    await addWalletResource(ganadorId, 'exp', xp);
                    await addWalletResource(perdedorId, 'exp', -xp);
                    texto = renderTemplate(getRequiredPluginMessage('games.ttt.winner'), {
                        winner: ganadorId.split('@')[0],
                        xp
                    });
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
            m.reply(getRequiredPluginMessage('games.ttt.occupiedCell'));
        }
    }
    }
});
