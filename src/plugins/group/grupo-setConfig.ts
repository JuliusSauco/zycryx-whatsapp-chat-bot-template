import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import {setGroupTextMessage} from '../../services/group-settings.service.js'

export default defineSdkPlugin({
    help: ['setwelcome <texto>', 'setbye <texto>'],
    tags: ['group'],
    command: ['setwelcome', 'setbye', 'setpromote', 'setdemote'],
    admin: true,
    group: true,
    register: true,
    async execute(m, {sdk}) {
    if (!sdk.text) {
        const tipo = sdk.command === 'setwelcome'
            ? sdk.content.message('group.setConfig.typeWelcome')
            : sdk.command === 'setbye'
                ? sdk.content.message('group.setConfig.typeBye')
                : sdk.command === 'setpromote'
                    ? sdk.content.message('group.setConfig.typePromote')
                    : sdk.content.message('group.setConfig.typeDemote')

        const variables = [sdk.content.message('group.setConfig.varUser'),
            ...(sdk.command !== 'setpromote' && sdk.command !== 'setdemote' ? [sdk.content.message('group.setConfig.varGroup')] : []),
            ...(sdk.command === 'setwelcome' ? [sdk.content.message('group.setConfig.varDesc')] : []),
            ...(sdk.command === 'setpromote' || sdk.command === 'setdemote' ? [sdk.content.message('group.setConfig.varAuthor')] : [])
        ].join('\n• ')

        const opciones = (sdk.command === 'setwelcome' || sdk.command === 'setbye') ? sdk.content.message('group.setConfig.options') : ''

        const ejemplo = sdk.command === 'setwelcome' ? sdk.content.message('group.setConfig.exampleWelcome')
            : sdk.command === 'setbye' ? sdk.content.message('group.setConfig.exampleBye')
                : sdk.command === 'setpromote' ? sdk.content.message('group.setConfig.examplePromote')
                    : sdk.content.message('group.setConfig.exampleDemote')

        return sdk.reply.message('group.setConfig.usage', {
            type: tipo,
            variables,
            options: opciones,
            command: sdk.command,
            example: ejemplo,
        })
    }

    const hasFoto = sdk.text.includes('--foto')
    const hasNoFoto = sdk.text.includes('--nofoto')
    const hasGroupFoto = sdk.text.includes('--groupfoto')
    const hasNoGroupFoto = sdk.text.includes('--nogroupfoto')
    const cleanText = sdk.text
        .replace('--foto', '')
        .replace('--nofoto', '')
        .replace('--groupfoto', '')
        .replace('--nogroupfoto', '')
        .trim()
    const photoMode = hasFoto ? true : hasNoFoto ? false : undefined
    const groupPhoto = hasGroupFoto ? true : hasNoGroupFoto ? false : undefined

    if (sdk.command === 'setwelcome') {
        await setGroupTextMessage(sdk.chatId, 'welcome', cleanText, photoMode, {
            registeredBy: m.lid || sdk.sender,
            groupPhoto,
        })
        return sdk.reply.text(renderSavedMessage(sdk.content, 'group.setConfig.savedWelcome', hasFoto, hasNoFoto, hasGroupFoto, hasNoGroupFoto))
    }

    if (sdk.command === 'setbye') {
        await setGroupTextMessage(sdk.chatId, 'bye', cleanText, photoMode, {
            registeredBy: m.lid || sdk.sender,
            groupPhoto,
        })
        return sdk.reply.text(renderSavedMessage(sdk.content, 'group.setConfig.savedBye', hasFoto, hasNoFoto, hasGroupFoto, hasNoGroupFoto))
    }

    if (sdk.command === 'setpromote') {
        await setGroupTextMessage(sdk.chatId, 'promote', cleanText)
        return sdk.reply.message('group.setConfig.savedPromote')
    }

    if (sdk.command === 'setdemote') {
        await setGroupTextMessage(sdk.chatId, 'demote', cleanText)
        return sdk.reply.message('group.setConfig.savedDemote')
    }
    }
})

function renderSavedMessage(content: PluginContentSdk, templatePath: string, hasFoto: boolean, hasNoFoto: boolean, hasGroupFoto: boolean, hasNoGroupFoto: boolean): string {
    return content.renderMessage(templatePath, {
        photo: hasFoto ? content.message('group.setConfig.withImage') : hasNoFoto ? content.message('group.setConfig.withoutImage') : '',
        groupPhoto: hasGroupFoto ? content.message('group.setConfig.withGroupPhoto') : hasNoGroupFoto ? content.message('group.setConfig.withUserPhoto') : '',
    })
}

