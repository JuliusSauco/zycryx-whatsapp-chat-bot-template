import {sticker} from '../lib/sticker.js'
import fetch from 'node-fetch'
import {definePlugin} from '../core/define-plugin.js'

const actions = {
    lick: {e: '👅', v: 'lamió a', nsfw: false, aliases: []},
    bite: {e: '🧛‍♂️', v: 'mordió a', nsfw: false, aliases: []},
    blush: {e: '😳', v: 'se sonrojó junto a', nsfw: false, aliases: []},
    cuddle: {e: '🥰', v: 'se acurrucó con', nsfw: false, aliases: []},
    handhold: {e: '🤝', v: 'tomó de la mano a', nsfw: false, aliases: []},
    highfive: {e: '✋', v: 'chocó los cinco con', nsfw: false, aliases: []},
    poke: {e: '👉', v: 'hizo poke a', nsfw: false, aliases: []},
    smile: {e: '😊', v: 'sonrió a', nsfw: false, aliases: []},
    wave: {e: '👋', v: 'saludó a', nsfw: false, aliases: []},
    nom: {e: '🍪', v: 'le dio un nom a', nsfw: false, aliases: []},
    dance: {e: '💃', v: 'bailó con', nsfw: false, aliases: []},
    wink: {e: '😉', v: 'guiñó a', nsfw: false, aliases: []},
    happy: {e: '😁', v: 'está feliz con', nsfw: false, aliases: []},
    smug: {e: '😏', v: 'miró con soberbia a', nsfw: false, aliases: []},
    blowjob: {e: '😳', v: 'le hizo oral a', nsfw: true, aliases: ['oral']}
}

const actionByCommand = Object.entries(actions).reduce((map, [k, v]) => {
    // @ts-ignore
    map[k] = {...v, main: k}
    // @ts-ignore
    if (v.aliases) for (const a of v.aliases) map[a] = {...v, main: k}
    return map
}, {})

export default definePlugin({
    // @ts-ignore
    help: Object.keys(actions).flatMap(k => [k, ...(actions[k].aliases || [])]),
    tags: ['sticker'],
    command: new RegExp(`^(${Object.keys(actionByCommand).join('|')})$`, 'i'),
    register: true,
    async execute(m, {conn, command}) {
    const legacyConn = conn as any
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)
        const getName = async (jid: any) => (await conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(m.sender)

        const mentionedNames = await Promise.all(m.mentionedJid.map(async (u: any) => u === m.sender ? 'alguien' : await getName(u)))

        // @ts-ignore
        const act = actionByCommand[command.toLowerCase()] || {
            e: '✨',
            v: 'hizo magia con',
            nsfw: false,
            main: command.toLowerCase()
        }
        const texto = `${act.e} ${senderName} ${act.v} ${mentionedNames.join(', ')}`
        const tipo = act.nsfw ? 'nsfw' : 'sfw'
        const endpoint = act.main
        const {url} = await fetch(`https://api.waifu.pics/${tipo}/${endpoint}`).then((r: any) => r.json() as any)

        let stiker
        try {
            // @ts-ignore
            stiker = await sticker(null, url, texto)
        } catch (e: any) {
        }
        if (stiker) {
            await legacyConn.sendFile(m.chat, stiker, 'sticker.webp', '', m, true, {
                contextInfo: {
                    forwardingScore: 200,
                    isForwarded: false,
                    externalAdReply: {
                        showAdAttribution: false,
                        title: texto,
                        body: '',
                        mediaType: 2,
                        sourceUrl: '',
                        thumbnail: m.pp
                    }
                }
            }, {quoted: m})
            return
        }

        const gifBuffer = await fetch(url).then(r => r.buffer())
        await conn.sendMessage(m.chat, {
            video: gifBuffer,
            gifPlayback: true,
            caption: texto,
            mentions: m.mentionedJid
        }, {quoted: m})
    } catch (e: any) {
        console.error(`[❌ ERROR ${command}]`, e)
        await conn.reply(m.chat, `❌ Ocurrió un error con *${command}*.`, m)
    }
    }
})
