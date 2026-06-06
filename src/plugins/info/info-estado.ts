import {definePlugin} from '../../core/define-plugin.js'
import {pickRandom} from '../../utils/random.js'

export default definePlugin({
    help: ['estado'],
    tags: ['main'],
    command: /^(estado|status|estate|state|stado|stats|botstat(us)?)$/i,
    async execute(m, {conn}) {
    let _uptime = process.uptime() * 1000
    if (process.send) {
        process.send('uptime')
        await new Promise<unknown>(resolve => {
            process.once('message', resolve)
            setTimeout(resolve, 1000)
        })
    }
    let uptime = clockString(_uptime)
    let estado = `${pickRandom([`*┌───⊷ *ミ🤖 Estado del Bot 🤖彡*\n┆ *=> Bot activo ✅*\n┆┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n┆ *=> Bot uso público ✅️*\n┆┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n┆=> 𝘼𝙘𝙩𝙞𝙫𝙤 𝙙𝙪𝙧𝙖𝙣𝙩𝙚\n┆=> ${uptime} ✅\n╰──────────────────`, `*Online ${uptime} ✅*`, `*Saturado 🥵*`, `Estoy activo desde: ${uptime}`, `Estamos activo papu 🤙`])}
`.trim()
    await conn.fakeReply(m.chat, estado, m.sender, `Uptime: ${uptime}`, 'status@broadcast');
    /*await conn.reply(m.chat, `┌───⊷ *ミ🤖 Estado del Bot 🤖彡*
    ┆ *=> Bot activo ✅*
    ┆┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
    ┆ *=> Bot uso público ✅️*
    ┆┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
    ┆=> 𝘼𝙘𝙩𝙞𝙫𝙤 𝙙𝙪𝙧𝙖𝙣𝙩𝙚
    ┆=> ${uptime} ✅
    ╰──────────────────`, fkontak, { mentions: [aa,] })*/
    }
})

function clockString(ms: number) {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':')
}
