import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {listBannedGroups} from '../../services/group-settings.service.js';
import {listBannedUsers, listMarriedUsers, listWarnedUsers} from '../../services/user.service.js';

export default defineSdkPlugin({
    help: ["listablock", "listaban", "listaadv", "chatsbaneados", "listaparejas"],
    tags: ["owner"],
    command: /^listablock|listaban|listaadv|chatsbaneados|listaparejas$/i,
    async execute(_m, {sdk}) {
    let txt = "";

    if (sdk.command === "listablock") {
        try {
            const blocklist = await sdk.conn.fetchBlocklist() || [];
            txt += sdk.content.renderMessage('tools.list.block.header', {
                total: String(blocklist.length),
                version: info.vs,
            });
            if (blocklist.length) {
                for (let jid of blocklist) {
                    if (!jid) continue;
                    txt += sdk.content.renderMessage('tools.list.block.row', {user: jid.split("@")[0]});
                }
            } else {
                txt += sdk.content.message('tools.list.block.empty');
            }
            txt += sdk.content.message('tools.list.block.footer')
        } catch (e: unknown) {
            txt += sdk.content.message('tools.list.block.error');
        }
        return sdk.reply.text(txt, null, {mentions: await sdk.conn.parseMention(txt)});
    }

    if (sdk.command === "chatsbaneados") {
        try {
            const chats = await listBannedGroups();
            txt += sdk.content.renderMessage('tools.list.bannedChats.header', {total: String(chats.length)});
            if (chats.length) {
                for (const chat of chats) {
                    txt += sdk.content.renderMessage('tools.list.bannedChats.row', {chat});
                }
            } else {
                txt += sdk.content.message('tools.list.bannedChats.empty');
            }
            txt += sdk.content.message('tools.list.bannedChats.footer');
        } catch (e: unknown) {
            txt += sdk.content.message('tools.list.bannedChats.error');
        }
        return sdk.reply.text(txt);
    }

    if (sdk.command === "listaban") {
        try {
            const users = await listBannedUsers();
            txt += sdk.content.renderMessage('tools.list.bannedUsers.header', {total: String(users.length)});
            if (users.length) {
                for (const user of users) {
                    let razon = user.razon_ban
                        ? sdk.content.renderMessage('tools.list.bannedUsers.reason', {reason: user.razon_ban})
                        : "";
                    txt += sdk.content.renderMessage('tools.list.bannedUsers.row', {
                        user: user.id.split("@")[0],
                        reason: razon,
                    });
                }
            } else {
                txt += sdk.content.message('tools.list.bannedUsers.empty');
            }
            txt += sdk.content.message('tools.list.bannedUsers.footer');
        } catch (e: unknown) {
            txt += sdk.content.message('tools.list.bannedUsers.error');
        }
        return sdk.reply.text(txt, null, {mentions: await sdk.conn.parseMention(txt)});
    }

    if (sdk.command === "listaparejas") {
        try {
            const users = await listMarriedUsers();
            txt += sdk.content.renderMessage('tools.list.married.header', {total: String(users.length)});
            if (users.length) {
                let i = 1;
                for (const user of users) {
                    if (!user.marry || user.marry === "null") continue;
                    txt += sdk.content.renderMessage('tools.list.married.row', {
                        index: String(i),
                        user: user.id.split("@")[0],
                        partner: user.marry.split("@")[0],
                    });
                    i++;
                }
            } else {
                txt += sdk.content.message('tools.list.married.empty');
            }
            txt += sdk.content.message('tools.list.married.footer');
        } catch (e: unknown) {
            txt += sdk.content.message('tools.list.married.error');
        }
        return sdk.reply.text(txt, null, {mentions: await sdk.conn.parseMention(txt)});
    }

    if (sdk.command === "listaadv") {
        try {
            const users = await listWarnedUsers();
            txt += sdk.content.renderMessage('tools.list.warned.header', {total: String(users.length)});
            if (users.length) {
                let i = 1;
                for (const user of users) {
                    txt += sdk.content.renderMessage('tools.list.warned.row', {
                        index: String(i),
                        user: user.id.split("@")[0],
                        warn: String(user.warn),
                    });
                    i++;
                }
            } else {
                txt += sdk.content.message('tools.list.warned.empty');
            }
            txt += sdk.content.message('tools.list.warned.footer');
        } catch (e: unknown) {
            txt += sdk.content.message('tools.list.warned.error');
        }
        return sdk.reply.text(txt, null, {mentions: await sdk.conn.parseMention(txt)});
    }
    }
});
