import {defineSdkPlugin} from '../../core/sdk-plugin.js';

interface TimestampLike {
    toNumber?: () => number;
}

export default defineSdkPlugin({
    command: ['ping', 'p'],
    help: ['ping'],
    tags: ['main'],
    async execute(m, {sdk}) {
        const start = performance.now();
        const receiveLatency = getMessageLatencyMs(m.messageTimestamp);
        const processMs = Math.round(performance.now() - start);
        const latencyText = receiveLatency === null
            ? ''
            : sdk.content.renderMessage('info.ping.latency', {receiveLatency});
        const response = sdk.content.renderMessage('info.ping.response', {processMs, latencyText});
        await sdk.sendMessage({text: response});
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
