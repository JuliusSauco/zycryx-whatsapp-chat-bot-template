import {definePlugin} from '../../core/define-plugin.js'
export default definePlugin({
    help: ['setdesc'],
    tags: ['group'],
    command: /^setdesk|setdesc|newdesc|descripción|descripcion$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {conn, args}) {
    const pp = await conn.profilePictureUrl(m.chat, 'image').catch(() => 'https://telegra.ph/file/2a1d71ab744b55b28f1ae.jpg')
    await conn.groupUpdateDescription(m.chat, `${args.join(" ")}`);
    m.react("✅️")
    }
})
