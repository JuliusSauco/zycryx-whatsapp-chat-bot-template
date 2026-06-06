import {pickRandom} from '../../utils/random.js';

export function buildJoinUsageMessage(): string {
    return `🤔 𝙔 𝙚𝙡 𝙚𝙣𝙡𝙖𝙘𝙚? 𝙄𝙣𝙜𝙧𝙚𝙨𝙖 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙫𝙖́𝙡𝙞𝙙𝙤 𝙙𝙚𝙡 𝙜𝙧𝙪𝙥𝙤 𝙥𝙖𝙧𝙖 𝙦𝙪𝙚 𝙚𝙡 𝙗𝙤𝙩 𝙥𝙪𝙚𝙙𝙖 𝙪𝙣𝙞𝙧𝙨𝙚.

📝 *¿𝘾𝙤́𝙢𝙤 𝙪𝙨𝙖𝙧 𝙚𝙡 𝙘𝙤𝙢𝙖𝙣𝙙𝙤?*
Usa: #join <enlace> [tiempo]
- Si no pones tiempo, el bot se une por 30 minutos (usuarios) o 1 día (propietario).
- Puedes especificar el tiempo con: minuto, hora, día o mes.

📌 *Ejemplos:*
- #join ${info.nn} (por defecto)
- #join ${info.nn2} 60 minuto (1 hora)
- #join ${info.nn} 2 día (2 días)
- #join ${info.nn} 1 mes (30 días)`;
}

