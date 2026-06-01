import {definePlugin} from '../../core/define-plugin.js'
import fetch from 'node-fetch'
import yts from 'yt-search'
import ytdl from 'ytdl-core'
import axios from 'axios'
import {savetube} from '../../lib/yt-savetube.js'
import {ogmp3} from '../../lib/youtubedl.js';
import {amdl, ytdown} from '../../lib/scraper.js';
import {ENV} from '../../core/env.js';

const userRequests: Record<string, boolean> = {};
export default definePlugin({
    help: ['ytmp4', 'ytmp3'],
    tags: ['downloader'],
    command: /^(ytmp3|ytmp4|fgmp4|fgmp3|dlmp3|ytmp4doc|ytmp3doc)$/i,
    async execute(m, {conn, text, args, usedPrefix, command}) {
    if (!args[0]) return m.reply('*𝙌𝙪𝙚 𝙚𝙨𝙩𝙖 𝙗𝙪𝙨𝙘𝙖𝙙𝙤🤔 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙚𝙡 𝙚𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙔𝙤𝙪𝙏𝙪𝙗𝙚 𝙥𝙖𝙧𝙖 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙚𝙡 𝙖𝙪𝙙𝙞𝙤*')
    const sendType = command.includes('doc') ? 'document' : command.includes('mp3') ? 'audio' : 'video';
    const yt_play = await search(args.join(' '));
    let youtubeLink = '';
    if (args[0].includes('you')) {
        youtubeLink = args[0];
    } else {
        const index = parseInt(args[0]) - 1;
        if (index >= 0) {
            if (Array.isArray(global.videoList) && global.videoList.length > 0) {
                const matchingItem = global.videoList.find(item => item.from === m.sender);
                if (matchingItem) {
                    if (index < matchingItem.urls.length) {
                        youtubeLink = matchingItem.urls[index];
                    } else {
                        return m.reply(`⚠️ 𝙉𝙤 𝙨𝙚 𝙚𝙣𝙘𝙤𝙣𝙩𝙧𝙤 𝙪𝙣 𝙚𝙣𝙡𝙖𝙘𝙚𝙨 𝙥𝙖𝙧𝙖 𝙚𝙨𝙚 𝙣𝙪𝙢𝙚𝙧𝙤, 𝙥𝙤𝙧 𝙛𝙖𝙫𝙤𝙧 𝙞𝙣𝙜𝙧𝙚𝙨𝙚 𝙚𝙡 𝙣𝙪𝙢𝙚𝙧𝙤 𝙚𝙣𝙩𝙧𝙚 1 𝙮 𝙚𝙡 ${matchingItem.urls.length}*`)
                    }
                } else {
                }
            }
        }
    }

    if (userRequests[m.sender]) {
        return m.reply('⏳ *Espera...* Ya hay una solicitud en proceso. Por favor, espera a que termine antes de hacer otra.')
    }
    userRequests[m.sender] = true;
    try {

        if (command == 'ytmp3' || command == 'fgmp3' || command == 'ytmp3doc') {
            m.reply([`*⌛ 𝙀𝙨𝙥𝙚𝙧𝙚 ✋ 𝙪𝙣 𝙢𝙤𝙢𝙚𝙣𝙩𝙤... 𝙔𝙖 𝙚𝙨𝙩𝙤𝙮 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙙𝙤 𝙩𝙪 𝙖𝙪𝙙𝙞𝙤🍹*`, `⌛ 𝙋𝙍𝙊𝘾𝙀𝙎𝘼𝙉𝘿𝙊...\n*𝘌𝘴𝘵𝘰𝘺 𝘪𝘯𝘵𝘦𝘯𝘵𝘢𝘯𝘥𝘰 𝘥𝘦𝘴𝘤𝘢𝘳𝘨𝘢 𝘴𝘶𝘴 𝘈𝘶𝘥𝘪𝘰 𝘦𝘴𝘱𝘦𝘳𝘦 🏃‍♂️💨*`, `Calmao pa estoy bucando tu canción 😎\n\n*Recuerda colocar bien el nombre de la cancion o el link del video de youtube*\n\n> *Si el comando *play no funciona utiliza el comando *ytmp3*`].getRandom())
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
                    const {title, type, download, thumbnail} = response.result;
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
                        const {title, type, download, thumbnail} = response;
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
                            const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${args}`);
                            let {data} = await res.json() as {data?: {dl?: string}};
                            await conn.sendMessage(m.chat, {
                                [sendType]: {url: data?.dl},
                                mimetype: 'audio/mpeg',
                                contextInfo: {}
                            }, {quoted: m});
                        } catch (e: unknown) {
                            try {
                                const res = await fetch(`https://api.agatz.xyz/api/ytmp3?url=${args}`)
                                let data = await res.json() as {data?: {downloadUrl?: string}};
                                await conn.sendMessage(m.chat, {
                                    [sendType]: {url: data.data?.downloadUrl},
                                    mimetype: 'audio/mpeg',
                                    contextInfo: {}
                                }, {quoted: m});
                            } catch (e: unknown) {
                                try {
                                    const res = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?apikey=${ENV.ZENKEY_API_KEY}&url=${args}`)
                                    let {result} = await res.json() as {result?: {download?: {url?: string}}}
                                    await conn.sendMessage(m.chat, {
                                        [sendType]: {url: result?.download?.url},
                                        mimetype: 'audio/mpeg',
                                        contextInfo: {}
                                    }, {quoted: m})
                                } catch (e: unknown) {
                                    try {
                                        const apiUrl = `${info.apis}/download/ytmp3?url=${args}`;
                                        const apiResponse = await fetch(apiUrl);
                                        const delius = await apiResponse.json() as {status?: boolean; data?: {download?: {url?: string}}};

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
            m.reply([`*⌛ 𝙀𝙨𝙥𝙚𝙧𝙚 ✋ 𝙪𝙣 𝙢𝙤𝙢𝙚𝙣𝙩𝙤... 𝙔𝙖 𝙚𝙨𝙩𝙤𝙮 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙙𝙤 𝙩𝙪 𝙑𝙞𝙙𝙚𝙤 🍹*`, `⌛ 𝙋𝙍𝙊𝘾𝙀𝙎𝘼𝙉𝘿𝙊...\n*𝘌𝘴𝘵𝘰𝘺 𝘪𝘯𝘵𝘦𝘯𝘵𝘢𝘯𝘥𝘰 𝘥𝘦𝘴𝘤𝘢𝘳𝘨𝘢 𝘴𝘶𝘴 𝘝𝘪𝘥𝘦𝘰 𝘦𝘴𝘱𝘦𝘳𝘦 🏃‍♂️💨*`, `Calma ✋🥸🤚\n\n*Estoy descargando tu video 🔄*\n\n> *Aguarde un momento, por favor*`].getRandom())
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
                    const [input, quality = '720'] = text.split(' ');
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
                        const {title, type, download, thumbnail} = response.result;
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
                            const {title, type, download, thumbnail} = response;
                            if (type === 'video') {
                                await conn.sendMessage(m.chat, {
                                    [sendType]: {url: download},
                                    caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`,
                                    thumbnail: thumbnail
                                }, {quoted: m})
                            }
                        } catch (e: unknown) {
                            try {
                                const res = await fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${args}`);
                                let {data} = await res.json() as {data?: {dl?: string}};
                                await conn.sendMessage(m.chat, {
                                    [sendType]: {url: data?.dl},
                                    fileName: `video.mp4`,
                                    mimetype: 'video/mp4',
                                    caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                }, {quoted: m})
                            } catch (e: unknown) {
                                try {
                                    const res = await fetch(`https://api.agatz.xyz/api/ytmp4?url=${args}`)
                                    let data = await res.json() as {data?: {downloadUrl?: string}};
                                    await conn.sendMessage(m.chat, {
                                        [sendType]: {url: data.data?.downloadUrl},
                                        fileName: `video.mp4`,
                                        caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                    }, {quoted: m})
                                } catch (e: unknown) {
                                    try {
                                        const res = await fetch(`https://api.zenkey.my.id/api/download/ytmp4?apikey=${ENV.ZENKEY_API_KEY}&url=${args}`)
                                        let {result} = await res.json() as {result?: {download?: {url?: string}}}
                                        await conn.sendMessage(m.chat, {
                                            [sendType]: {url: result?.download?.url},
                                            fileName: `video.mp4`,
                                            caption: `🔰 Aquí está tu video \n🔥 Título: ${yt_play[0].title}`
                                        }, {quoted: m})
                                    } catch (e: unknown) {
                                        try {
                                            const axeelApi = `https://axeel.my.id/api/download/video?url=${args}`;
                                            const axeelRes = await fetch(axeelApi);
                                            const axeelJson = await axeelRes.json() as {downloads?: {url?: string}};
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
                                                console.log(e)
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
        console.error(error);
        m.react("❌️")
    } finally {
        delete userRequests[m.sender];
    }
    }
})
async function search(query: string, options: Record<string, unknown> = {}) {
    const search = await yts.search({query, hl: 'es', gl: 'ES', ...options});
    return search.videos;
}

function bytesToSize(bytes: string | number | undefined) {
    return new Promise((resolve, reject) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return 'n/a';
        const numericBytes = Number(bytes || 0);
        const i = Math.floor(Math.log(numericBytes) / Math.log(1024));
        if (i === 0) resolve(`${bytes} ${sizes[i]}`);
        resolve(`${(numericBytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`)
    })
};

async function ytMp3(url: string) {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(url).then(async (getUrl) => {
            let result = [];
            for (let i = 0; i < getUrl.formats.length; i++) {
                let item = getUrl.formats[i];
                if (item.mimeType == 'audio/webm; codecs=\"opus\"') {
                    let {contentLength} = item;
                    let bytes = await bytesToSize(contentLength);
                    result[i] = {audio: item.url, size: bytes}
                }
            }
            ;
            let resultFix = result.filter(x => x.audio != undefined && x.size != undefined)
            let tiny = await axios.get(`https://tinyurl.com/api-create.php?url=${resultFix[0].audio}`);
            let tinyUrl = tiny.data;
            let title = getUrl.videoDetails.title;
            let thumb = getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
            resolve({title, result: tinyUrl, result2: resultFix, thumb})
        }).catch(reject)
    })
}

