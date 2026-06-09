import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['uptime'],
    tags: ['main'],
    command: /^uptime$/i,
    async execute(_m, {sdk}) {
    const uptime = process.uptime() * 1000 // en milisegundos
    const tiempo = clockString(uptime)
    await sdk.reply.message('info.uptime.response', {uptime: tiempo})
    }
})

function clockString(ms: number) {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':')
}
