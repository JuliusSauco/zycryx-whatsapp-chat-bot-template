import {logError} from '../../lib/logger.js';
import similarity from 'similarity';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {addWalletResource} from '../../services/wallet.service.js';
import type {proto} from '@whiskeysockets/baileys';
import {getCachedJson} from '../../lib/static-resource-cache.js';
import {pickRandom} from '../../utils/random.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import type {ExtendedConn} from '../../types/context.js';
import {content} from '../../services/content.service.js';
import {generateGuessQuestion} from '../../providers/ai/guess-question.provider.js';

const timeout = 50000;
const timeout2 = 20000;
const poin = 500;
const threshold = 0.72;

type GameType = 'acertijo' | 'pelicula' | 'trivia';

interface GuessQuestion {
    question: string;
    response: string;
}

interface ActiveGuessGame {
    tipo: GameType;
    pregunta: GuessQuestion;
    caption: proto.WebMessageInfo;
    puntos: number;
    intentos: number;
    chat: string;
    conn: ExtendedConn;
}

const juegos = createExpiringMap<ActiveGuessGame>({
    ttlMs: timeout,
    onExpire: async (_id, juego) => {
        await juego.conn.reply(juego.chat, content.renderMessage('fun.guess.timeout', {
            answer: juego.pregunta.response,
        }), juego.caption);
    },
});
const preguntasUsadas = new Set<string>();

const archivosRespaldo: Record<GameType, string> = {
    acertijo: "acertijo.json",
    pelicula: "peliculas.json",
    trivia: "trivia.json"
};

const prompts: Record<GameType, string> = {
    acertijo: content.message('fun.guess.prompts.acertijo'),
    pelicula: content.message('fun.guess.prompts.pelicula'),
    trivia: content.message('fun.guess.prompts.trivia'),
};

async function obtenerPregunta(tipo: GameType): Promise<GuessQuestion | null> {
    const prompt = prompts[tipo];

    for (let i = 0; i < 6; i++) {
        try {
            const generated = await generateGuessQuestion(prompt);
            if (generated && !preguntasUsadas.has(generated.question)) {
                preguntasUsadas.add(generated.question);
                return generated;
            }
        } catch (e: unknown) {
            logError('[IA backup]', e instanceof Error ? e.message : e);
        }
    }

    try {
        const archivo = `./resources/data/game/${archivosRespaldo[tipo]}`;
        const data = getCachedJson<GuessQuestion[]>(archivo) || [];
        const pregunta = pickRandom(data);
        if (!pregunta?.question || !pregunta.response) return null;
        preguntasUsadas.add(pregunta.question);
        return pregunta;
    } catch (e: unknown) {
        logError('Respaldo fallido', e);
        return null;
    }
}

export default defineSdkPlugin({
    help: ['acertijo', 'pelicula', 'trivia'],
    tags: ['game'],
    command: /^(acertijo|acert|adivinanza|tekateki|pelicula|adv|trivia)$/i,
    register: true,
    async execute(m, {conn, command, sdk}) {
    const id = m.chat;
    if (juegos.has(id)) return sdk.reply.message('fun.guess.active');

    const tipo = getGameType(command);
    if (!tipo) return;
    const pregunta = await obtenerPregunta(tipo);
    if (!pregunta) return sdk.reply.message('fun.guess.generationFailed');
    const tiempo = tipo === 'trivia' ? timeout2 : timeout;
    const texto = sdk.content.renderMessage('fun.guess.question', {
        question: pregunta.question,
        seconds: String(tiempo / 1000),
        points: String(poin),
    });
    const enviado = await conn.sendMessage(m.chat, {text: texto}, {quoted: m});

    juegos.set(id, {
        tipo,
        pregunta,
        caption: enviado,
        puntos: poin,
        intentos: 3,
        chat: m.chat,
        conn,
    }, tiempo)
    },

    async before(m) {
    const id = m.chat;
    const juego = juegos.get(id);
    if (!juego || !m.quoted?.key?.id || !juego.caption?.key?.id || m.quoted.key.id !== juego.caption.key.id) return;

    const correcta = juego.pregunta.response.toLowerCase().trim();
    const userInput = m.originalText.toLowerCase().trim();
    const esCorrecta = userInput === correcta || similarity(userInput, correcta) >= threshold;

    if (esCorrecta) {
        await addWalletResource(m.sender, 'exp', juego.puntos, 'game_reward', 'adivinar');
        m.reply(content.renderMessage('fun.guess.correct', {points: String(juego.puntos)}));
        juegos.delete(id);
    } else {
        juego.intentos--;
        if (juego.intentos <= 0) {
            m.reply(content.renderMessage('fun.guess.failed', {answer: juego.pregunta.response}));
            juegos.delete(id);
        } else {
            juegos.set(id, juego, juegos.remainingMs(id));
            m.reply(content.renderMessage('fun.guess.incorrect', {attempts: String(juego.intentos)}));
        }
    }
    }
});

function getGameType(command: string): GameType | null {
    if (/acert/i.test(command)) return 'acertijo';
    if (/pelicula|adv/i.test(command)) return 'pelicula';
    if (/trivia/i.test(command)) return 'trivia';
    return null;
}
