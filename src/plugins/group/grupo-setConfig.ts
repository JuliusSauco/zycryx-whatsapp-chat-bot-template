import {definePlugin} from '../../core/define-plugin.js'
import {setGroupTextMessage} from '../../services/group-settings.service.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
    help: ['setwelcome <texto>', 'setbye <texto>'],
    tags: ['group'],
    command: ['setwelcome', 'setbye', 'setpromote', 'setdemote'],
    admin: true,
    group: true,
    register: true,
    async execute(m, {command, text}) {
    if (!text) {
        const tipo = command === 'setwelcome'
            ? getRequiredPluginMessage('group.setConfig.typeWelcome')
            : command === 'setbye'
                ? getRequiredPluginMessage('group.setConfig.typeBye')
                : command === 'setpromote'
                    ? getRequiredPluginMessage('group.setConfig.typePromote')
                    : getRequiredPluginMessage('group.setConfig.typeDemote')

        const variables = [getRequiredPluginMessage('group.setConfig.varUser'),
            ...(command !== 'setpromote' && command !== 'setdemote' ? [getRequiredPluginMessage('group.setConfig.varGroup')] : []),
            ...(command === 'setwelcome' ? [getRequiredPluginMessage('group.setConfig.varDesc')] : []),
            ...(command === 'setpromote' || command === 'setdemote' ? [getRequiredPluginMessage('group.setConfig.varAuthor')] : [])
        ].join('\n• ')

        const opciones = (command === 'setwelcome' || command === 'setbye') ? getRequiredPluginMessage('group.setConfig.options') : ''

        const ejemplo = command === 'setwelcome' ? getRequiredPluginMessage('group.setConfig.exampleWelcome')
            : command === 'setbye' ? getRequiredPluginMessage('group.setConfig.exampleBye')
                : command === 'setpromote' ? getRequiredPluginMessage('group.setConfig.examplePromote')
                    : getRequiredPluginMessage('group.setConfig.exampleDemote')

        return m.reply(renderTemplate(getRequiredPluginMessage('group.setConfig.usage'), {
            type: tipo,
            variables,
            options: opciones,
            command,
            example: ejemplo,
        }))
    }

    const hasFoto = text.includes('--foto')
    const hasNoFoto = text.includes('--nofoto')
    const hasHidetag = text.includes('--hidetag')
    const hasNoHidetag = text.includes('--nohidetag')
    const hasGroupFoto = text.includes('--groupfoto')
    const hasNoGroupFoto = text.includes('--nogroupfoto')
    const cleanText = text
        .replace('--foto', '')
        .replace('--nofoto', '')
        .replace('--groupfoto', '')
        .replace('--nogroupfoto', '')
        .replace('--hidetag', '')
        .replace('--nohidetag', '')
        .trim()
    const photoMode = hasFoto ? true : hasNoFoto ? false : undefined
    const hidetag = hasHidetag ? true : hasNoHidetag ? false : undefined
    const groupPhoto = hasGroupFoto ? true : hasNoGroupFoto ? false : undefined

    if (command === 'setwelcome') {
        await setGroupTextMessage(m.chat, 'welcome', cleanText, photoMode, {
            registeredBy: m.lid || m.sender,
            hidetag,
            groupPhoto,
        })
        return m.reply(renderSavedMessage('group.setConfig.savedWelcome', '✅ Mensaje de bienvenida guardado{photo}{groupPhoto}{hidetag}.', hasFoto, hasNoFoto, hasGroupFoto, hasNoGroupFoto, hasHidetag, hasNoHidetag))
    }

    if (command === 'setbye') {
        await setGroupTextMessage(m.chat, 'bye', cleanText, photoMode, {
            registeredBy: m.lid || m.sender,
            hidetag,
            groupPhoto,
        })
        return m.reply(renderSavedMessage('group.setConfig.savedBye', '✅ Mensaje de despedida guardado{photo}{groupPhoto}{hidetag}.', hasFoto, hasNoFoto, hasGroupFoto, hasNoGroupFoto, hasHidetag, hasNoHidetag))
    }

    if (command === 'setpromote') {
        await setGroupTextMessage(m.chat, 'promote', cleanText)
        return m.reply(getRequiredPluginMessage('group.setConfig.savedPromote'))
    }

    if (command === 'setdemote') {
        await setGroupTextMessage(m.chat, 'demote', cleanText)
        return m.reply(getRequiredPluginMessage('group.setConfig.savedDemote'))
    }
    }
})

function renderSavedMessage(templatePath: string, fallback: string, hasFoto: boolean, hasNoFoto: boolean, hasGroupFoto: boolean, hasNoGroupFoto: boolean, hasHidetag: boolean, hasNoHidetag: boolean): string {
    return renderTemplate(getRequiredPluginMessage(templatePath), {
        photo: hasFoto ? getRequiredPluginMessage('group.setConfig.withImage') : hasNoFoto ? getRequiredPluginMessage('group.setConfig.withoutImage') : '',
        groupPhoto: hasGroupFoto ? getRequiredPluginMessage('group.setConfig.withGroupPhoto') : hasNoGroupFoto ? getRequiredPluginMessage('group.setConfig.withUserPhoto') : '',
        hidetag: hasHidetag ? getRequiredPluginMessage('group.setConfig.withHidetag') : hasNoHidetag ? getRequiredPluginMessage('group.setConfig.withoutHidetag') : '',
    })
}

