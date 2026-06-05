import {logError, logInfo, logWarn} from '../../lib/logger.js';
//import {googleIt} from '@bochilteam/scraper';
import {definePlugin} from '../../core/define-plugin.js';
import {ENV} from '../../core/env.js';
import {httpJson} from '../../lib/http-client.js';

interface GoogleSearchResult {
    title?: string;
    url?: string;
    formattedUrl?: string;
    description?: string;
    snippet?: string;
}

interface GoogleSearchResponse {
    status?: boolean;
    data?: GoogleSearchResult[];
}

export default definePlugin({
    help: ['google', 'googlef'].map((v) => v + ' <pencarian>'),
    tags: ['buscadores'],
    command: /^googlef?$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, command, args, usedPrefix}) {
    if (!text) return m.reply(`⚠️ 𝙌𝙪𝙚 𝙚𝙨𝙩𝙖 𝙗𝙪𝙨𝙘𝙖𝙣𝙙𝙤 🤔 𝙀𝙨𝙘𝙧𝙞𝙗𝙖 𝙡𝙤 𝙦𝙪𝙚 𝙦𝙪𝙞𝙚𝙧𝙖 𝙗𝙪𝙨𝙘𝙖𝙧\n• 𝙀𝙟: ${usedPrefix + command} loli`)
    m.react("⌛")
    try {
        const data = await httpJson<GoogleSearchResponse>(`${info.apis}/search/googlesearch?query=${text}`);

        if (data.status && data.data && data.data.length > 0) {
            let teks = `\`🔍 𝘙𝘌𝘚𝘜𝘓𝘛𝘈𝘋𝘖𝘚 𝘋𝘌:\` ${text}\n\n`;
            for (let result of data.data) {
                teks += `*${result.title}*\n_${result.url}_\n_${result.description}_\n\n─────────────────\n\n`;
            }

            const ss = `https://image.thum.io/get/fullpage/https://google.com/search?q=${encodeURIComponent(text)}`;
            conn.sendFile(m.chat, ss, 'result.png', teks, m);
            m.react("✅")
        }
    } catch (e: unknown) {
        try {
            if (!ENV.ALYACHAN_API_KEY) throw new Error('ALYACHAN_API_KEY no configurado');
            const data = await httpJson<GoogleSearchResponse>(`https://api.alyachan.dev/api/google?q=${text}&apikey=${ENV.ALYACHAN_API_KEY}`);

            if (data.status && data.data && data.data.length > 0) {
                let teks = `🔍 *Resultados de:* ${text}\n\n`;
                for (let result of data.data) {
                    teks += `📌 *${result.title}*\n🔗 _${result.formattedUrl || result.url}_\n📖 _${result.snippet || result.description}_\n\n─────────────────\n\n`;
                }
                const ss = `https://image.thum.io/get/fullpage/https://google.com/search?q=${encodeURIComponent(text)}`;
                conn.sendFile(m.chat, ss, 'result.png', teks, m);
            }
        } catch (e: unknown) {
            logInfo(e);
            m.react("❌")
        }
    }
    }
});
