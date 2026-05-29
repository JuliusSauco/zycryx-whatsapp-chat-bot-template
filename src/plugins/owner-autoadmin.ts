import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['autoadmin'],
    tags: ['owner'],
    command: /^admin.|atad|autoadmin$/i,
    owner: true,
    botAdmin: true,
    async execute(m, {conn, isAdmin}) {
        if (m.fromMe) throw 'Nggk'
        if (isAdmin) return m.reply('Ya eres admin del grupo mi creador 🫡')
        await conn.groupParticipantsUpdate(m.chat, [m.sender], "promote")
    }
})
