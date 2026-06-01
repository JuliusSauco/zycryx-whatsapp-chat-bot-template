import {definePlugin} from '../core/define-plugin.js'
import fg from 'api-dylux'

interface InstagramStalkResponse {
    data?: {
        username?: string
        full_name?: string
        biography?: string
        verified?: boolean
        private?: boolean
        followers?: number
        following?: number
        posts?: number
        url?: string
        profile_picture?: string
    }
}

export default definePlugin({
    help: ['igstalk'],
    tags: ['downloader'],
    command: ['igstalk', 'igsearch', 'instagramsearch'],
    register: true,
    limit: 1,
    async execute(m, {conn, args, text, usedPrefix, command}) {
    if (!args[0]) return m.reply(`⚠️ Ingrese el Username de Instagram\n\n*• Ejemplo:* ${usedPrefix + command} GataDios`)
    m.react("⌛");
    try {
        const apiUrl = `${info.apis}/tools/igstalk?username=${encodeURIComponent(args[0])}`;
        const apiResponse = await fetch(apiUrl);
        const delius = await apiResponse.json() as InstagramStalkResponse;
        if (!delius || !delius.data) return m.react("❌");
        const profile = delius.data;
        const txt = `👤 *Perfil de Instagram*:
🔹 *Nombre de usuario*: ${profile.username}
🔹 *Nombre completo*: ${profile.full_name}
🔹 *Biografía*: ${profile.biography}
🔹 *Verificado*: ${profile.verified ? 'Sí' : 'No'}
🔹 *Cuenta privada*: ${profile.private ? 'Sí' : 'No'}
🔹 *Seguidores*: ${profile.followers}
🔹 *Seguidos*: ${profile.following}
🔹 *Publicaciones*: ${profile.posts}
🔹 *URL*: ${profile.url}`;

        await conn.sendFile(m.chat, profile.profile_picture, 'insta_profile.jpg', txt, m);
        m.react("✅");
    } catch (e2) {
        try {
            let res = await fg.igStalk(args[0])
            let te = `👤 *Perfil de Instagram*:
*• Nombre:* ${res.name} 
*• Username:* ${res.username}
*• Seguidores:* ${res.followersH}
*• Siguiendo:* ${res.followingH}
*• Bio:* ${res.description}
*• Posts:* ${res.postsH}
*• Link* : https://instagram.com/${res.username.replace(/^@/, '')}`
            await conn.sendFile(m.chat, res.profilePic, 'igstalk.png', te, m)
            m.react("⌛");
        } catch (e: unknown) {
            await m.react(`❌`)
            m.reply(`\`\`\`⚠️ OCURRIO UN ERROR ⚠️\`\`\`\n\n> *Reporta el siguiente error a mi creador con el comando:*#report\n\n>>> ${e} <<<< `)
            console.log(e)
        }
    }
    }
})
