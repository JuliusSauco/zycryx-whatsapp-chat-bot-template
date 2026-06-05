import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {httpRequest} from '../../lib/http-client.js';
import {replyReportableError} from '../../lib/reply-helpers.js';

const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
const userCaptions = new Map<string, QuotedMessage>();
const userRequests: Record<string, boolean> = {};

export default definePlugin({
    help: ['gitclone <url>'],
    tags: ['downloader'],
    command: /gitclone|clonarepo|clonarrepo|repoclonar/i,
    register: true,
    limit: 2,
    level: 1,
    async execute(m, {args, usedPrefix, command, conn}) {
    if (!args[0]) throw `*⚠️ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙂𝙞𝙩𝙝𝙪𝙗*\n• *𝙀𝙟 :* ${usedPrefix + command} https://github.com/elrebelde21/LoliBot-MD`
    if (!regex.test(args[0])) return m.reply(`⚠️ 𝙚𝙨𝙤 𝙣𝙤 𝙚𝙨 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙜𝙞𝙩𝙝𝙪𝙗 𝙗𝙤𝙡𝙪𝙙𝙤 🤡`)
    if (userRequests[m.sender]) {
        conn.reply(m.chat, `⏳ *Hey @${m.sender.split('@')[0]} Espera...* Ya hay una solicitud en proceso. Por favor, espera a que termine antes de hacer otra...`, userCaptions.get(m.sender) || m)
        return;
    }
    userRequests[m.sender] = true;
    try {
        const downloadGit = await conn.reply(m.chat, `*⌛ 𝐂𝐚𝐥𝐦𝐚 ✋ 𝐂𝐥𝐚𝐜𝐤, 𝐘𝐚 𝐞𝐬𝐭𝐨𝐲 𝐄𝐧𝐯𝐢𝐚𝐝𝐨 𝐞𝐥 𝐚𝐫𝐜𝐡𝐢𝐯𝐨 🚀*\n*𝐒𝐢 𝐧𝐨 𝐥𝐞 𝐥𝐥𝐞𝐠𝐚 𝐞𝐥 𝐚𝐫𝐜𝐡𝐢𝐯𝐨 𝐞𝐬 𝐝𝐞𝐛𝐢𝐝𝐨 𝐚 𝐪𝐮𝐞 𝐞𝐥 𝐑𝐞𝐩𝐨𝐬𝐢𝐭𝐨𝐫𝐢𝐨 𝐞𝐬 𝐦𝐮𝐲 𝐩𝐞𝐬𝐚𝐝𝐨*`, m, {
            contextInfo: {
                externalAdReply: {
                    mediaUrl: undefined,
                    mediaType: 1,
                    description: undefined,
                    title: info.wm,
                    body: ' 💫 𝐒𝐮𝐩𝐞𝐫 𝐁𝐨𝐭 𝐃𝐞 𝐖𝐡𝐚𝐭𝐬𝐚𝐩𝐩 🥳 ',
                    previewType: 0,
                    thumbnail: m.pp,
                    sourceUrl: info.nna
                }
            }
        });
        userCaptions.set(m.sender, downloadGit);
        let [_, user, repo] = args[0].match(regex) || [];
        repo = repo.replace(/.git$/, '');
        let url = `https://api.github.com/repos/${user}/${repo}/zipball`;
        const disposition = (await httpRequest(url, {method: 'HEAD'})).headers.get('content-disposition') || '';
        let filename = disposition.match(/attachment; filename=(.*)/)?.[1] || `${repo}.zip`;
        await conn.sendFile(m.chat, url, filename, undefined, m);
    } catch (e: unknown) {
        await replyReportableError(m, e);
        logInfo(e);
    } finally {
        delete userRequests[m.sender];
    }
    }
});

;
