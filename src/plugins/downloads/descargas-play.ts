import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import yts from 'yt-search';
import type {QuotedMessage} from '../../types/context.js';
import type {YouTubeSearchVideo} from 'yt-search';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {
    buildAudioApis,
    buildVideoApis,
    getFileSize,
    runDownloadProviders,
    searchYouTube,
    secondString,
    selectQuality,
    youtubeRegexID,
} from '../../providers/downloads/youtube.provider.js';

const LimitAud = 725 * 1024 * 1024; // 725MB
const LimitVid = 425 * 1024 * 1024; // 425MB
const userCaptions = new Map<string, QuotedMessage>();
const userRequests = createUserRequestLocks();


export default definePlugin({
    help: ['play', 'play2', 'play3', 'play4', 'playdoc'],
    tags: ['downloader'],
    command: ['play', 'play2', 'play3', 'play4', 'audio', 'video', 'playdoc', 'playdoc2', 'musica'],
    register: true,
    async execute(m, {conn, command, args, text, usedPrefix}) {
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.play.missingQuery'), {
        command: usedPrefix + command
    }));
    const tipoDescarga = command === 'play' || command === 'musica' ? 'audio' : command === 'play2' ? 'video' : command === 'play3' ? 'audio (documento)' : command === 'play4' ? 'video (documento)' : '';
    if (!userRequests.acquire(m.sender)) return await conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('downloads.play.locked'), {
        user: m.sender.split('@')[0]
    }), userCaptions.get(m.sender) || m);
    try {
        let videoIdToFind = text.match(youtubeRegexID) || null;
        const yt_play = await searchYouTube(args.join(' '));
        if (!yt_play[0]) return m.reply(getRequiredPluginMessage('downloads.play.noResults'))
        const ytResult = await yts(videoIdToFind === null ? text : 'https://youtu.be/' + videoIdToFind[1]);
        let ytplay2: YouTubeSearchVideo | undefined;
        if (videoIdToFind) {
            const videoId = videoIdToFind[1];
            ytplay2 = ytResult.all.find(item => item.videoId === videoId) || ytResult.videos.find(item => item.videoId === videoId)
        }
        ytplay2 = ytplay2 || ytResult.all?.[0] || ytResult.videos?.[0];
        const PlayText = await conn.sendMessage(m.chat, {
            text: renderTemplate(getRequiredPluginMessage('downloads.play.progress'), {
                title: yt_play[0].title,
                duration: secondString(yt_play[0].duration?.seconds),
                downloadType: tipoDescarga
            }),
            contextInfo: {
                forwardingScore: 9999999,
                isForwarded: true,
                mentionedJid: [],
                externalAdReply: {
                    showAdAttribution: false,
                    renderLargerThumbnail: false,
                    title: yt_play[0].title,
                    body: getRequiredPluginMessage('downloads.play.adBody'),
                    containsAutoReply: true,
                    mediaType: 1,
                    thumbnailUrl: yt_play[0].thumbnail,
                    sourceUrl: "skyultraplus.com"
                }
            }
        }, {quoted: m})
        userCaptions.set(m.sender, PlayText);

        const [, qualityInput = command === 'play' || command === 'musica' || command === 'play3' ? '320' : '720'] = text.split(' ');
        const isAudioCommand = command === 'play' || command === 'musica' || command === 'play3';
        const selectedQuality = selectQuality(qualityInput, isAudioCommand);
        const isAudio = command.toLowerCase().includes('mp3') || command.toLowerCase().includes('audio')
        const format = isAudio ? 'mp3' : '720'
        const videoUrl = yt_play[0].url;
        const title = yt_play[0].title;

        const audioApis = buildAudioApis(videoUrl, title, format, selectedQuality);
        const videoApis = buildVideoApis(videoUrl, title, selectedQuality);

        if (command === 'play' || command === 'musica') {
            const {mediaData, isDirect} = await runDownloadProviders(audioApis);
            if (mediaData) {
                const fileSize = await getFileSize(mediaData);
                if (fileSize > LimitAud) {
                    await conn.sendMessage(m.chat, {
                        document: isDirect ? mediaData : {url: mediaData},
                        mimetype: 'audio/mpeg',
                        fileName: `${yt_play[0].title}.mp3`,
                        contextInfo: {}
                    }, {quoted: m});
                } else {
                    await conn.sendMessage(m.chat, {
                        audio: isDirect ? mediaData : {url: mediaData},
                        mimetype: 'audio/mpeg',
                        contextInfo: {}
                    }, {quoted: m});
                }
            } else {
//await m.react('❌');
            }
        }

        if (command === 'play2' || command === 'video') {
            const {mediaData, isDirect} = await runDownloadProviders(videoApis);
            if (mediaData) {
                const fileSize = await getFileSize(mediaData);
                const messageOptions = {
                    fileName: `${yt_play[0].title}.mp4`,
                    caption: renderTemplate(getRequiredPluginMessage('downloads.play.videoCaption'), {
                        title: yt_play[0].title
                    }),
                    mimetype: 'video/mp4'
                };
                if (fileSize > LimitVid) {
                    await conn.sendMessage(m.chat, {document: isDirect ? mediaData : {url: mediaData}, ...messageOptions}, {quoted: m});
                } else {
                    await conn.sendMessage(m.chat, {
                        video: isDirect ? mediaData : {url: mediaData},
                        thumbnail: yt_play[0].thumbnail, ...messageOptions
                    }, {quoted: m});
                }
            } else {
//await m.react('❌');
            }
        }

        if (command === 'play3' || command === 'playdoc') {
            const {mediaData, isDirect} = await runDownloadProviders(audioApis);
            if (mediaData) {
                await conn.sendMessage(m.chat, {
                    document: isDirect ? mediaData : {url: mediaData},
                    mimetype: 'audio/mpeg',
                    fileName: `${yt_play[0].title}.mp3`,
                    contextInfo: {}
                }, {quoted: m});
            } else {
                await m.react('❌');
            }
        }

        if (command === 'play4' || command === 'playdoc2') {
            const {mediaData, isDirect} = await runDownloadProviders(videoApis);
            if (mediaData) {
                await conn.sendMessage(m.chat, {
                    document: isDirect ? mediaData : {url: mediaData},
                    fileName: `${yt_play[0].title}.mp4`,
                    caption: renderTemplate(getRequiredPluginMessage('downloads.play.documentVideoCaption'), {
                        title: yt_play[0].title
                    }),
                    thumbnail: yt_play[0].thumbnail,
                    mimetype: 'video/mp4'
                }, {quoted: m})
            } else {
//await m.react('❌');
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
;
