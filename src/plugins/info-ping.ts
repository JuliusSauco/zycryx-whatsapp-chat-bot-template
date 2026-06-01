import {definePlugin} from '../core/define-plugin.js';

interface TimestampLike {
    toNumber?: () => number;
}

export default definePlugin({
    command: ['ping', 'p'],
    help: ['ping'],
    tags: ['main'],
    async execute(m, {conn}) {
        const start = performance.now();
        const receiveLatency = getMessageLatencyMs(m.messageTimestamp);
        const processMs = Math.round(performance.now() - start);
        const latencyText = receiveLatency === null ? '' : `\n📥 Recepción: *${receiveLatency}ms*`;
        await conn.sendMessage(m.chat, {text: `🏓 *Pong!*\n⚙️ Proceso: *${processMs}ms*${latencyText}`}, {quoted: m});
    }
});

function getMessageLatencyMs(timestamp: unknown): number | null {
    const seconds = getTimestampSeconds(timestamp);
    if (!seconds) return null;
    const ms = Date.now() - seconds * 1000;
    return ms >= 0 ? Math.round(ms) : null;
}

function getTimestampSeconds(timestamp: unknown): number | null {
    if (typeof timestamp === 'number') return timestamp > 1_000_000_000_000 ? timestamp / 1000 : timestamp;
    if (timestamp && typeof timestamp === 'object') {
        const value = (timestamp as TimestampLike).toNumber?.();
        if (typeof value === 'number') return value > 1_000_000_000_000 ? value / 1000 : value;
    }
    return null;
}
