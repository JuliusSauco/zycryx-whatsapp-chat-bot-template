import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['tobase64'],
    tags: ['tools'],
    command: ['tobase64'],
    register: true,
    limit: 1,
    async execute(m, {text, usedPrefix, command}) {
    if (!text) return m.reply(`✳️ Usa:\n${usedPrefix + command} texto`);

    try {
        const base64 = Buffer.from(text, 'utf-8').toString('base64');
        return m.reply(`${base64}`);
    } catch (e: any) {
        return m.reply(`❌ Error al convertir: ${e.message}`);
    }
    }
})
