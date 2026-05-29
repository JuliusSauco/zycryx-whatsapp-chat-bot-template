import fetch from 'node-fetch'
import {format} from 'util'
import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['fetch'].map((v: any) => v + ' *<url>*'),
    tags: ['owner'],
    command: /^(fetch|get)$/i,
    register: true,
    async execute(m, {conn, text, usedPrefix, command}) {
        if (m.fromMe) return
        if (!/^https?:\/\//.test(text)) return m.reply(`Ejemplo:\n${usedPrefix + command} https://skyultraplus.com`)
        m.react("💻")
        let url = text
        let res = await fetch(url)
        // @ts-ignore
        if (res.headers.get('content-length') > 100 * 1024 * 1024 * 1024) {
            throw `Content-Length: ${res.headers.get('content-length')}`
        }

        // @ts-ignore
        if (!/text|json/.test(res.headers.get('content-type'))) return conn.sendFile(m.chat, url, 'file', text, m)
        let txt = await res.buffer()
        try {
            // @ts-ignore
            txt = format(JSON.parse(txt + ''))
        } catch (e: any) {
            // @ts-ignore
            txt = txt + ''
        } finally {
            m.reply(txt.slice(0, 65536) + '')
        }
    }
})
