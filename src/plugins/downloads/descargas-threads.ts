import {definePlugin} from '../../core/define-plugin.js'
import fetch from 'node-fetch'
import type {proto} from '@whiskeysockets/baileys'

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

const userRequests: Record<string, UserRequest> = {};

export default definePlugin({
    help: ['thread'],
    tags: ['downloader'],
    command: /^(thread|threads|threaddl)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, args, usedPrefix, command}) {
    if (!args[0]) return m.reply(`*⚠️ ¿Qué estás buscando? Ingresa el link de algún video de Threads!!*\n*• Ejemplo:*\n${usedPrefix + command} https://www.threads.net/@adri_leclerc_/post/C_dSNIOOlpy?xmt=AQGzxbmyveDB91QgFo_KQWzqL6PT2yCy2eg8BkhPTO-6Kw`)

    if (userRequests[m.sender]) return await conn.reply(m.chat, `⏳ Hey @${m.sender.split('@')[0]} pendejo, ya hay una solicitud en proceso. Por favor, espera a que termine antes de hacer otra`, userRequests[m.sender].message || m)
    const {key} = await conn.sendMessage(m.chat, {text: `⌛ 𝙀𝙨𝙥𝙚𝙧𝙚 ✋\n▰▰▰▱▱▱▱▱▱`}, {quoted: m});
    userRequests[m.sender] = {active: true, message: {key, chat: m.chat, fromMe: true}};
    await delay(1000);
    await conn.sendMessage(m.chat, {text: `⌛ 𝙀𝙨𝙥𝙚𝙧𝙚 ✋ \n▰▰▰▰▰▱▱▱▱`, edit: key});
    await delay(1000);
    await conn.sendMessage(m.chat, {text: `⌛ 𝙔𝙖 𝙘𝙖𝙨𝙞 🏃‍♂️💨\n▰▰▰▰▰▰▰▱▱`, edit: key});
    m.react(`⌛`)
    try {
        const res = await fetch(`https://api.agatz.xyz/api/threads?url=${args[0]}`);
        const data = await res.json() as ThreadsAgatzResponse
        const downloadUrl = data.data?.image_urls?.[0] || data.data?.video_urls?.[0];
        if (!downloadUrl) throw new Error('No media found')
        const fileType = downloadUrl.includes('.webp') || downloadUrl.includes('.jpg') || downloadUrl.includes('.png') ? 'image' : 'video';
        if (fileType === 'image') {
            await conn.sendFile(m.chat, downloadUrl, 'threads_image.jpg', '_*Aquí tienes la imagen de Threads*_', m);
            m.react('✅');
        } else if (fileType === 'video') {
            await conn.sendFile(m.chat, downloadUrl, 'threads_video.mp4', '_*Aquí tienes el video de Threads*_', m);
            m.react('✅');
        }
        await conn.sendMessage(m.chat, {text: `✅ 𝘾𝙤𝙢𝙥𝙡𝙚𝙩𝙖𝙙𝙤\n▰▰▰▰▰▰▰▰▰`, edit: key})
    } catch (e: unknown) {
        try {
            const res2 = await fetch(`${info.apis}/download/threads?url=${args[0]}`);
            const data2 = await res2.json() as ThreadsFallbackResponse;
            if (data2.status === true && data2.data && data2.data.length > 0) {
                const downloadUrl = data2.data[0]?.url;
                const fileType = data2.data[0]?.type;
                if (!downloadUrl) throw new Error('No media found')
                if (fileType === 'image') {
                    await conn.sendFile(m.chat, downloadUrl, 'threads_image.jpg', '_*Aquí tienes la imagen de Threads*_', m);
                    m.react('✅');
                } else if (fileType === 'video') {
                    await conn.sendFile(m.chat, downloadUrl, 'threads_video.mp4', '_*Aquí tienes el video de Threads*_', m);
                    m.react('✅');
                }
            }
            await conn.sendMessage(m.chat, {text: `✅ 𝘾𝙤𝙢𝙥𝙡𝙚𝙩𝙖𝙙𝙤\n▰▰▰▰▰▰▰▰▰`, edit: key})
        } catch (e: unknown) {
            m.react(`❌`)
            await conn.sendMessage(m.chat, {
                text: `\`\`\`⚠️ OCURRIO UN ERROR ⚠️\`\`\`\n\n> *Reporta el siguiente error a mi creador con el comando:* #report\n\n>>> ${e} <<<<`,
                edit: key
            })
            console.log(e)
        }
    } finally {
        delete userRequests[m.sender];
    }
    }
})

const delay = (time: number) => new Promise(res => setTimeout(res, time))
