import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {setNsfwSchedule} from '../../services/group-settings.service.js'
import {isGroupCreator} from '../../utils/group-creator.js'

export default defineSdkPlugin({
    help: ['sethorario 23:00-06:00'],
    tags: ['admin'],
    command: /^sethorario$/i,
    group: true,
    async execute(m, {sdk}) {
    if (!sdk.isOwner && !isGroupCreator({chatId: sdk.chatId, sender: sdk.sender, senderLid: m.lid, metadata: sdk.metadata})) {
        throw sdk.content.message('config.toggle.ownerOrGroupCreatorOnly')
    }
    const rango = (sdk.args[0] || '').trim()
    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(rango)) throw sdk.content.message('group.setHorario.invalidFormat')
    await setNsfwSchedule(sdk.chatId, rango)
    await sdk.reply.message('group.setHorario.success', {range: rango})
    }
})
