import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import yts from 'yt-search';
import type {QuotedMessage} from '../../types/context.js';
import type {YouTubeSearchVideo} from 'yt-search';
import {createUserRequestLocks} from '../../lib/user-request-locks.js';
import {createExpiringMap} from '../../lib/ephemeral-state.js';
import {renderDownloadFailure} from './download-error.js';
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
const userCaptions = createExpiringMap<QuotedMessage>({ttlMs: 10 * 60 * 1000});
const userRequests = createUserRequestLocks();


export default defineSdkPlugin({
    help: ['play', 'play2', 'play3', 'play4', 'playdoc'],
    tags: ['downloader'],
    command: ['play', 'play2', 'play3', 'play4', 'audio', 'video', 'playdoc', 'playdoc2', 'musica'],
    register: true,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.play.missingQuery', {
        command: sdk.usedPrefix + sdk.command
    });
    const command = sdk.command;
    const tipoDescarga = command === 'play' || command === 'musica' ? 'audio' : command === 'play2' ? 'video' : command === 'play3' ? 'audio (documento)' : command === 'play4' ? 'video (documento)' : '';
    if (!userRequests.acquire(sdk.sender)) return sdk.conn.reply(sdk.chatId, sdk.content.renderMessage('downloads.play.locked', {
        user: sdk.sender.split('@')[0]
    }), userCaptions.get(sdk.sender) || m);
    try {
        let videoIdToFind = sdk.text.match(youtubeRegexID) || null;
        const yt_play = await searchYouTube(sdk.args.join(' '));
        if (!yt_play[0]) return sdk.reply.message('downloads.play.noResults')
        const ytResult = await yts(videoIdToFind === null ? sdk.text : 'https://youtu.be/' + videoIdToFind[1]);
        let ytplay2: YouTubeSearchVideo | undefined;
        if (videoIdToFind) {
            const videoId = videoIdToFind[1];
            ytplay2 = ytResult.all.find(item => item.videoId === videoId) || ytResult.videos.find(item => item.videoId === videoId)
        }
        ytplay2 = ytplay2 || ytResult.all?.[0] || ytResult.videos?.[0];
        const PlayText = await sdk.sendMessage({
            text: sdk.content.renderMessage('downloads.play.progress', {
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
                    body: sdk.content.message('downloads.play.adBody'),
                    containsAutoReply: true,
                    mediaType: 1,
                    thumbnailUrl: yt_play[0].thumbnail,
                    sourceUrl: "skyultraplus.com"
                }
            }
        })
        userCaptions.set(sdk.sender, PlayText);

        const [, qualityInput = command === 'play' || command === 'musica' || command === 'play3' ? '320' : '720'] = sdk.text.split(' ');
        const isAudioCommand = command === 'play' || command === 'musica' || command === 'play3';
        const selectedQuality = selectQuality(qualityInput, isAudioCommand);
        const isAudio = command.toLowerCase().includes('mp3') || command.toLowerCase().includes('audio')
        const format = isAudio ? 'mp3' : '720'
        const videoUrl = yt_play[0].url;
        const title = yt_play[0].title;

        const audioApis = buildAudioApis(videoUrl, title, format, selectedQuality);
        const videoApis = buildVideoApis(videoUrl, title, selectedQuality);

        if (command === 'play' || command === 'musica') {
            const {mediaData, isDirect, failures} = await runDownloadProviders(audioApis);
            if (mediaData) {
                const fileSize = await getFileSize(mediaData);
                if (fileSize > LimitAud) {
                    await sdk.sendMessage({
                        document: isDirect ? mediaData : {url: mediaData},
                        mimetype: 'audio/mpeg',
                        fileName: `${yt_play[0].title}.mp3`,
                        contextInfo: {}
                    });
                } else {
                    await sdk.sendMessage({
                        audio: isDirect ? mediaData : {url: mediaData},
                        mimetype: 'audio/mpeg',
                        contextInfo: {}
                    });
                }
            } else {
                return sdk.reply.text(renderDownloadFailure('play', failures));
            }
        }

        if (command === 'play2' || command === 'video') {
            const {mediaData, isDirect, failures} = await runDownloadProviders(videoApis);
            if (mediaData) {
                const fileSize = await getFileSize(mediaData);
                const messageOptions = {
                    fileName: `${yt_play[0].title}.mp4`,
                    caption: sdk.content.renderMessage('downloads.play.videoCaption', {
                        title: yt_play[0].title
                    }),
                    mimetype: 'video/mp4'
                };
                if (fileSize > LimitVid) {
                    await sdk.sendMessage({document: isDirect ? mediaData : {url: mediaData}, ...messageOptions});
                } else {
                    await sdk.sendMessage({
                        video: isDirect ? mediaData : {url: mediaData},
                        thumbnail: yt_play[0].thumbnail, ...messageOptions
                    });
                }
            } else {
                return sdk.reply.text(renderDownloadFailure('play', failures));
            }
        }

        if (command === 'play3' || command === 'playdoc') {
            const {mediaData, isDirect, failures} = await runDownloadProviders(audioApis);
            if (mediaData) {
                await sdk.sendMessage({
                    document: isDirect ? mediaData : {url: mediaData},
                    mimetype: 'audio/mpeg',
                    fileName: `${yt_play[0].title}.mp3`,
                    contextInfo: {}
                });
            } else {
                return sdk.reply.text(renderDownloadFailure('play', failures));
            }
        }

        if (command === 'play4' || command === 'playdoc2') {
            const {mediaData, isDirect, failures} = await runDownloadProviders(videoApis);
            if (mediaData) {
                await sdk.sendMessage({
                    document: isDirect ? mediaData : {url: mediaData},
                    fileName: `${yt_play[0].title}.mp4`,
                    caption: sdk.content.renderMessage('downloads.play.documentVideoCaption', {
                        title: yt_play[0].title
                    }),
                    thumbnail: yt_play[0].thumbnail,
                    mimetype: 'video/mp4'
                })
            } else {
                return sdk.reply.text(renderDownloadFailure('play', failures));
            }
        }
    } catch (error: unknown) {
        logError(error);
        await sdk.reply.react("❌️")
    } finally {
        userRequests.release(sdk.sender);
    }
    }
})

;
