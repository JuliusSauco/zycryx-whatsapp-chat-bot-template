import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import axios from 'axios';
import {pinterest} from '../../lib/scraper.js';

interface PinterestResult {
    title: string
    description: string
    image: string
}

interface ScraperPin {
    title?: string
    uploader?: {username?: string}
    media?: {images?: {orig?: {url?: string}}}
}

interface SiputzPinterestItem {
    grid_title?: string
    images_url?: string
}

interface DorratzPinterestItem {
    fullname?: string
    upload_by?: string
    followers?: string | number
    image?: string
}

interface MainPinterestItem {
    description?: string
    name?: string
    username?: string
    image?: string
}

export default definePlugin({
    help: ['pinterest <keyword>'],
    tags: ['buscadores'],
    command: /^(pinterest)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, usedPrefix, command, text}) {
    if (!text) return m.reply(`*⚠️ Ingresa el término de búsqueda.*\nEj: ${usedPrefix + command} nayeon`)
    m.react("⌛");
    try {
        const downloadAttempts: Array<() => Promise<PinterestResult[]>> = [async () => {
            const response = await pinterest.search(text, 6);
            const pins = (response.result.pins as ScraperPin[]).slice(0, 5);
            return pins.map(pin => ({
                title: pin.title || text,
                description: `🔎 Por: ${pin.uploader?.username || 'Desconocido'}`,
                image: pin.media?.images?.orig?.url || ''
            })).filter(result => result.image);
        },
            async () => {
                const res = await axios.get<{data?: SiputzPinterestItem[]}>(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}`);
                const data = (res.data.data || []).slice(0, 5);
                return data.map(result => ({
                    title: result.grid_title || text,
                    description: '',
                    image: result.images_url || ''
                })).filter(result => result.image);
            },
            async () => {
                const res = await axios.get<DorratzPinterestItem[]>(`https://api.dorratz.com/v2/pinterest?q=${text}`);
                const data = res.data.slice(0, 5);
                return data.map(result => ({
                    title: result.fullname || text,
                    description: `*🔸️Autor:* ${result.upload_by || 'Desconocido'}\n*🔸️ Seguidores:* ${result.followers || 'N/A'}`,
                    image: result.image || ''
                })).filter(result => result.image);
            },
            async () => {
                const res = await axios.get<{data?: MainPinterestItem[]}>(`${info.apis}/search/pinterestv2?text=${encodeURIComponent(text)}`);
                const data = (res.data.data || []).slice(0, 5);
                return data.map(result => ({
                    title: result.description || text,
                    description: `🔎 Autor: ${result.name || 'Desconocido'} (@${result.username || 'N/A'})`,
                    image: result.image || ''
                })).filter(result => result.image);
            }];

        let results: PinterestResult[] | null = null;
        for (const attempt of downloadAttempts) {
            try {
                results = await attempt();
                if (results && results.length > 0) break;
            } catch (err: unknown) {
                logError(`Error in attempt: ${err instanceof Error ? err.message : String(err)}`);
                continue;
            }
        }

        if (!results || results.length === 0) throw new Error(`❌ No se encontraron resultados para "${text}".`);
        const medias = results.map(result => ({type: "image", data: {url: result.image}}));
        await conn.sendAlbumMessage(m.chat, medias, `✅ Resultados para: ${text}`, m);
        m.react("✅️");
    } catch (e: unknown) {
        await m.reply(e instanceof Error ? e.message : `❌ No se encontraron resultados para "${text}".`);
        m.react("❌️");
    }
    }
});
