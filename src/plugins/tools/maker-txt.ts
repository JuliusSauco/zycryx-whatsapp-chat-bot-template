import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['txt', 'brat'],
    tags: ['game'],
    command: ['txt', 'escribir', 'carbon'],
    limit: 1,
    register: true,
    async execute(m, {sdk}) {
    let teks = sdk.text ? sdk.text : m.quoted && m.quoted.text ? m.quoted.text : ''

    if (sdk.command == 'txt' || sdk.command == 'escribir') {
        if (!teks) return sdk.reply.message('tools.maker.txtUsage', {command: sdk.usedPrefix + sdk.command})
        let img = `${info.fgmods.url}/maker/txt?text=${encodeURIComponent(teks)}&apikey=${info.fgmods.key}`;
        return sdk.sendFile(img, 'img.png', sdk.content.renderMessage('tools.maker.txtCaption', {watermark: info.wm}));
    }

    if (sdk.command == 'carbon') {
        if (!teks) return sdk.reply.message('tools.maker.carbonUsage', {command: sdk.usedPrefix + sdk.command})
//let res = `${info.APIs.fgmods.url}/maker/carbon?text=${teks}&apikey=${info.APIs.fgmods.key}`
        let res = `https://www.archive-ui.biz.id/api/maker/carbonify?text=${teks}`
        await sdk.sendFile(res, 'error.jpg')
    }
    }
})
  