export function buildJoinRequestQueuedMessage(): string {
    return `𝙎𝙪 𝙚𝙣𝙡𝙖𝙘𝙚 𝙨𝙚 𝙚𝙣𝙫𝙞𝙤́ 𝙖𝙡 𝙢𝙞 𝙥𝙧𝙤𝙥𝙞𝙚𝙩𝙖𝙧𝙞𝙤(𝙖)*.
┈┈┈┈┈┈┈┈┈┈┈┈┈
⚠️ *𝙎𝙪 𝙜𝙧𝙪𝙥𝙤 𝙨𝙚𝙧𝙖́ 𝙚𝙫𝙖𝙡𝙪𝙖𝙙𝙤 𝙮 𝙦𝙪𝙚𝙙𝙖𝙧𝙖́ 𝙖 𝙙𝙚𝙘𝙞𝙨𝙞𝙤́𝙣 𝙙𝙚𝙡 𝙢𝙞 𝙥𝙧𝙤𝙥𝙞𝙚𝙩𝙖𝙧𝙞𝙤(𝙖).*
┈┈┈┈┈┈┈┈┈┈┈┈
❕ *𝙀𝙨 𝙥𝙤𝙨𝙞𝙗𝙡𝙚 𝙦𝙪𝙚 𝙨𝙪 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙪𝙙 𝙨𝙚𝙖 𝙧𝙚𝙘𝙝𝙖𝙯𝙖𝙙𝙖 𝙥𝙤𝙧 𝙡𝙖𝙨 𝙨𝙞𝙜𝙪𝙞𝙚𝙣𝙩𝙚𝙨 𝙘𝙖𝙪𝙨𝙖𝙨:*
1️⃣ *𝙀𝙡 𝙗𝙤𝙩 𝙚𝙨𝙩𝙖́ 𝙨𝙖𝙩𝙪𝙧𝙖𝙙𝙤* .
2️⃣ *𝙀𝙡 𝙗𝙤𝙩 𝙛𝙪𝙚 𝙚𝙡𝙞𝙢𝙞𝙣𝙖𝙙𝙤 𝙙𝙚𝙡 𝙜𝙧𝙪𝙥𝙤.*
3️⃣ *𝙀𝙡 𝙜𝙧𝙪𝙥𝙤 𝙣𝙤 𝙘𝙪𝙢𝙥𝙡𝙞𝙧 𝙘𝙤𝙣 𝙡𝙖𝙨 𝙣𝙤𝙧𝙢𝙖𝙩𝙞𝙫𝙖 𝙙𝙚 𝙀𝙡 𝙗𝙤𝙩*
4⃣ *𝙚𝙡 𝙜𝙧𝙪𝙥𝙤 𝙩𝙞𝙚𝙣𝙚 𝙦𝙪𝙚 𝙩𝙚𝙣𝙚𝙧 𝙢𝙞𝙣𝙞𝙢𝙤 80 𝙥𝙖𝙧𝙩𝙞𝙘𝙞𝙥𝙖𝙣𝙩𝙚𝙨 𝙥𝙖𝙧𝙖 𝙚𝙫𝙞𝙩𝙖𝙧 𝙜𝙧𝙪𝙥𝙤 𝙞𝙣𝙖𝙘𝙩𝙞𝙫𝙤 𝙮 𝙨𝙖𝙩𝙪𝙧𝙖 𝙖𝙡 𝙗𝙤𝙩*
5⃣ *𝙀𝙡 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚𝙡 𝙜𝙧𝙪𝙥𝙤 𝙨𝙚 𝙧𝙚𝙨𝙩𝙖𝙗𝙡𝙚𝙘𝙞𝙤*.
6️⃣ *𝙉𝙤 𝙨𝙚 𝙖𝙜𝙧𝙚𝙜𝙖 𝙖𝙡 𝙜𝙧𝙪𝙥𝙤 𝙨𝙚𝙜𝙪́𝙣 𝙢𝙞 𝙥𝙧𝙤𝙥𝙞𝙚𝙩𝙖𝙧𝙞𝙤(𝙖)*.
┈┈┈┈┈┈┈┈┈┈┈┈
💌 *𝙇𝙖𝙨 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙪𝙙 𝙥𝙪𝙚𝙙𝙚 𝙩𝙖𝙧𝙙𝙖 𝙝𝙤𝙧𝙖𝙨 𝙚𝙣 𝙨𝙚𝙧 𝙧𝙚𝙨𝙥𝙤𝙣𝙙𝙞𝙙𝙖𝙨. 𝙋𝙤𝙧 𝙛𝙖𝙫𝙤𝙧 𝙩𝙚𝙣𝙚𝙧 𝙥𝙖𝙘𝙞𝙚𝙣𝙘𝙞𝙖 𝙜𝙧𝙖𝙘𝙞𝙖𝙨*
┈┈┈┈┈┈┈┈┈┈┈┈
*ᴾᵘᵉᵈᵉ ᵃᵖᵒʸᵃʳ ᵉˡ ᵇᵒᵗ ᶜᵒⁿ ᵘⁿᵃ ᴱˢᵗʳᵉˡˡᶦᵗᵃ ᵉˡ ⁿᵘᵉˢᵗʳᵒ ʳᵉᵖᵒˢᶦᵗᵒʳᶦᵒ ᵒᶠᶦᶜᶦᵃˡ ʸ ˢᵘˢᶜʳᶦʳᵗᵉ ᵃ ⁿᵘᵉˢᵗʳᵒ ᶜᵃⁿᵃˡ ᵈᵉˡ ʸᵒᵘᵀᵘᵇᵉ ᵐᵃⁿᵈᵃ ᶜᵃʳᵗᵘʳᵃ ᵃ ᵐᶦ ᶜʳᵉᵃᵈᵒʳ ᵖᵃʳᵃ ᵠᵘ𝙚 𝙥𝙪𝙚𝙙𝙖 𝙖𝙜𝙧𝙚𝙜𝙖 𝙚𝙡 𝙗𝙤𝙩 𝙖 𝙩𝙪 𝙜𝙧𝙪𝙥𝙤 💫*
${pickRandom([info.yt, info.md])}`;
}

export function buildOwnerJoinRequestMessage(sender: string, link: string, time: number, unit: string): string {
    return `*⪨ 𝙎𝙊𝙇𝙄𝘾𝙄𝙏𝙐𝘿 𝘿𝙀 𝘽𝙊𝙏 𝙋𝘼𝙍𝘼 𝙐𝙉 𝙂𝙍𝙐𝙋𝙊 ⪩*

👤 𝙉𝙪𝙢𝙚𝙧𝙤 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙣𝙩𝙚:
wa.me/${sender.split('@')[0]}
🔮 𝙇𝙞𝙣𝙠 𝙙𝙚𝙡 𝙜𝙧𝙪𝙥𝙤:
http://${link}

⏳ 𝙏𝙞𝙚𝙢𝙥𝙤 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙙𝙤: ${time} ${unit}${time > 1 ? 's' : ''}`;
}

export function buildJoinedGroupGreeting(botName: string, solicitante: string, time: number, unit: string): string {
    return `Hola a todos 👋🏻

Soy *${botName || 'Bot'}*.
Fui invitado por *@${solicitante}*
Para ver el menú escribe: *#menu*

El bot saldrá automáticamente después de:
${time} ${unit}${time > 1 ? 's' : ''}`;
}
