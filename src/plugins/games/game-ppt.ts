import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {addWalletResource} from '../../services/wallet.service.js';
import {formatThousandsDot} from '../../utils/format.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {formatDurationCompact} from '../../utils/time.js';
import {createCooldownStore, createExpiringMap, createPendingActionStore} from '../../lib/ephemeral-state.js';
import {content} from '../../services/content.service.js';

const COOLDOWN_MS = 30_000;
const CHALLENGE_TTL_MS = 60_000;
const DUEL_TTL_MS = 60_000;
type Jugada = 'piedra' | 'papel' | 'tijera';
type Resultado = 'gana' | 'pierde' | 'empate';

interface RetoPpt {
    retador: string;
    chat: string;
    notifyExpired: (opponent: string) => Promise<unknown>;
}

interface PartidaPpt {
    jugadores: [string, string];
    eleccion: Partial<Record<string, Jugada>>;
    notifyExpired: () => Promise<unknown>;
}

const retos = createPendingActionStore<RetoPpt>({
    ttlMs: CHALLENGE_TTL_MS,
    onExpire: (opponent, reto) => {
        void reto.notifyExpired(opponent);
    },
});
const jugadas = createPendingActionStore<PartidaPpt>({
    ttlMs: DUEL_TTL_MS,
    onExpire: (_chat, partida) => {
        cleanupDuelPlayers(partida);
        void partida.notifyExpired();
    },
});
const duelChatByPlayer = createExpiringMap<string>({ttlMs: DUEL_TTL_MS});
const cooldowns = createCooldownStore({ttlMs: COOLDOWN_MS});
const jugadasValidas: Jugada[] = ['piedra', 'papel', 'tijera'];

