import {definePlugin} from '../../core/define-plugin.js'

export default definePlugin({
    help: ['runtime'],
    tags: ['main'],
    command: /^(runtime|sc)$/i,
    owner: false,
    group: false,
    private: false,
    register: true,
    async execute(m) {
    const runtime = process.uptime()
    const teks = `🫶 ${info.md}\n\n*⏳ 𝙏𝙄𝙀𝙈𝙋𝙊 𝘼𝘾𝙏𝙄𝙑𝙊:*\n\t${formatRuntime(runtime)}\n`
    return m.reply(teks)
    }
})

function pad(n: number): string {
    return (n < 10 ? '0' : '') + n
}

function formatRuntime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const secs = Math.floor(seconds % 60)
    return `${pad(days)} Dias\t ${pad(hours)} Horas ${pad(minutes)} Minutos ${pad(secs)} Segundos`
}
