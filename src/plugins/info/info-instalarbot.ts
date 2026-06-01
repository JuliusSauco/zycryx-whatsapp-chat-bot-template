import {definePlugin} from '../../core/define-plugin.js'

export default definePlugin({
    help: ['instalarbot'],
    tags: ['main'],
    command: /^(instalarbot)/i,
    register: true,
    async execute(m, {conn}) {
    let texto = `*◄┢┅͜͡✇⟬↯ື ►ஜ۩💥۩ஜ◄ ↯ື⟭✇͜͡┅┧►*

💕 𝙑𝙄𝘿𝙀𝙊 𝘿𝙀 𝙄𝙉𝙎𝙏𝘼𝙇𝘼𝘾𝙄𝙊𝙉
https://youtu.be/z2kHwbu8e8s?si=2z3Fur9U4ccN7EwA

*✨ Canal de Actualizaciones y novedades sobre el bot*
${info.nna}

*📲💛 Si tienes dudas o necesitas ayuda en el proceso de la instalación puede escribirme por facebook:*
${info.fb}

> ❗ *_Solo para temas de instalación_*

───────•••───────

\`✨ 𝙂𝙄𝙏𝙃𝙐𝘽 > 𝙍𝙀𝙋𝙊𝙎𝙄𝙏𝙊𝙍𝙄𝙊\`
> *_Visita mí repositorio 😸 para más información, si te agrada el Bot apoya me con una ⭐️ ¡Gracias!_*
${info.md}

> ───────•••───────

\`✨ 𝙍𝙀𝙌𝙐𝙄𝙎𝙄𝙏𝙊𝙎 𝙋𝘼𝙍𝘼 𝙇𝘼 𝙄𝙉𝙎𝙏𝘼𝙇𝘼𝘾𝙄𝙊𝙉 (aclave de nuestros hosting) 😎\`

> ❌️ _~1 GB de almacenamiento~_
> ❌️ _~Aplicación Termux (actualizada)~_
> ✅ _Un WhatsApp secundarios_
> ✅ _Un número virtual (si es ofc mejor)_
> ❌️ ~_2 dispositivos o una PC para escanear_~
> ✅ _Ahora con 1 dispositivos con el codigo de 8 digitos ya pueden ser bot_

> ───────•••───────

\`📌 INSTALAR - SKYULTRAPLUS HOST\`
https://youtu.be/z2kHwbu8e8s?si=2z3Fur9U4ccN7EwA

💻 *Página:*
https://skyultraplus.com

✨ *Dashboard "new" para cliente:*
paymenter.skyultraplus.com

🟢 *Dash "anterior" usuarios free:*
dash.skyultraplus.com

⚙️ *Panel:*
https://panel.skyultraplus.com

💥 *Comunidad de WhatsApp:*
https://chat.whatsapp.com/E6iWpvGuJ8zJNPbN3zOr0D?mode=ac_t

*🟣 Discord:*
https://discord.gg/zvKgtc2RBc

🧡 Canal de WhatsApp:*
https://whatsapp.com/channel/0029VakUvreFHWpyWUr4Jr0g

🗣📲 Contacto:*
• wa.me/15167096032
• https://instagram.com/gata_dios
• ${info.fb}

> ───────•••───────

\`✨ 𝙍𝙀𝙌𝙐𝙄𝙎𝙄𝙏𝙊𝙎 𝙋𝘼𝙍𝘼 𝙇𝘼 𝙄𝙉𝙎𝙏𝘼𝙇𝘼𝘾𝙄𝙊𝙉 (Por termux) ✨\`

> ✅ _1 GB de almacenamiento_
> ✅ _Aplicación Termux (actualizada)_
> ✅ _Un WhatsApp secundarios_
> ✅ _Un número virtual (si es ofc mejor)_
> ❌️ ~_2 dispositivos o una PC para escanear_~
> ✅ _Ahora con 1 dispositivos con el codigo de 8 digitos ya pueden ser bot_

> ───────•••───────

\`📌 𝙄𝙉𝙎𝙏𝘼𝙇𝘼𝙍 - 𝙏𝙀𝙍𝙈𝙐𝙓\`

* \`\`\`termux-setup-storage\`\`\`

* \`\`\`apt update && apt upgrade -y && pkg install -y git nodejs ffmpeg imagemagick yarn\`\`\`

* \`\`\`git clone https://github.com/elrebelde21/LoliBot-MD && cd LoliBot-MD\`\`\`

* \`\`\`bash install.sh\`\`\`

* \`\`\`ls\`\`\`

* \`\`\`npm start\`\`\`

> *◄┢┅͜͡✇⟬↯ື ►ஜ۩💥۩ஜ◄ ↯ື⟭✇͜͡┅┧►*`
    return conn.sendMessage(m.chat, {
        text: texto,
        contextInfo: {
            externalAdReply: {
                title: info.wm,
                body: "Video tutorial",
                thumbnailUrl: m.pp,
                mediaUrl: 'https://youtu.be/z2kHwbu8e8s?si=2z3Fur9U4ccN7EwA',
                mediaType: 2
            },
            mentionedJid: [m.sender]
        }
    }, {quoted: m})
    }
})
