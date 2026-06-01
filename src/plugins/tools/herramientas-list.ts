import {definePlugin} from '../../core/define-plugin.js';
import {listBannedGroups} from '../../services/group-settings.service.js';
import {listBannedUsers, listMarriedUsers, listWarnedUsers} from '../../services/user.service.js';

export default definePlugin({
    help: ["listablock", "listaban", "listaadv", "chatsbaneados", "listaparejas"],
    tags: ["owner"],
    command: /^listablock|listaban|listaadv|chatsbaneados|listaparejas$/i,
    async execute(m, {conn, command, isOwner}) {
    let txt = "";

    if (command === "listablock") {
        try {
            const blocklist = await conn.fetchBlocklist() || [];
            txt += `📛 *LISTA DE BLOQUEADOS*\n\n*Total:* ${blocklist.length}\n\n╭━━━[ *${info.vs} 𓃠* ]━━━⬣\n`;
            if (blocklist.length) {
                for (let jid of blocklist) {
                    if (!jid) continue;
                    txt += `┃🚫 @${jid.split("@")[0]}\n`;
                }
            } else {
                txt += "┃✅ No hay usuarios bloqueados actualmente.\n";
            }
            txt += `╰━━━━━━━⬣\n\n*Por favor no llame para evitar ser Bloqueado, Gracias.*`
        } catch (e: unknown) {
            txt += "❌ Error al obtener la lista de bloqueados.\n";
        }
        return conn.reply(m.chat, txt, m, {mentions: await conn.parseMention(txt)});
    }

    if (command === "chatsbaneados") {
        try {
            const chats = await listBannedGroups();
            txt += `╭•·––| 💬 𝘾𝙃𝘼𝙏𝙎 𝘽𝘼𝙉𝙀𝘼𝘿𝙊𝙎* |––·•
│ *Total:* ${chats.length}\n│\n`;
            if (chats.length) {
                for (const chat of chats) {
                    txt += `│🚫 ${chat}\n`;
                }
            } else {
                txt += "│✅ No hay chats baneados actualmente.\n";
            }
            txt += "╰•·–––––––––––––––––––·•\n";
        } catch (e: unknown) {
            txt += "❌ Error al obtener la lista de chats baneados.\n";
        }
        return conn.reply(m.chat, txt, m);
    }

    if (command === "listaban") {
        try {
            const users = await listBannedUsers();
            txt += `╭•·––| 👥 𝐔𝐒𝐔𝐀𝐑𝐈𝐎𝐒 𝐁𝐀𝐍𝐄𝐀𝐃𝐎𝐒 |––·•\n│ *Total:* ${users.length}\n│\n`;
            if (users.length) {
                for (const user of users) {
                    let razon = user.razon_ban ? `\n│📌 *Razón:* ${user.razon_ban}` : "";
                    txt += `├🚫 @${user.id.split("@")[0]}${razon}\n`;
                }
            } else {
                txt += "│✅ No hay usuarios baneados actualmente.\n";
            }
            txt += "╰•·–––––––––––––––––––·•\n";
        } catch (e: unknown) {
            txt += "❌ Error al obtener la lista de baneados.\n";
        }
        return conn.reply(m.chat, txt, m, {mentions: await conn.parseMention(txt)});
    }

    if (command === "listaparejas") {
        try {
            const users = await listMarriedUsers();
            txt += `╭•·––| 💞 *LISTA DE PAREJAS* |––·•\n│\n*│Total:* ${users.length}\n│\n`;
            if (users.length) {
                let i = 1;
                for (const user of users) {
                    if (!user.marry || user.marry === "null") continue;
                    txt += `│ *${i}.* @${user.id.split("@")[0]} 💞 @${user.marry.split("@")[0]}\n`;
                    i++;
                }
            } else {
                txt += "│✅ No hay parejas registradas actualmente.\n";
            }
            txt += "╰•·–––––––––––––––––––·•\n";
        } catch (e: unknown) {
            txt += "❌ Error al obtener la lista de parejas.\n";
        }
        return conn.reply(m.chat, txt, m, {mentions: await conn.parseMention(txt)});
    }

    if (command === "listaadv") {
        try {
            const users = await listWarnedUsers();
            txt += `╭•·––| ⚠️ *USUARIOS ADVERTIDOS / WARNED* |––·•\n│\n*│Total:* ${users.length}\n│\n`;
            if (users.length) {
                let i = 1;
                for (const user of users) {
                    txt += `│ *${i}.* @${user.id.split("@")[0]} *(Warn: ${user.warn}/4)*\n`;
                    i++;
                }
            } else {
                txt += "│✅ No hay usuarios advertidos actualmente.\n";
            }
            txt += "╰•·–––––––––––––––––––·•\n";
        } catch (e: unknown) {
            txt += "❌ Error al obtener la lista de advertidos.\n";
        }
        return conn.reply(m.chat, txt, m, {mentions: await conn.parseMention(txt)});
    }
    }
});
