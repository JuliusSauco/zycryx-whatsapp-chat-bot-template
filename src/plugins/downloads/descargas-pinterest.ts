import {definePlugin} from '../../core/define-plugin.js'
import {pinterest} from '../../lib/scraper.js';
import {runFirstProvider, type Provider} from '../../lib/provider-fallback.js';
import {httpJson} from '../../lib/http-client.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.pinterest.missingQuery'), {
        command: usedPrefix + command
    }))
    m.react("⌛");
    try {
        const downloadProviders: Array<Provider<PinterestResult[]>> = [
            {
                name: 'scraper-pinterest',
                run: async () => {
                    const response = await pinterest.search(text, 6);
                    const pins = (response.result.pins as ScraperPin[]).slice(0, 5);
                    const results = pins.map(pin => ({
                        title: pin.title || text,
                        description: renderTemplate(getRequiredPluginMessage('downloads.pinterest.author'), {
                            author: pin.uploader?.username || getRequiredPluginMessage('downloads.pinterest.unknownAuthor')
                        }),
                        image: pin.media?.images?.orig?.url || ''
                    })).filter(result => result.image);
                    return results.length ? results : null;
                },
            },
            {
                name: 'siputz-pinterest',
                run: async () => {
                    const res = await httpJson<{data?: SiputzPinterestItem[]}>(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}`);
                    const data = (res.data || []).slice(0, 5);
                    const results = data.map(result => ({
                        title: result.grid_title || text,
                        description: '',
                        image: result.images_url || ''
                    })).filter(result => result.image);
                    return results.length ? results : null;
                },
            },
            {
                name: 'dorratz-pinterest',
                run: async () => {
                    const res = await httpJson<DorratzPinterestItem[]>(`https://api.dorratz.com/v2/pinterest?q=${text}`);
                    const data = res.slice(0, 5);
                    const results = data.map(result => ({
                        title: result.fullname || text,
                        description: renderTemplate(getRequiredPluginMessage('downloads.pinterest.authorStats'), {
                            author: result.upload_by || getRequiredPluginMessage('downloads.pinterest.unknownAuthor'),
                            followers: result.followers || getRequiredPluginMessage('downloads.pinterest.notAvailable')
                        }),
                        image: result.image || ''
                    })).filter(result => result.image);
                    return results.length ? results : null;
                },
            },
            {
                name: 'main-pinterest',
                run: async () => {
                    const res = await httpJson<{data?: MainPinterestItem[]}>(`${info.apis}/search/pinterestv2?text=${encodeURIComponent(text)}`);
                    const data = (res.data || []).slice(0, 5);
                    const results = data.map(result => ({
                        title: result.description || text,
                        description: renderTemplate(getRequiredPluginMessage('downloads.pinterest.authorHandle'), {
                            name: result.name || getRequiredPluginMessage('downloads.pinterest.unknownAuthor'),
                            username: result.username || getRequiredPluginMessage('downloads.pinterest.notAvailable')
                        }),
                        image: result.image || ''
                    })).filter(result => result.image);
                    return results.length ? results : null;
                },
            },
        ];

        const results = await runFirstProvider(downloadProviders, renderTemplate(getRequiredPluginMessage('downloads.pinterest.noResults'), {query: text}));
        const medias = results.map(result => ({type: "image", data: {url: result.image}}));
        await conn.sendAlbumMessage(m.chat, medias, renderTemplate(getRequiredPluginMessage('downloads.pinterest.albumCaption'), {query: text}), m);
        m.react("✅️");
    } catch (e: unknown) {
        await m.reply(e instanceof Error ? e.message : renderTemplate(getRequiredPluginMessage('downloads.pinterest.noResults'), {query: text}));
        m.react("❌️");
    }
    }
});