async function ytMp4(url: string): Promise<{title: string; result: string; rersult2: string; thumb: string}> {
    return new Promise(async (resolve, reject) => {
        ytdl.getInfo(url).then(async (getUrl) => {
            let result = [];
            for (let i = 0; i < getUrl.formats.length; i++) {
                let item = getUrl.formats[i];
                if (item.container == 'mp4' && item.hasVideo == true && item.hasAudio == true) {
                    let {qualityLabel, contentLength} = item;
                    let bytes = await bytesToSize(contentLength);
                    result[i] = {video: item.url, quality: qualityLabel, size: bytes}
                }
            }
            ;
            let resultFix = result.filter(x => x.video != undefined && x.size != undefined && x.quality != undefined)
            let tiny = await axios.get(`https://tinyurl.com/api-create.php?url=${resultFix[0].video}`);
            let tinyUrl = tiny.data;
            let title = getUrl.videoDetails.title;
            let thumb = getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
            resolve({title, result: tinyUrl, rersult2: resultFix[0].video, thumb})
        }).catch(reject)
    })
};

async function ytPlay(query: string) {
    return new Promise((resolve, reject) => {
        yts(query).then(async (getData) => {
            let result = getData.videos.slice(0, 5);
            let url = [];
            for (let i = 0; i < result.length; i++) {
                url.push(result[i].url)
            }
            let random = url[0];
            let getAudio = await ytMp3(random);
            resolve(getAudio)
        }).catch(reject)
    })
};

async function ytPlayVid(query: string) {
    return new Promise((resolve, reject) => {
        yts(query).then(async (getData) => {
            let result = getData.videos.slice(0, 5);
            let url = [];
            for (let i = 0; i < result.length; i++) {
                url.push(result[i].url)
            }
            let random = url[0];
            let getVideo = await ytMp4(random);
            resolve(getVideo)
        }).catch(reject)
    })
};
