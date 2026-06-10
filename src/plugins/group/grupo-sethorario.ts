import {definePlugin} from '../../core/define-plugin.js'
import {setNsfwSchedule} from '../../services/group-settings.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {isGroupCreator} from '../../utils/group-creator.js'

export default definePlugin({
    help: ['sethorario 23:00-06:00'],
    tags: ['admin'],
    command: /^sethorario$/i,
    group: true,
    async execute(m, {args, isOwner, metadata, chatId}) {
    if (!isOwner && !isGroupCreator({chatId: chatId || m.chat, sender: m.sender, senderLid: m.lid, metadata})) {
        throw getRequiredPluginMessage('config.toggle.ownerOrGroupCreatorOnly')
    }
    const rango = (args[0] || '').trim()
    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(rango)) throw getRequiredPluginMessage('group.setHorario.invalidFormat')
    await setNsfwSchedule(m.chat, rango)
    m.reply(renderTemplate(getRequiredPluginMessage('group.setHorario.success'), {range: rango}))
    }
})
