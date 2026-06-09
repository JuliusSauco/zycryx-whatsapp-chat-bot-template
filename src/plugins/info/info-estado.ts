import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {pickRandom} from '../../utils/random.js'

export default defineSdkPlugin({
    help: ['estado'],
    tags: ['main'],
    command: /^(estado|status|estate|state|stado|stats|botstat(us)?)$/i,
    async execute(m, {sdk}) {
    let _uptime = process.uptime() * 1000
    if (process.send) {
        process.send('uptime')
        await new Promise<unknown>(resolve => {
            process.once('message', resolve)
            setTimeout(resolve, 1000)
        })
    }
    let uptime = clockString(_uptime)
    const variants = sdk.content.messageList('info.status.variants')
    let estado = sdk.content.renderTemplate(pickRandom(variants), {uptime}).trim()
    const quoted = sdk.content.renderMessage('info.status.quoted', {uptime})
    await sdk.conn.fakeReply(sdk.chatId, estado, sdk.sender, quoted, 'status@broadcast');
    }
})

function clockString(ms: number) {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':')
}
