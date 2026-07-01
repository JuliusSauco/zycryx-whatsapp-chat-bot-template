import {logError} from '../../lib/logger.js';
import fs from 'fs'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {getMainConnection} from '../../core/runtime-state.js'

export default defineSdkPlugin({
    help: ['backup'],
    tags: ['owner'],
    command: /^(backup|respaldo|copia)$/i,
    owner: true,
    async execute(m, {conn, sdk}) {
        try {
            const d = new Date()
            const date = d.toLocaleDateString('es', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            const jid = conn.user?.id || ''
            const idClean = jid.replace(/:\d+/, '').split('@')[0]
            const isMainBot = jid === getMainConnection()?.user?.id
            const sessionPath = isMainBot ? './BotSession/creds.json' : `./jadibot/${idClean}/creds.json`

            if (!fs.existsSync(sessionPath)) return await sdk.reply.message('owner.backup.missingCreds', {path: sessionPath})
            const creds = fs.readFileSync(sessionPath)
            await sdk.reply.message('owner.backup.heading', {id: idClean, date})
            await conn.sendMessage(m.sender, {
                document: creds,
                mimetype: 'application/json',
                fileName: `creds.json`
            }, {quoted: m})
        } catch (e: unknown) {
            logError(e)
            await m.react('❌')
            await sdk.reply.message('owner.backup.error')
        }
    }
})
