import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import type {QuotedMessage} from '../../types/context.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';

const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
const userCaptions = createExpiringMap<QuotedMessage>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();

export default defineSdkPlugin({
    help: ['gitclone <url>'],
    tags: ['downloader'],
    command: /gitclone|clonarepo|clonarrepo|repoclonar/i,
    register: true,
    limit: 10,
    alternativeCoins: 100,
    level: 1,
    async execute(m, {sdk}) {
    if (!sdk.args[0]) throw sdk.content.renderMessage('downloads.gitclone.missingUrl', {
        command: sdk.usedPrefix + sdk.command
    })
    if (!regex.test(sdk.args[0])) return sdk.reply.message('downloads.gitclone.invalidUrl')
    if (!userRequests.acquire(sdk.sender)) {
        await sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.gitclone.locked', {
            user: sdk.sender.split('@')[0]
        }), userCaptions.get(sdk.sender) || m)
        return;
    }
    try {
        const downloadGit = await sdk.conn.reply(sdk.chatId, sdk.content.message('downloads.gitclone.progress'), m, {
            contextInfo: {
                externalAdReply: {
                    mediaUrl: undefined,
                    mediaType: 1,
                    description: undefined,
                    title: sdk.branding.watermark,
                    body: sdk.content.message('downloads.gitclone.adBody'),
                    previewType: 0,
                    thumbnail: m.pp,
                    sourceUrl: info.nna
                }
            }
        });
        userCaptions.set(sdk.sender, downloadGit);
        let [_, user, repo] = sdk.args[0].match(regex) || [];
        repo = repo.replace(/.git$/, '');
        let url = `https://api.github.com/repos/${user}/${repo}/zipball`;
        const disposition = (await sdk.http.request(url, {method: 'HEAD'})).headers.get('content-disposition') || '';
        let filename = disposition.match(/attachment; filename=(.*)/)?.[1] || `${repo}.zip`;
        await sdk.sendFile(url, filename);
    } catch (e: unknown) {
        await sdk.reply.reportableError(e);
        logInfo(e);
    } finally {
        userRequests.release(sdk.sender);
    }
    }
});

;
