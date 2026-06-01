import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['txt', 'brat'],
    tags: ['game'],
    command: ['txt', 'escribir', 'carbon'],
    limit: 1,
    register: true,
    async execute(m, {conn, text, usedPrefix, command}) {
    let teks = text ? text : m.quoted && m.quoted.text ? m.quoted.text : ''

    if (command == 'txt' || command == 'escribir') {
        if (!teks) return m.reply(`⚠️ 𝙌𝙐𝙀 𝙀𝙎𝘾𝙍𝙄𝘽𝙄𝙊? 𝙐𝙎𝘼𝙍 𝙀𝙎𝙏𝙀 𝘾𝙊𝙈𝘼𝙉𝘿𝙊 𝘿𝙀 𝙇𝘼 𝙎𝙄𝙂𝙐𝙄𝙀𝙉𝙏𝙀 𝙁𝙊𝙍𝙈𝘼\n\n𝙀𝙅𝙀𝙈𝙋𝙇𝙊: *${usedPrefix + command}* Hola LoliBot`)
        let img = `${info.fgmods.url}/maker/txt?text=${encodeURIComponent(teks)}&apikey=${info.fgmods.key}`;
        conn.sendFile(m.chat, img, 'img.png', `✍🏻 𝙀𝙎𝙏𝘼 𝙇𝙄𝙎𝙏𝙊!!\n${info.wm}`, m);
    }

    if (command == 'carbon') {
        if (!teks) return m.reply(`⚠️ Ingresar en texto\nEj: *${usedPrefix + command}* case "hola":\nm.reply("que onda")\nbreak`)
//let res = `${info.APIs.fgmods.url}/maker/carbon?text=${teks}&apikey=${info.APIs.fgmods.key}`
        let res = `https://www.archive-ui.biz.id/api/maker/carbonify?text=${teks}`
        await conn.sendFile(m.chat, res, 'error.jpg', undefined, m)
    }
    }
})
  
