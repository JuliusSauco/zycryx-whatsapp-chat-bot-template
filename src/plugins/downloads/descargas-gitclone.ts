import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {httpRequest} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {replyReportableError} from '../../lib/reply-helpers.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
const userCaptions = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();

export default definePlugin({
    help: ['gitclone <url>'],
    tags: ['downloader'],
    command: /gitclone|clonarepo|clonarrepo|repoclonar/i,
    register: true,
    limit: 2,
    level: 1,
    async execute(m, {args, usedPrefix, command, conn}) {
    if (!args[0]) throw renderTemplate(getRequiredPluginMessage('downloads.gitclone.missingUrl'), {
        command: usedPrefix + command
    })
    if (!regex.test(args[0])) return m.reply(getRequiredPluginMessage('downloads.gitclone.invalidUrl'))
    if (!userRequests.acquire(m.sender)) {
        conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.gitclone.locked'), {
            user: m.sender.split('@')[0]
        }), userCaptions.get(m.sender) || m)
        return;
    }
    try {
        const downloadGit = await conn.reply(m.chat, getRequiredPluginMessage('downloads.gitclone.progress'), m, {
            contextInfo: {
                externalAdReply: {
                    mediaUrl: undefined,
                    mediaType: 1,
                    description: undefined,
                    title: info.wm,
                    body: getRequiredPluginMessage('downloads.gitclone.adBody'),
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
        userRequests.release(m.sender);
    }
    }
});

;
