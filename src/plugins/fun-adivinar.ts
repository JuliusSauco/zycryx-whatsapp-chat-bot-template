import fs from 'fs';
import fetch from 'node-fetch';
// @ts-ignore
import similarity from 'similarity';
import {definePlugin} from '../core/define-plugin.js';
import {addWalletResource} from '../services/wallet.service.js';

const timeout = 50000;
const timeout2 = 20000;
const poin = 500;
const threshold = 0.72;
const juegos = {};
const preguntasUsadas = new Set();

const archivosRespaldo = {
    acertijo: "acertijo.json",
    pelicula: "peliculas.json",
    trivia: "trivia.json"
};

async function obtenerPregunta(tipo: any) {
    // @ts-ignore
    const prompt = {
        acertijo: "Genera un acertijo con su respuesta en formato JSON: {\"question\": \"<pregunta>\", \"response\": \"<respuesta>\"}.",
        pelicula: "Genera un juego de adivinar película con emojis como pista, formato JSON: {\"question\": \"<pregunta>\", \"response\": \"<respuesta>\"}.",
        trivia: "Genera una trivia en formato JSON: {\"question\": \"<pregunta>\\n\\nA) ...\\nB) ...\\nC) ...\", \"response\": \"<letra correcta>\"}."
    }[tipo];

    for (let i = 0; i < 6; i++) {
        try {
            if (!info.neoxr.key) throw new Error('NEOXR_API_KEY no configurado');
            const res = await fetch(`${info.neoxr.url}/gptweb?text=${encodeURIComponent(prompt)}&apikey=${info.neoxr.key}`);
            if (!res.ok || res.headers.get('content-type')?.includes('text/html')) throw new Error(`Invalid API response (${res.status})`);
            const json = await res.json() as any;
            if (json?.data) {
                const match = json.data.match(/```json\s*([\s\S]*?)\s*```/);
                const clean = match ? match[1] : json.data;
                const obj = JSON.parse(clean);
                if (obj.question && obj.response && !preguntasUsadas.has(obj.question)) {
                    preguntasUsadas.add(obj.question);
                    return obj;
                }
            }
        } catch (e: any) {
            console.error('[IA backup]', e.message || e);
        }
    }

    try {
        // @ts-ignore
        const archivo = `./src/game/${archivosRespaldo[tipo]}`;
        // @ts-ignore
        const data = JSON.parse(fs.readFileSync(archivo));
        const pregunta = data[Math.floor(Math.random() * data.length)];
        preguntasUsadas.add(pregunta.question);
        return pregunta;
    } catch (e: any) {
        console.error('Respaldo fallido', e);
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
    // @ts-ignore
    if (juegos[id]) return conn.reply(m.chat, '⚠️ Ya hay un juego activo en este chat.', m);

    const tipo = /acert/i.test(command) ? 'acertijo' : /pelicula|adv/i.test(command) ? 'pelicula' : /trivia/i.test(command) ? 'trivia' : null;
    if (!tipo) return;
    const pregunta = await obtenerPregunta(tipo);
    if (!pregunta) return m.reply('❌ No se pudo generar la pregunta.');
    const tiempo = tipo === 'trivia' ? timeout2 : timeout;
    const texto = `${pregunta.question}

*• Tiempo:* ${tiempo / 1000}s\n*• Bono:* +${poin} XP`;
    const enviado = await conn.sendMessage(m.chat, {text: texto}, {quoted: m});

    // @ts-ignore
    juegos[id] = {
        tipo,
        pregunta,
        caption: enviado,
        puntos: poin,
        intentos: 3,
        timeout: setTimeout(() => {
            // @ts-ignore
            if (juegos[id]) {
                conn.reply(m.chat, `⏳ Se acabó el tiempo.\n*Respuesta:* ${pregunta.response}`, enviado);
                // @ts-ignore
                delete juegos[id];
            }
        }, tiempo)
    }
    },

    async before(m: any, {conn}: any) {
    const id = m.chat;
    // @ts-ignore
    if (!juegos[id] || !m.quoted?.key?.id || !juegos[id].caption?.key?.id || m.quoted.key.id !== juegos[id].caption.key.id) return;

    // @ts-ignore
    const juego = juegos[id];
    const correcta = juego.pregunta.response.toLowerCase().trim();
    const userInput = m.originalText.toLowerCase().trim();
    const esCorrecta = userInput === correcta || similarity(userInput, correcta) >= threshold;

    if (esCorrecta) {
        await addWalletResource(m.sender, 'exp', juego.puntos);
        m.reply(`✅ *¡Correcto!*\nGanaste +${juego.puntos} XP`);
        clearTimeout(juego.timeout);
        // @ts-ignore
        delete juegos[id];
    } else {
        juego.intentos--;
        if (juego.intentos <= 0) {
            m.reply(`❌ Fallaste 3 veces. La respuesta era: *${juego.pregunta.response}*`);
            clearTimeout(juego.timeout);
            // @ts-ignore
            delete juegos[id];
        } else {
            m.reply(`❌ Incorrecto. Te quedan *${juego.intentos}* intento(s).`);
        }
    }
    }
});
