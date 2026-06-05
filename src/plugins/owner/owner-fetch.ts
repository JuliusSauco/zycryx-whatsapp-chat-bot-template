import {format} from 'util'
import {definePlugin} from '../../core/define-plugin.js'
import {httpRequest} from '../../lib/http-client.js'

export default definePlugin({
    help: ['fetch'].map(v => v + ' *<url>*'),
    tags: ['owner'],
    command: /^(fetch|get)$/i,
    register: true,
    async execute(m, {conn, text, usedPrefix, command}) {
        if (m.fromMe) return
        if (!/^https?:\/\//.test(text)) return m.reply(`Ejemplo:\n${usedPrefix + command} https://skyultraplus.com`)
        m.react("💻")
        let url = text
        let res = await httpRequest(url)
        const contentLength = Number(res.headers.get('content-length') || 0)
        if (contentLength > 100 * 1024 * 1024 * 1024) {
            throw `Content-Length: ${contentLength}`
        }

        const contentType = res.headers.get('content-type') || ''
        if (!/text|json/.test(contentType)) return conn.sendFile(m.chat, url, 'file', text, m)
        const body = Buffer.from(await res.arrayBuffer())
        let txt = ''
        try {
            txt = format(JSON.parse(body.toString()))
        } catch (e: unknown) {
            txt = body.toString()
        } finally {
            m.reply(txt.slice(0, 65536) + '')
        }
    }
})
