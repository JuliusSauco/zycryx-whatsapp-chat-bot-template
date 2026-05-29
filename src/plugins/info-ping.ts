import {definePlugin} from '../core/define-plugin.js';

export default definePlugin({
    command: ['ping', 'p'],
    help: ['ping'],
    tags: ['main'],
    async execute(m, {conn}) {
        const start = performance.now();
        const {key} = (await conn.sendMessage(m.chat, {text: '⏱️ ping...'}, {quoted: m}))!;
        const ping = (performance.now() - start).toFixed(0);
        await conn.sendMessage(m.chat, {text: `🏓 *Pong!* ${ping}ms`, edit: key}, {quoted: m});
    }
});
