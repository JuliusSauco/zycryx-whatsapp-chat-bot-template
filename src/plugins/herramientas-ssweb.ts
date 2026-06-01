import fetch from 'node-fetch'
import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['ss', 'ssweb'].map((v) => v + ' *<url>*'),
    tags: ['tools'],
    command: /^ss(web)?f?$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, command, args}) {
    if (!args[0]) return m.reply(`⚠️ 𝐈𝐧𝐠𝐫𝐞𝐬𝐚 𝐮𝐧 𝐥𝐢𝐧𝐤 𝐩𝐚𝐫𝐚 𝐬𝐚𝐜𝐚𝐫 𝐜𝐚𝐩𝐭𝐮𝐫𝐚, ej: https://skyultraplus.com`)
    await m.react('⌛')
    try {
        let ss = await (await fetch(`https://api.dorratz.com/ssweb?url=${args[0]}`)).buffer()
        conn.sendFile(m.chat, ss, 'error.png', '✅', m)
        await m.react('✅')
    } catch (e: unknown) {
        await m.react('❌')
    }
    }
})