export default defineSdkPlugin({
    help: ['ppt piedra|papel|tijera', 'ppt @usuario'],
    tags: ['game'],
    command: ['ppt', 'suit', 'pvp', 'suitpvp'],
    register: true,
    async execute(m, {conn, args, usedPrefix, command, sdk}) {
    const userId = m.sender;
    const cooldown = cooldowns.check(userId);
    if (!cooldown.allowed) return conn.fakeReply(m.chat, sdk.content.renderMessage('games.ppt.cooldown', {
        time: formatDurationCompact(cooldown.remainingMs)
    }), m.sender, sdk.content.message('games.shared.cooldownNoSpam'), 'status@broadcast');

    const opponent = m.mentionedJid?.[0];
    const input = args[0]?.toLowerCase();

    if (!opponent && isJugada(input)) {
        cooldowns.touch(userId);
        const botJugada = pickRandom(jugadasValidas);
        const resultado = evaluar(input, botJugada);
        const xp = randomInt(500, 2499);

        let text = '';
        let result = "";
        if (resultado === 'gana') {
            await addWalletResource(userId, 'exp', xp);
            text += sdk.content.renderMessage('games.ppt.winText', {xp: formatThousandsDot(xp)});
            result = sdk.content.message('games.ppt.winStatus');
        } else if (resultado === 'pierde') {
            await addWalletResource(userId, 'exp', -xp);
            text += sdk.content.renderMessage('games.ppt.loseText', {xp: formatThousandsDot(xp)});
            result = sdk.content.message('games.ppt.loseStatus');
        } else {
            result = sdk.content.message('games.ppt.tieStatus');
            text += sdk.content.message('games.ppt.tieText');
        }

        return sdk.reply.message('games.ppt.soloResult', {
            result,
            botMove: botJugada,
            playerMove: input,
            message: text
        });
    }

    if (opponent) {
        if (retos.get(opponent)) return sdk.reply.message('games.ppt.pendingChallenge');
        retos.start(opponent, {
            retador: userId,
            chat: m.chat,
            notifyExpired: (expiredOpponent) => conn.reply(m.chat, sdk.content.renderMessage('games.ppt.challengeTimeout', {
                user: expiredOpponent.split('@')[0]
            }), m, {mentions: [expiredOpponent]}),
        });

        return conn.reply(m.chat, sdk.content.renderMessage('games.ppt.challengeInvite', {
            challenger: m.sender.split('@')[0],
            opponent: opponent.split('@')[0]
        }), m, {mentions: [opponent]});
    }

    await sdk.reply.message('games.ppt.help', {
        command: usedPrefix + command
    });
    },

    async before(m, {conn}) {
    const text = m.originalText?.toLowerCase();
    const userId = m.sender;
    if (isRetoResponse(text) && retos.get(userId)) {
        const reto = retos.consume(userId);
        if (!reto) return;
        const {retador, chat} = reto;

        if (text === 'rechazar') {
            return conn.reply(chat, content.renderMessage('games.ppt.challengeRejected', {user: userId.split('@')[0]}), m, {mentions: [userId, retador]});
        }

        const partida: PartidaPpt = {
            jugadores: [retador, userId] as [string, string],
            eleccion: {},
            notifyExpired: () => conn.reply(chat, content.message('games.ppt.duelExpired'), m),
        };
        jugadas.start(chat, partida);
        duelChatByPlayer.set(retador, chat);
        duelChatByPlayer.set(userId, chat);

        conn.reply(chat, content.renderMessage('games.ppt.challengeAccepted', {
            challenger: retador.split('@')[0],
            opponent: userId.split('@')[0]
        }), m, {mentions: [retador, userId]});

        await conn.sendMessage(retador, {text: content.message('games.ppt.privatePrompt')});
        await conn.sendMessage(userId, {text: content.message('games.ppt.privatePrompt')});
        return;
    }

    if (isJugada(text)) {
        const chat = duelChatByPlayer.get(userId);
        if (!chat) return;
        const partida = jugadas.get(chat);
        if (!partida) {
            duelChatByPlayer.delete(userId);
            return;
        }
        const {jugadores, eleccion} = partida;
        if (!jugadores.includes(userId)) return;

        eleccion[userId] = text;
        await conn.sendMessage(userId, {text: content.message('games.ppt.choiceReceived')});

        if (Object.keys(eleccion).length < 2) return;
        jugadas.cancel(chat);
        cleanupDuelPlayers(partida);

        const [j1, j2] = jugadores;
        const jugada1 = eleccion[j1];
        const jugada2 = eleccion[j2];
        if (!jugada1 || !jugada2) return;
        const resultado = evaluar(jugada1, jugada2);
        const xp = randomInt(500, 2499);
        let mensaje = content.renderMessage('games.ppt.duelHeader', {
            player1: j1.split('@')[0],
            move1: jugada1,
            player2: j2.split('@')[0],
            move2: jugada2
        });

        if (resultado === 'empate') {
            mensaje += content.message('games.ppt.duelTie');
        } else {
            const ganador = resultado === 'gana' ? j1 : j2;
            const perdedor = ganador === j1 ? j2 : j1;
            await addWalletResource(ganador, 'exp', xp * 2);
            await addWalletResource(perdedor, 'exp', -xp);
            mensaje += content.renderMessage('games.ppt.duelWin', {
                winner: ganador.split('@')[0],
                winnerXp: formatThousandsDot(xp * 2),
                loser: perdedor.split('@')[0],
                loserXp: formatThousandsDot(xp)
            });
        }

        return conn.sendMessage(chat, {text: mensaje, mentions: [j1, j2]});
        }
    }
});

function isJugada(value: string | undefined): value is Jugada {
    return value === 'piedra' || value === 'papel' || value === 'tijera';
}

function isRetoResponse(value: string | undefined): value is 'aceptar' | 'rechazar' {
    return value === 'aceptar' || value === 'rechazar';
}

function cleanupDuelPlayers(partida: PartidaPpt): void {
    for (const player of partida.jugadores) {
        duelChatByPlayer.delete(player);
    }
}

function evaluar(a: Jugada, b: Jugada): Resultado {
    if (a === b) return 'empate';
    if ((a === 'piedra' && b === 'tijera') || (a === 'tijera' && b === 'papel') || (a === 'papel' && b === 'piedra')) return 'gana';
    return 'pierde';
}

