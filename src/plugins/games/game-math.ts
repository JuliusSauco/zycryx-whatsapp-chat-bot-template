import {botInfo} from "../../core/config.js";
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {addWalletResource} from '../../services/wallet.service.js';
import {pickRandom, randomInt} from '../../utils/random.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import type {BotMessage} from '../../types/message.js';
import type {ExtendedConn} from '../../types/context.js';
import {content} from '../../services/content.service.js';

type MathOperator = '+' | '-' | '*' | '/';
type DifficultyKey = keyof typeof dificultades;

interface MathGame {
    result: number;
    exp: number;
    intentos: number;
    chat: string;
    message: BotMessage;
    conn: ExtendedConn;
}

const mathGames = createExpiringMap<MathGame>({
    ttlMs: 40_000,
    onExpire: async (_sender, game) => {
        await game.conn.reply(game.chat, content.renderMessage('games.math.timeout', {
            result: game.result,
        }), game.message);
    },
});

const dificultades = {
    noob: {ops: ['+', '-'], min: 1, max: 10, tiempo: 15000, exp: [300, 600]},
    easy: {ops: ['+', '-', '*'], min: 10, max: 30, tiempo: 20000, exp: [600, 1000]},
    medium: {ops: ['+', '-', '*'], min: 30, max: 70, tiempo: 25000, exp: [1000, 1500]},
    hard: {ops: ['+', '-', '*'], min: 70, max: 120, tiempo: 30000, exp: [1500, 2000]},
    extreme: {ops: ['+', '-', '*', '/'], min: 100, max: 250, tiempo: 35000, exp: [2000, 3000]},
    impossible: {ops: ['+', '-', '*', '/'], min: 200, max: 999, tiempo: 40000, exp: [3000, 5000]}
} satisfies Record<string, {ops: MathOperator[]; min: number; max: number; tiempo: number; exp: [number, number]}>;

export default defineSdkPlugin({
    help: ['math [dificultad]'],
    tags: ['game'],
    command: ['math', 'mates', 'matemáticas'],
    register: true,
    async execute(m, {conn, args, branding, sdk}) {
    const dificultad = (args[0] || '').toLowerCase();
    if (!isDifficultyKey(dificultad)) {
        return sdk.reply.message('games.math.invalidDifficulty', {
            difficulties: Object.keys(dificultades).map(k => `- ${k}`).join('\n')
        });
    }

    const nivel = dificultades[dificultad];
    const a = randomInt(nivel.min, nivel.max);
    const b = randomInt(nivel.min, nivel.max);
    const op = pickRandom(nivel.ops);
    const result = calculate(a, b, op);
    const recompensa = randomInt(nivel.exp[0], nivel.exp[1]);
    mathGames.set(m.sender, {result, exp: recompensa, intentos: 3, chat: m.chat, message: m, conn}, nivel.tiempo);
    return sdk.reply.message('games.math.question', {
        watermark: branding.watermark,
        a,
        operator: op,
        b,
        seconds: nivel.tiempo / 1000,
        reward: recompensa,
        version: botInfo.vs
    });
    },

    async before(m) {
    const data = mathGames.get(m.sender);
    if (!data) return;
    const {result, exp} = data;
    const entrada = m.originalText.trim();
    let correcta = false;
    if (String(result).includes('.') || entrada.includes('.')) {
        correcta = parseFloat(entrada).toFixed(2) === result.toFixed(2);
    } else {
        correcta = Number(entrada) === result;
    }

    if (correcta) {
        mathGames.delete(m.sender);
        await addWalletResource(m.sender, 'exp', exp, 'game_reward', 'math');
        return m.reply(content.renderMessage('games.math.correct', {exp}));
    } else {
        data.intentos--;
        if (data.intentos <= 0) {
            mathGames.delete(m.sender);
            return m.reply(content.renderMessage('games.math.failed', {result}));
        } else {
            mathGames.set(m.sender, data, mathGames.remainingMs(m.sender));
            return m.reply(content.renderMessage('games.math.incorrect', {attempts: data.intentos}));
        }
    }
    }
});

function isDifficultyKey(value: string): value is DifficultyKey {
    return value in dificultades;
}

function calculate(a: number, b: number, op: MathOperator): number {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    return parseFloat((a / b).toFixed(2));
}
