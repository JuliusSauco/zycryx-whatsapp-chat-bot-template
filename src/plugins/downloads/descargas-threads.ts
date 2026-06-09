import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import type {proto} from '@whiskeysockets/baileys'
import {httpJson} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {createUserRequestLocks} from '../../lib/user-request-locks.js'

interface UserRequest {
    active: boolean
    message: {key?: proto.IMessageKey | null; chat: string; fromMe: boolean}
}

interface ThreadsAgatzResponse {
    data?: {
        image_urls?: string[]
        video_urls?: string[]
    }
}

interface ThreadsFallbackResponse {
    status?: boolean
    data?: Array<{
        url?: string
        type?: 'image' | 'video' | string
    }>
}

const userRequests = createUserRequestLocks<UserRequest>();

export default definePlugin({
    help: ['thread'],
    tags: ['downloader'],
    command: /^(thread|threads|threaddl)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, args, usedPrefix, command}) {
    if (!args[0]) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.threads.missingUrl'), {
        command: usedPrefix + command
    }))

    const activeRequest = userRequests.get(m.sender)
    if (activeRequest) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.threads.locked'), {
        user: m.sender.split('@')[0]
    }), activeRequest.message || m)
    const {key} = await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.threads.downloading')}, {quoted: m});
    userRequests.acquire(m.sender, {active: true, message: {key, chat: m.chat, fromMe: true}});
    m.react(`⌛`)
    try {
        const data = await httpJson<ThreadsAgatzResponse>(`https://api.agatz.xyz/api/threads?url=${args[0]}`)
        const downloadUrl = data.data?.image_urls?.[0] || data.data?.video_urls?.[0];
        if (!downloadUrl) throw new Error('No media found')
        const fileType = downloadUrl.includes('.webp') || downloadUrl.includes('.jpg') || downloadUrl.includes('.png') ? 'image' : 'video';
        if (fileType === 'image') {
            await conn.sendFile(m.chat, downloadUrl, 'threads_image.jpg', getRequiredPluginMessage('downloads.threads.imageCaption'), m);
            m.react('✅');
        } else if (fileType === 'video') {
            await conn.sendFile(m.chat, downloadUrl, 'threads_video.mp4', getRequiredPluginMessage('downloads.threads.videoCaption'), m);
            m.react('✅');
        }
        await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.threads.completed'), edit: key})
    } catch (e: unknown) {
        try {
            const data2 = await httpJson<ThreadsFallbackResponse>(`${info.apis}/download/threads?url=${args[0]}`);
            if (data2.status === true && data2.data && data2.data.length > 0) {
                const downloadUrl = data2.data[0]?.url;
                const fileType = data2.data[0]?.type;
                if (!downloadUrl) throw new Error('No media found')
                if (fileType === 'image') {
                    await conn.sendFile(m.chat, downloadUrl, 'threads_image.jpg', getRequiredPluginMessage('downloads.threads.imageCaption'), m);
                    m.react('✅');
                } else if (fileType === 'video') {
                    await conn.sendFile(m.chat, downloadUrl, 'threads_video.mp4', getRequiredPluginMessage('downloads.threads.videoCaption'), m);
                    m.react('✅');
                }
            }
            await conn.sendMessage(m.chat, {text: getRequiredPluginMessage('downloads.threads.completed'), edit: key})
        } catch (e: unknown) {
            m.react(`❌`)
            await conn.sendMessage(m.chat, {
                text: renderTemplate(getRequiredPluginMessage('downloads.threads.error'), {error: String(e)}),
                edit: key
            })
            logInfo(e)
        }
    } finally {
        userRequests.release(m.sender);
    }
    }
})

