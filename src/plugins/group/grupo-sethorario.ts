import {definePlugin} from '../../core/define-plugin.js'
import {setNsfwSchedule} from '../../services/group-settings.service.js'

export default definePlugin({
    help: ['sethorario 23:00-06:00'],
    tags: ['admin'],
    command: /^sethorario$/i,
    admin: true,
    async execute(m, {args}) {
    const rango = (args[0] || '').trim()
    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(rango)) throw 'Formato correcto: /sethorario 23:00-06:00'
    await setNsfwSchedule(m.chat, rango)
    m.reply(`⏰ Horario NSFW establecido a *${rango}*`)
    }
})
