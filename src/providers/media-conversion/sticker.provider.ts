import {ENV} from '../../core/env.js';
import {httpBuffer, httpJson} from '../../lib/http-client.js';
import {pickRandom} from '../../utils/random.js';

export interface TelegramStickerFile {
    fileUrl: string;
}

interface TelegramSticker {
    thumb?: {file_id?: string};
    thumbnail?: {file_id?: string};
}

interface TelegramStickerSetResponse {
    ok?: boolean;
    result?: {
        stickers?: TelegramSticker[];
    };
}

interface TelegramFileResponse {
    ok?: boolean;
    result?: {
        file_path?: string;
    };
}

export interface StickerlyPack {
    name: string;
    author: string;
    stickerCount: number;
    viewCount: number;
    exportCount: number;
    url: string;
    thumbnailUrl: string;
}

interface StickerlyResponse {
    success?: boolean;
    data?: StickerlyPack[];
}

interface QuoteGenerateResponse {
    result?: {
        image?: string;
    };
}

interface TenorMediaFormat {
    url: string;
}

interface TenorResult {
    media_formats?: {
        png_transparent?: TenorMediaFormat;
        gif_transparent?: TenorMediaFormat;
    };
    url?: string;
}

interface TenorResponse {
    results?: TenorResult[];
}

interface NeoxrStickerResponse {
    status?: boolean;
    data?: {
        url?: string;
    };
}

interface WaifuPicsResponse {
    url?: string;
}

interface NekosKissResponse {
    url?: string;
}

export interface QuoteCardInput {
    name: string;
    avatarUrl: string;
    text: string;
}

export type TextStickerKind = 'attp' | 'brat' | 'bratvid';

const slapGifs = [
    'https://media.tenor.com/XiYuU9h44-AAAAAC/anime-slap-mad.gif',
    'https://img.photobucket.com/albums/v639/aoie_emesai/100handslap.gif',
    'https://gifdb.com/images/high/yuruyuri-akari-kyoko-anime-slap-fcacgc0edqhci6eh.gif',
    'https://gifdb.com/images/file/anime-sibling-slap-ptjipasdw3i3hsb0.gif',
    'https://c.tenor.com/Lc7C5mLIVIQAAAAC/tenor.gif',
    'https://i.pinimg.com/originals/71/a5/1c/71a51cd5b7a3e372522b5011bdf40102.gif',
];

export function parseTelegramPackName(url: string): string {
    return url.replace('https://t.me/addstickers/', '');
}

export async function getTelegramStickerFiles(packName: string): Promise<TelegramStickerFile[]> {
    if (!ENV.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
    const telegramApi = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;
    const telegramFileApi = `https://api.telegram.org/file/bot${ENV.TELEGRAM_BOT_TOKEN}`;
    const json = await httpJson<TelegramStickerSetResponse>(`${telegramApi}/getStickerSet?name=${encodeURIComponent(packName)}`, {
        method: 'GET',
        headers: {'User-Agent': 'GoogleBot'},
    });
    const stickers = json.result?.stickers || [];
    const files: TelegramStickerFile[] = [];
    for (const item of stickers) {
        const fileId = item.thumb?.file_id || item.thumbnail?.file_id;
        if (!fileId) continue;
        const file = await httpJson<TelegramFileResponse>(`${telegramApi}/getFile?file_id=${fileId}`);
        if (file.result?.file_path) files.push({fileUrl: `${telegramFileApi}/${file.result.file_path}`});
    }
    return files;
}

export async function searchStickerlyPacks(query: string, limit = 30): Promise<StickerlyPack[]> {
    const json = await httpJson<StickerlyResponse>(`https://api.dorratz.com/v3/stickerly?query=${encodeURIComponent(query)}`);
    if (!json.success || !json.data?.length) return [];
    return json.data.slice(0, limit);
}

export async function generateQuoteCard(input: QuoteCardInput): Promise<Buffer> {
    const json = await httpJson<QuoteGenerateResponse>('https://bot.lyo.su/quote/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            type: 'quote',
            format: 'png',
            backgroundColor: '#000000',
            width: 512,
            height: 768,
            scale: 2,
            messages: [{
                entities: [],
                avatar: true,
                from: {id: 1, name: input.name, photo: {url: input.avatarUrl}},
                text: input.text,
                replyMessage: {},
            }],
        }),
    });
    if (!json.result?.image) throw new Error('Quote API no devolvio imagen');
    return Buffer.from(json.result.image, 'base64');
}

export async function getEmojiMixUrls(emoji1: string, emoji2: string): Promise<string[]> {
    if (!ENV.TENOR_API_KEY) throw new Error('TENOR_API_KEY no configurado');
    const data = await httpJson<TenorResponse>(`https://tenor.googleapis.com/v2/featured?key=${ENV.TENOR_API_KEY}&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`);
    return (data.results || [])
        .map(result => result.media_formats?.png_transparent?.url || result.media_formats?.gif_transparent?.url || result.url || '')
        .filter(Boolean);
}

export async function getTextStickerUrl(kind: TextStickerKind, text: string): Promise<string | null> {
    const encodedText = encodeURI(text);
    const endpoint = kind === 'attp'
        ? `https://api.neoxr.eu/api/attp?text=${encodedText}%21&color=%5B%22%23FF0000%22%2C+%22%2300FF00%22%2C+%22%230000FF%22%5D&apikey=${info.neoxr.key}`
        : kind === 'brat'
            ? `https://api.neoxr.eu/api/brat?text=${encodedText}&apikey=${info.neoxr.key}`
            : `https://api.neoxr.eu/api/bratvid?text=${encodedText}&apikey=${info.neoxr.key}`;
    const json = await httpJson<NeoxrStickerResponse>(endpoint);
    return json.status && json.data?.url ? json.data.url : null;
}

export async function getWaifuActionUrl(endpoint: string, nsfw = false): Promise<string | null> {
    const type = nsfw ? 'nsfw' : 'sfw';
    const {url} = await httpJson<WaifuPicsResponse>(`https://api.waifu.pics/${type}/${endpoint}`);
    return url || null;
}

export async function getKissGifUrl(): Promise<string | null> {
    const {url} = await httpJson<NekosKissResponse>('https://nekos.life/api/kiss');
    return url || null;
}

export function getSlapGifUrl(): string {
    return pickRandom(slapGifs);
}

export function getRemoteMediaBuffer(url: string): Promise<Buffer> {
    return httpBuffer(url);
}
