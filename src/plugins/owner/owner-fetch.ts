import {format} from 'util'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['fetch'].map(v => v + ' *<url>*'),
    tags: ['owner'],
    command: /^(fetch|get)$/i,
    rowner: true,
    register: true,
    async execute(m, {conn, text, usedPrefix, command, sdk}) {
        if (m.fromMe) return
        if (!/^https?:\/\//.test(text)) return sdk.reply.message('owner.fetch.usage', {command: usedPrefix + command})
        await sdk.reply.react("💻")
        let url = text
        let res = await sdk.http.request(url)
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
            await sdk.reply.text(txt.slice(0, 65536) + '')
        }
    }
})
