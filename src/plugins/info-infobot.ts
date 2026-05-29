import {getSubbotConfig} from '../services/subbot.service.js'
import {countChats, countChatsByBot} from '../services/chat.service.js'
import {countUsers} from '../services/user.service.js'
import {sumCommandUsage} from '../services/stats.service.js'
import {definePlugin} from '../core/define-plugin.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import speed from 'performance-now'
import {sizeFormatter} from 'human-readable'

const format = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal: any, symbol: any) => `${literal} ${symbol}B`
})

const getCpuUsage = () => {
    const load = os.loadavg()[0]
    const cores = os.cpus().length
    return ((load / cores) * 100).toFixed(2) + '%'
}

const getFolderSize = (folderPath: any) => {
    let totalSize = 0

    function calculateSize(directory: any) {
        const files = fs.readdirSync(directory)
        for (const file of files) {
            const filePath = path.join(directory, file)
            const stats = fs.statSync(filePath)
            if (stats.isDirectory()) calculateSize(filePath)
            else totalSize += stats.size
        }
    }

    calculateSize(folderPath)
    return humanFileSize(totalSize)
}

const getSystemInfo = async () => {
    const cpuInfo = os.cpus()
    const modeloCPU = cpuInfo[0]?.model || 'N/A'
    const memoriaUso = process.memoryUsage()
    const usoRam = humanFileSize(memoriaUso.rss)
    const usoCpu = getCpuUsage()
    return {
        plataforma: os.platform(),
        núcleosCPU: cpuInfo.length,
        modeloCPU,
        arquitecturaSistema: os.arch(),
        versiónSistema: os.release(),
        procesosActivos: os.loadavg()[0],
        usoRam,
        usoCpu,
        tiempoActividad: toTime(os.uptime() * 1000)
    }
}

export default definePlugin({
    help: ['infobot'],
    tags: ['main'],
    command: /^(infobot|informacionbot|infololi)$/i,
    register: true,
    async execute(m, {conn}) {
    const legacyConn = conn as any;
    const start = speed();
    const subbotsCount = (global.conns || []).filter(sock => {
        const id = sock?.userId || sock?.user?.id?.split('@')[0]
        const isAlive = sock?.userId && typeof sock?.uptime === 'number'
        const mainId = conn.user?.id?.split('@')[0]?.split(':')[0]
        return isAlive && id && id !== mainId
    }).length
    const botId = (conn.user?.id || '').split(':')[0].replace('@s.whatsapp.net', '');
    const botChats = await countChatsByBot(botId);
    const totalGrupos = botChats.totalGroups;
    const gruposUnidos = botChats.joinedGroups;
    const gruposSalidos = totalGrupos - gruposUnidos;
    const privates = botChats.privateChats;
    const chatsTotales = totalGrupos + privates;
    const totalPlugins = Object.values(global.plugins).filter((p: any) => p.help && p.tags).length;
    const latencia = speed() - start;
    const uptime = process.uptime() * 1000;
    const config = await getSubbotConfig(legacyConn.user?.id || legacyConn.user?.jid);
    const prefijos = Array.isArray(config.prefix) ? config.prefix.join(' ') : config.prefix;
    const modo = config.mode === 'private' ? 'Private' : 'Públic';
    const userCounts = await countUsers();
    const totalUsers = userCounts.total;
    const registeredUsers = userCounts.registered;
    const totalChats = await countChats();
    const comandosEjecutados = await sumCommandUsage();
    const sistema = await getSystemInfo();

    const teks = `*≡ INFOBOT*

*INFORMACIÓN*
*▣ Grupos total:* ${totalGrupos}
*▣ Grupos unidos:* ${gruposUnidos}
*▣ Grupo salidos:* ${gruposSalidos}
*▣ Chats privado:* ${privates}
*▣ Chats totales:* ${chatsTotales}
*▣ Sub-Bots conectado:* ${subbotsCount}
*▣ Total plugins:* ${totalPlugins}
*▣ Mode:* ${modo}
*▣ Prefix:* ${prefijos}
*▣ Velocidad:* ${latencia.toFixed(4)} ms
*▣ Actividad:* ${new Date(uptime).toISOString().substr(11, 8)}

*▣ Comandos ejecutados:* ${toNum(comandosEjecutados)} / ${comandosEjecutados}
*▣ Grupos registrados:* ${toNum(totalChats)} / ${totalChats}
*▣ Usuarios registrados:* ${toNum(registeredUsers)} de ${toNum(totalUsers)} users totales

*≡ S E R V E R*
▣ *Servidor:* ${os.hostname()}
▣ *Plataforma:* ${sistema.plataforma}
▣ *RAM usada:* ${sistema.usoRam}
▣ *Uso de CPU:* ${sistema.usoCpu}
▣ *Uptime:* ${sistema.tiempoActividad}`;
    await conn.sendMessage(m.chat, {
        text: teks,
        contextInfo: {
            mentionedJid: null,
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363321650707484@newsletter",
                newsletterName: "LoliBot ✨️"
            },
            externalAdReply: {
                mediaUrl: [info.nna, info.nna2, info.md].getRandom(),
                mediaType: 2,
                description: null,
                title: `INFO - BOT`,
                previewType: 0,
                thumbnailUrl: "https://telegra.ph/file/39fb047cdf23c790e0146.jpg",
                sourceUrl: info.yt
            } as any
        }
    }, {quoted: m})
    }
})

const toNum = (n: any) => {
    if (!n || isNaN(n)) return '0'
    return n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' :
        n >= 1_000 ? (n / 1_000).toFixed(1) + 'k' : n.toString()
}

const humanFileSize = (bytes: any) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

const toTime = (ms: any) => {
    const d = Math.floor(ms / 86400000)
    const h = Math.floor(ms / 3600000) % 24
    const m = Math.floor(ms / 60000) % 60
    const s = Math.floor(ms / 1000) % 60
    return `${d}d ${h}h ${m}m ${s}s`
}


