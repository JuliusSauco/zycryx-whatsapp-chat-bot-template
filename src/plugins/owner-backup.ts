import fs from 'fs'
import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['backup'],
    tags: ['owner'],
    command: /^(backup|respaldo|copia)$/i,
    owner: true,
    async execute(m, {conn}) {
        try {
            const d = new Date()
            const date = d.toLocaleDateString('es', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            const jid = conn.user?.id || ''
            const idClean = jid.replace(/:\d+/, '').split('@')[0]
            const isMainBot = jid === global.conn?.user?.id
            const sessionPath = isMainBot ? './BotSession/creds.json' : `./jadibot/${idClean}/creds.json`

            if (!fs.existsSync(sessionPath)) return await m.reply(`❌ No se encontró el archivo *creds.json* en:\n${sessionPath}`)
            const creds = fs.readFileSync(sessionPath)
            await m.reply(`_📂 *Respaldo de sesión de ${idClean}* (${date})_`)
            await conn.sendMessage(m.sender, {
                document: creds,
                mimetype: 'application/json',
                fileName: `creds.json`
            }, {quoted: m})
        } catch (e: unknown) {
            console.error(e)
            await m.react('❌')
            await m.reply('❌ Error al generar el respaldo de la sesión.')
        }
    }
})
