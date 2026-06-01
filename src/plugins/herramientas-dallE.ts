import fetch from 'node-fetch';
import axios from 'axios';
import * as cheerio from "cheerio"
import {definePlugin} from '../core/define-plugin.js'
import {ENV} from '../core/env.js'

interface DorratzImageResponse {
    data?: {
        status?: string;
        image_link?: string;
    };
}

interface UnsplashResponse {
    results?: Array<{
        urls?: {
            regular?: string;
        };
    }>;
}

interface BetabotzImageResponse {
    result?: string[];
}

interface VihangaImagineResponse {
    data?: string;
}

export default definePlugin({
    help: ["dalle"],
    tags: ["buscadores"],
    command: ['dall-e', 'dalle', 'ia2', 'cimg', 'openai3', 'a-img', 'aimg', 'imagine'],
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(`*⚠️ 𝐈𝐧𝐠𝐫𝐞𝐬𝐞 𝐮𝐧 𝐭𝐞𝐱𝐭𝐨 𝐩𝐚𝐫𝐚 𝐜𝐫𝐞𝐚𝐫 𝐮𝐧𝐚 𝐢𝐦𝐚𝐠𝐞𝐧 𝐲 𝐚𝐬𝐢 𝐮𝐬𝐚𝐫 𝐥𝐚 𝐟𝐮𝐧𝐜𝐢𝐨𝐧 𝐝𝐞 𝐝𝐚𝐥𝐥-𝐞*\n\n*• 𝐄𝐣𝐞𝐦𝐩𝐥𝐨:*\n*${usedPrefix + command} gatitos llorando*`)
    m.react('⌛')
    try {
        let response = await fetch(`https://api.dorratz.com/v3/ai-image?prompt=${text}`)
        let res = await response.json() as DorratzImageResponse
        if (res.data?.status === "success" && res.data.image_link) {
            const imageUrl = res.data.image_link;
            await conn.sendFile(m.chat, imageUrl, 'error.jpg', `_💫 Resutados: ${text}_\n\n> *✨ Imagen generada por IA ✨*`, m);
            m.react('✅');
        }
    } catch (e: unknown) {
        try {
            let answer = await flux(text)
            if (!answer) throw new Error('Flux no devolvió imagen')
            await conn.sendFile(m.chat, answer, 'error.jpg', `_💫 Resutados: ${text}_\n\n> *✨ Imagen generada por IA ✨*`, m);
//conn.sendMessage(m.chat, { image: { url: answer }, caption: `_💫 Resutados: ${text}_\n\n> *✨ Imagen generada por IA ✨*`, mentions: [m.sender],}, { quoted: m })
            m.react('✅');
        } catch (e: unknown) {
            try {
                if (!ENV.UNSPLASH_ACCESS_KEY) throw new Error('UNSPLASH_ACCESS_KEY no configurado');
                const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(text)}&client_id=${ENV.UNSPLASH_ACCESS_KEY}`;
                const response = await axios.get<UnsplashResponse>(url);
                const imageUrl = response.data.results?.[0]?.urls?.regular;
                if (!imageUrl) return m.react("❌")
                await conn.sendFile(m.chat, imageUrl, 'error.jpg', `_*Resultado de:* ${text}_`, m);
                m.react('✅');
            } catch (e: unknown) {
                try {
                    if (!ENV.BETABOTZ_API_KEY) throw new Error('BETABOTZ_API_KEY no configurado');
                    const url = `https://api.betabotz.eu.org/api/search/bing-img?text=${encodeURIComponent(text)}&apikey=${ENV.BETABOTZ_API_KEY}`;
                    const response = await axios.get<BetabotzImageResponse>(url);
                    if (!response.data.result || response.data.result.length === 0) return m.react("❌")
                    const imageUrl = response.data.result[0];
                    await conn.sendFile(m.chat, imageUrl, 'error.jpg', `_*Resultado de:* ${text}_`, m);
                    m.react('✅');
                } catch (e: unknown) {
                    try {
                        const tiores1 = await fetch(`https://vihangayt.me/tools/imagine?q=${text}`);
                        const json1 = await tiores1.json() as VihangaImagineResponse;
                        if (!json1.data) throw new Error('Vihanga no devolvió imagen')
                        await conn.sendFile(m.chat, json1.data, 'error.jpg', `_*Resultado de:* ${text}_`, m);
                    } catch (e: unknown) {
                        try {
                            if (!ENV.LOLHUMAN_API_KEY) throw new Error('LOLHUMAN_API_KEY no configurado');
                            const tiores4 = await conn.getFile?.(`https://api.lolhuman.xyz/api/dall-e?apikey=${ENV.LOLHUMAN_API_KEY}&text=${text}`);
                            if (!tiores4?.data) throw new Error('No se pudo obtener la imagen generada');
                            await conn.sendFile(m.chat, tiores4.data, 'error.jpg', `_*Resultado de:* ${text}_`, m);
                            m.react('✅')
                        } catch (error: unknown) {
                            console.log('[❗] Error, ninguna api funcional.\n' + error);
                            m.reply(`error ${error}`)
                            m.react('❌')
                        }
                    }
                }
            }
        }
    }
    }
});

const flux = async (prompt: string): Promise<string | null> => {
    const url = `https://lusion.regem.in/access/flux.php?prompt=${encodeURIComponent(prompt)}`
    const headers = {
        Accept: "*/*",
        "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://lusion.regem.in/?ref=taaft&utm_source=taaft&utm_medium=referral",
    }
    const response = await fetch(url, {headers})
    const html = await response.text()
    const $ = cheerio.load(html)
    return $("a.btn-navy.btn-sm.mt-2").attr("href") || null
}

const writer = async (input: string) => {
    const url = `https://ai-server.regem.in/api/index.php`
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://regem.in/ai-writer/",
    }
    const formData = new URLSearchParams()
    formData.append("input", input)
    const response = await fetch(url, {method: "POST", headers, body: formData})
    return response.text()
}

const rephrase = async (input: string) => {
    const url = `https://ai-server.regem.in/api/rephrase.php`
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://regem.in/ai-rephrase-tool/",
    }
    const formData = new URLSearchParams()
    formData.append("input", input)
    const response = await fetch(url, {method: "POST", headers, body: formData})
    return response.text()
}
