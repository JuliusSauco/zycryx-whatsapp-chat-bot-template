import {definePlugin} from '../../core/define-plugin.js'
import {httpBuffer} from '../../lib/http-client.js'
import {replyUsage} from '../../lib/reply-helpers.js'

export default definePlugin({
    help: ['ss', 'ssweb'].map((v) => v + ' *<url>*'),
    tags: ['tools'],
    command: /^ss(web)?f?$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, usedPrefix, command, args}) {
    if (!args[0]) return replyUsage(m, `${usedPrefix + command} https://skyultraplus.com`)
    await m.react('⌛')
    try {
        let ss = await httpBuffer(`https://api.dorratz.com/ssweb?url=${args[0]}`)
        conn.sendFile(m.chat, ss, 'error.png', '✅', m)
        await m.react('✅')
    } catch (e: unknown) {
        await m.react('❌')
    }
    }
})
