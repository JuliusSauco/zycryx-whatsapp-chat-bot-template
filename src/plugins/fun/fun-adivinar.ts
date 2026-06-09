import {logError} from '../../lib/logger.js';
import similarity from 'similarity';
import {definePlugin} from '../../core/define-plugin.js';
import {addWalletResource} from '../../services/wallet.service.js';
import type {proto} from '@whiskeysockets/baileys';
import {httpRequest} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {getCachedJson} from '../../lib/static-resource-cache.js';
import {pickRandom} from '../../utils/random.js';

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
    timeout: ReturnType<typeof setTimeout>;
}

interface NeoxrGptResponse {
    data?: string;
}

const juegos: Record<string, ActiveGuessGame> = {};
const preguntasUsadas = new Set<string>();

const archivosRespaldo: Record<GameType, string> = {
    acertijo: "acertijo.json",
    pelicula: "peliculas.json",
    trivia: "trivia.json"
};

const prompts: Record<GameType, string> = {
    acertijo: getRequiredPluginMessage('fun.guess.prompts.acertijo'),
    pelicula: getRequiredPluginMessage('fun.guess.prompts.pelicula'),
    trivia: getRequiredPluginMessage('fun.guess.prompts.trivia'),
};

async function obtenerPregunta(tipo: GameType): Promise<GuessQuestion | null> {
    const prompt = prompts[tipo];

    for (let i = 0; i < 6; i++) {
        try {
            if (!info.neoxr.key) throw new Error('NEOXR_API_KEY no configurado');
            const res = await httpRequest(`${info.neoxr.url}/gptweb?text=${encodeURIComponent(prompt)}&apikey=${info.neoxr.key}`);
            if (res.headers.get('content-type')?.includes('text/html')) throw new Error(`Invalid API response (${res.status})`);
            const json = await res.json() as NeoxrGptResponse;
            if (json?.data) {
                const match = json.data.match(/```json\s*([\s\S]*?)\s*```/);
                const clean = match ? match[1] : json.data;
                const obj = JSON.parse(clean) as Partial<GuessQuestion>;
                if (obj.question && obj.response && !preguntasUsadas.has(obj.question)) {
                    preguntasUsadas.add(obj.question);
                    return {question: obj.question, response: obj.response};
                }
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

export default definePlugin({
    help: ['acertijo', 'pelicula', 'trivia'],
    tags: ['game'],
    command: /^(acertijo|acert|adivinanza|tekateki|pelicula|adv|trivia)$/i,
    register: true,
    async execute(m, {conn, command}) {
    const id = m.chat;
    if (juegos[id]) return conn.reply(m.chat, getRequiredPluginMessage('fun.guess.active'), m);

    const tipo = getGameType(command);
    if (!tipo) return;
    const pregunta = await obtenerPregunta(tipo);
    if (!pregunta) return m.reply(getRequiredPluginMessage('fun.guess.generationFailed'));
    const tiempo = tipo === 'trivia' ? timeout2 : timeout;
    const texto = renderTemplate(getRequiredPluginMessage('fun.guess.question'), {
        question: pregunta.question,
        seconds: String(tiempo / 1000),
        points: String(poin),
    });
    const enviado = await conn.sendMessage(m.chat, {text: texto}, {quoted: m});

    juegos[id] = {
        tipo,
        pregunta,
        caption: enviado,
        puntos: poin,
        intentos: 3,
        timeout: setTimeout(() => {
            if (juegos[id]) {
                conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('fun.guess.timeout'), {answer: pregunta.response}), enviado);
                delete juegos[id];
            }
        }, tiempo)
    }
    },

    async before(m) {
    const id = m.chat;
    const juego = juegos[id];
    if (!juego || !m.quoted?.key?.id || !juego.caption?.key?.id || m.quoted.key.id !== juego.caption.key.id) return;

    const correcta = juego.pregunta.response.toLowerCase().trim();
    const userInput = m.originalText.toLowerCase().trim();
    const esCorrecta = userInput === correcta || similarity(userInput, correcta) >= threshold;

    if (esCorrecta) {
        await addWalletResource(m.sender, 'exp', juego.puntos);
        m.reply(renderTemplate(getRequiredPluginMessage('fun.guess.correct'), {points: String(juego.puntos)}));
        clearTimeout(juego.timeout);
        delete juegos[id];
    } else {
        juego.intentos--;
        if (juego.intentos <= 0) {
            m.reply(renderTemplate(getRequiredPluginMessage('fun.guess.failed'), {answer: juego.pregunta.response}));
            clearTimeout(juego.timeout);
            delete juegos[id];
        } else {
            m.reply(renderTemplate(getRequiredPluginMessage('fun.guess.incorrect'), {attempts: String(juego.intentos)}));
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
