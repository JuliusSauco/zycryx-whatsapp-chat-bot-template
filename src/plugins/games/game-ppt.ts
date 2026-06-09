import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {addWalletResource} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';

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
    if (cooldownRestante > 0) return conn.fakeReply(m.chat, renderTemplate(getRequiredPluginMessage('games.ppt.cooldown'), {
        time: formatDurationCompact(cooldownRestante)
    }), m.sender, getRequiredPluginMessage('games.shared.cooldownNoSpam'), 'status@broadcast');

    const opponent = m.mentionedJid?.[0];
    const input = args[0]?.toLowerCase();

    if (!opponent && isJugada(input)) {
        cooldowns.set(userId, now);
        const botJugada = pickRandom(jugadasValidas);
        const resultado = evaluar(input, botJugada);
        const xp = randomInt(500, 2499);

        let text = '';
        let result = "";
        if (resultado === 'gana') {
            await addWalletResource(userId, 'exp', xp);
            text += renderTemplate(getRequiredPluginMessage('games.ppt.winText'), {xp: formatThousandsDot(xp)});
            result = getRequiredPluginMessage('games.ppt.winStatus');
        } else if (resultado === 'pierde') {
            await addWalletResource(userId, 'exp', -xp);
            text += renderTemplate(getRequiredPluginMessage('games.ppt.loseText'), {xp: formatThousandsDot(xp)});
            result = getRequiredPluginMessage('games.ppt.loseStatus');
        } else {
            result = getRequiredPluginMessage('games.ppt.tieStatus');
            text += getRequiredPluginMessage('games.ppt.tieText');
        }

        return m.reply(renderTemplate(getRequiredPluginMessage('games.ppt.soloResult'), {
            result,
            botMove: botJugada,
            playerMove: input,
            message: text
        }));
    }

    if (opponent) {
        if (retos.has(opponent)) return m.reply(getRequiredPluginMessage('games.ppt.pendingChallenge'));
        retos.set(opponent, {
            retador: userId,
            chat: m.chat,
            timeout: setTimeout(() => {
                retos.delete(opponent);
                conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('games.ppt.challengeTimeout'), {
                    user: opponent.split('@')[0]
                }), m, {mentions: [opponent]});
            }, 60000)
        });

        return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('games.ppt.challengeInvite'), {
            challenger: m.sender.split('@')[0],
            opponent: opponent.split('@')[0]
        }), m, {mentions: [opponent]});
    }

    m.reply(renderTemplate(getRequiredPluginMessage('games.ppt.help'), {
        command: usedPrefix + command
    }));
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
            return conn.reply(chat, renderTemplate(getRequiredPluginMessage('games.ppt.challengeRejected'), {user: userId.split('@')[0]}), m, {mentions: [userId, retador]});
        }

        jugadas.set(chat, {
            jugadores: [retador, userId] as [string, string],
            eleccion: {},
            timeout: setTimeout(() => {
                jugadas.delete(chat);
                conn.reply(chat, getRequiredPluginMessage('games.ppt.duelExpired'), m);
            }, 60000)
        });

        conn.reply(chat, renderTemplate(getRequiredPluginMessage('games.ppt.challengeAccepted'), {
            challenger: retador.split('@')[0],
            opponent: userId.split('@')[0]
        }), m, {mentions: [retador, userId]});

        await conn.sendMessage(retador, {text: getRequiredPluginMessage('games.ppt.privatePrompt')});
        await conn.sendMessage(userId, {text: getRequiredPluginMessage('games.ppt.privatePrompt')});
        return;
    }

    if (isJugada(text)) {
        for (const [chat, partida] of jugadas) {
            const {jugadores, eleccion, timeout} = partida;
            if (!jugadores.includes(userId)) continue;

            eleccion[userId] = text;
            await conn.sendMessage(userId, {text: getRequiredPluginMessage('games.ppt.choiceReceived')});

            if (Object.keys(eleccion).length < 2) return;
            clearTimeout(timeout);
            jugadas.delete(chat);

            const [j1, j2] = jugadores;
            const jugada1 = eleccion[j1];
            const jugada2 = eleccion[j2];
            if (!jugada1 || !jugada2) return;
            const resultado = evaluar(jugada1, jugada2);
            const xp = randomInt(500, 2499);
            let mensaje = renderTemplate(getRequiredPluginMessage('games.ppt.duelHeader'), {
                player1: j1.split('@')[0],
                move1: jugada1,
                player2: j2.split('@')[0],
                move2: jugada2
            });

            if (resultado === 'empate') {
                mensaje += getRequiredPluginMessage('games.ppt.duelTie');
            } else {
                const ganador = resultado === 'gana' ? j1 : j2;
                const perdedor = ganador === j1 ? j2 : j1;
                await addWalletResource(ganador, 'exp', xp * 2);
                await addWalletResource(perdedor, 'exp', -xp);
                mensaje += renderTemplate(getRequiredPluginMessage('games.ppt.duelWin'), {
                    winner: ganador.split('@')[0],
                    winnerXp: formatThousandsDot(xp * 2),
                    loser: perdedor.split('@')[0],
                    loserXp: formatThousandsDot(xp)
                });
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

