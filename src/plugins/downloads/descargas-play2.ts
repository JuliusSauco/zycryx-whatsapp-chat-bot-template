import {logError, logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import yts from 'yt-search'
import ytdl from 'ytdl-core'
import {savetube} from '../../lib/yt-savetube.js'
import {ogmp3} from '../../lib/youtubedl.js';
import {amdl, ytdown} from '../../lib/scraper.js';
import {ENV} from '../../core/env.js';
import {httpJson} from '../../lib/http-client.js';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {resolveIndexedYoutubeLink, searchYouTube, ytMp4} from './youtube-download.helpers.js';

const userRequests = createUserRequestLocks();
export default definePlugin({
    help: ['ytmp4', 'ytmp3'],
    tags: ['downloader'],
    command: /^(ytmp3|ytmp4|fgmp4|fgmp3|dlmp3|ytmp4doc|ytmp3doc)$/i,
    async execute(m, {conn, text, args, command}) {
    if (!args[0]) return m.reply('*𝙌𝙪𝙚 𝙚𝙨𝙩𝙖 𝙗𝙪𝙨𝙘𝙖𝙙𝙤🤔 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙚𝙡 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙔𝙤𝙪𝙏𝙪𝙗𝙚 𝙥𝙖𝙧𝙖 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙚𝙡 𝙖𝙪𝙙𝙞𝙤*')
    const sendType = command.includes('doc') ? 'document' : command.includes('mp3') ? 'audio' : 'video';
    const yt_play = await searchYouTube(args.join(' '));
    const youtubeLink = resolveIndexedYoutubeLink(args[0], m.sender);

    if (!userRequests.acquire(m.sender)) {
        return m.reply('⏳ *Espera...* Ya hay una solicitud en proceso. Por favor, espera a que termine antes de hacer otra.')
    }
    try {

        if (command == 'ytmp3' || command == 'fgmp3' || command == 'ytmp3doc') {
            await m.react('⌛')
            try {
                const isAudio = command.toLowerCase().includes('mp3') || command.toLowerCase().includes('audio')
                const format = isAudio ? 'mp3' : '720'
                const result = await savetube.download(args[0], format)
                const data = result.result
                if (!data?.download) throw new Error('Respuesta inválida de SaveTube')
                await conn.sendMessage(m.chat, {
                    [sendType]: {url: data.download},
                    mimetype: 'audio/mpeg',
                    fileName: `audio.mp3`,
                    contextInfo: {}
                }, {quoted: m});
            } catch (e: unknown) {
                try {
                    const format = args[1] || '720p';
                    const response = await amdl.download(args[0], format);
                    const {title, type, download} = response.result;
                    if (type === 'audio') {
                        await conn.sendMessage(m.chat, {
                            [sendType]: {url: download},
                            mimetype: 'audio/mpeg',
                            fileName: `${title}.mp3`,
                            contextInfo: {}
                        }, {quoted: m});
                    }
                } catch (e: unknown) {
                    try {
                        const format = args[1] || 'mp3';
                        const response = await ytdown.download(args[0], format);
                        const {title, type, download} = response;
                        if (type === 'audio') {
                            await conn.sendMessage(m.chat, {
                                [sendType]: {url: download},
                                mimetype: 'audio/mpeg',
                                fileName: `${title}.mp3`,
                                contextInfo: {}
                            }, {quoted: m})
                        }
                    } catch (e: unknown) {
                        try {
                            const {data} = await httpJson<{data?: {dl?: string}}>(`https://api.siputzx.my.id/api/d/ytmp3?url=${args}`);
                            await conn.sendMessage(m.chat, {
                                [sendType]: {url: data?.dl},
                                mimetype: 'audio/mpeg',
                                contextInfo: {}
                            }, {quoted: m});
                        } catch (e: unknown) {
                            try {
                                const data = await httpJson<{data?: {downloadUrl?: string}}>(`https://api.agatz.xyz/api/ytmp3?url=${args}`)
                                await conn.sendMessage(m.chat, {
                                    [sendType]: {url: data.data?.downloadUrl},
                                    mimetype: 'audio/mpeg',
                                    contextInfo: {}
                                }, {quoted: m});
                            } catch (e: unknown) {
                                try {
                                    const {result} = await httpJson<{result?: {download?: {url?: string}}}>(`https://api.zenkey.my.id/api/download/ytmp3?apikey=${ENV.ZENKEY_API_KEY}&url=${args}`)
                                    await conn.sendMessage(m.chat, {
                                        [sendType]: {url: result?.download?.url},
                                        mimetype: 'audio/mpeg',
                                        contextInfo: {}
                                    }, {quoted: m})
                                } catch (e: unknown) {
                                    try {
                                        const apiUrl = `${info.apis}/download/ytmp3?url=${args}`;
                                        const delius = await httpJson<{status?: boolean; data?: {download?: {url?: string}}}>(apiUrl);

                                        if (!delius.status) {
                                            return m.react("❌")
                                        }
                                        const downloadUrl = delius.data?.download?.url;
                                        await conn.sendMessage(m.chat, {
                                            [sendType]: {url: downloadUrl},
                                            mimetype: 'audio/mpeg',
                                            contextInfo: {}
                                        }, {quoted: m});
                                    } catch (e: unknown) {
                                        try {
                                            let searchh = await yts(youtubeLink)
                                            let __res = searchh.all.map(v => v).filter(v => v.type == "video")
                                            const fallbackVideo = __res[0]
                                            if (!fallbackVideo?.videoId) throw new Error('No se encontró video para fallback')
                                            let infoo = await ytdl.getInfo('https://youtu.be/' + fallbackVideo.videoId)
                                            let ress = await ytdl.chooseFormat(infoo.formats, {filter: 'audioonly'})
                                            await conn.sendMessage(m.chat, {
                                                [sendType]: {url: ress.url},
                                                fileName: fallbackVideo.title + '.mp3',
                                                mimetype: 'audio/mp4',
                                                contextInfo: {}
                                            }, {quoted: m})
                                        } catch (e: unknown) {
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (command == 'ytmp4' || command == 'fgmp4' || command == 'ytmp4doc') {
            await m.react('⌛')
            try {
                const result = await savetube.download(args[0], "720")
                const data = result.result
                if (!data?.download) throw new Error('Respuesta inválida de SaveTube')
                await conn.sendMessage(m.chat, {
                    [sendType]: {url: data.download},
                    mimetype: 'video/mp4',
                    fileName: `${data.title}.mp4`,
                    caption: `🔰 Aquí está tu video\n🔥 Título: ${data.title}`
                }, {quoted: m})
            } catch (e: unknown) {
                try {
                    const [, quality = '720'] = text.split(' ');
                    const validQualities = ['240', '360', '480', '720', '1080'];
                    const selectedQuality = validQualities.includes(quality) ? quality : '720';
                    const res = await ogmp3.download(yt_play[0].url, selectedQuality, 'video');
                    if (!res.result?.download) throw new Error('Respuesta inválida de ogmp3')
                    await conn.sendMessage(m.chat, {
                        [sendType]: {url: res.result.download},
                        mimetype: 'video/mp4',
                        caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title} (${selectedQuality}p)`
                    }, {quoted: m});
                } catch (e: unknown) {
                    try {
                        const format = args[1] || '720p';
                        const response = await amdl.download(args[0], format);
                        const {type, download, thumbnail} = response.result;
                        if (type === 'video') {
                            await conn.sendMessage(m.chat, {
                                [sendType]: {url: download},
                                caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`,
                                thumbnail: thumbnail
                            }, {quoted: m});
                        }
                    } catch (e: unknown) {
                        try {
                            const format = args[1] || 'mp4';
                            const response = await ytdown.download(args[0], format);
                            const {type, download, thumbnail} = response;
                            if (type === 'video') {
                                await conn.sendMessage(m.chat, {
                                    [sendType]: {url: download},
                                    caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`,
                                    thumbnail: thumbnail
                                }, {quoted: m})
                            }
                        } catch (e: unknown) {
                            try {
                                const {data} = await httpJson<{data?: {dl?: string}}>(`https://api.siputzx.my.id/api/d/ytmp4?url=${args}`);
                                await conn.sendMessage(m.chat, {
                                    [sendType]: {url: data?.dl},
                                    fileName: `video.mp4`,
                                    mimetype: 'video/mp4',
                                    caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                }, {quoted: m})
                            } catch (e: unknown) {
                                try {
                                    const data = await httpJson<{data?: {downloadUrl?: string}}>(`https://api.agatz.xyz/api/ytmp4?url=${args}`)
                                    await conn.sendMessage(m.chat, {
                                        [sendType]: {url: data.data?.downloadUrl},
                                        fileName: `video.mp4`,
                                        caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                    }, {quoted: m})
                                } catch (e: unknown) {
                                    try {
                                        const {result} = await httpJson<{result?: {download?: {url?: string}}}>(`https://api.zenkey.my.id/api/download/ytmp4?apikey=${ENV.ZENKEY_API_KEY}&url=${args}`)
                                        await conn.sendMessage(m.chat, {
                                            [sendType]: {url: result?.download?.url},
                                            fileName: `video.mp4`,
                                            caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                        }, {quoted: m})
                                    } catch (e: unknown) {
                                        try {
                                            const axeelApi = `https://axeel.my.id/api/download/video?url=${args}`;
                                            const axeelJson = await httpJson<{downloads?: {url?: string}}>(axeelApi);
                                            if (axeelJson.downloads?.url) {
                                                const videoUrl = axeelJson.downloads.url;
                                                await conn.sendMessage(m.chat, {
                                                    [sendType]: {url: videoUrl},
                                                    fileName: `${yt_play[0].title}.mp4`,
                                                    caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                                }, {quoted: m})
                                            }
                                        } catch (e: unknown) {
                                            try {
                                                let mediaa = await ytMp4(youtubeLink)
                                                await conn.sendMessage(m.chat, {
                                                    [sendType]: {url: mediaa.result},
                                                    fileName: `error.mp4`,
                                                    caption: `_${info.wm}_`,
                                                    thumbnail: mediaa.thumb,
                                                    mimetype: 'video/mp4'
                                                }, {quoted: m})
                                            } catch (e: unknown) {
                                                logInfo(e)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

    } catch (error: unknown) {
        logError(error);
        m.react("❌️")
    } finally {
        userRequests.release(m.sender);
    }
    }
})
