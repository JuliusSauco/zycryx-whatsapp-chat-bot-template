import {botInfo} from "../../core/config.js";
import {logError} from '../../lib/logger.js';
import {sticker} from '../../lib/sticker.js'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {getRemoteMediaBuffer, getWaifuActionUrl} from '../../providers/media-conversion/sticker.provider.js';

interface ActionConfig {
    e: string;
    v: string;
    nsfw: boolean;
    aliases: string[];
}

type ActionEntry = ActionConfig & {main: string};

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
} satisfies Record<string, ActionConfig>

const documentedStickerActions = ['blush', 'highfive', 'smile', 'wave', 'smug'];

const actionByCommand = Object.entries(actions).reduce<Record<string, ActionEntry>>((map, [k, v]) => {
    map[k] = {...v, main: k}
    if (v.aliases) for (const a of v.aliases) map[a] = {...v, main: k}
    return map
}, {})

export default defineSdkPlugin({
    help: documentedStickerActions,
    tags: ['sticker'],
    command: new RegExp(`^(${Object.keys(actionByCommand).join('|')})$`, 'i'),
    register: true,
    async execute(m, {sdk}) {
    try {
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(sdk.sender)
        const getName = async (jid: string) => (await sdk.conn.getName(jid).catch(() => null)) || `+${jid.split('@')[0]}`
        const senderName = await getName(sdk.sender)

        const mentionedNames = await Promise.all(m.mentionedJid.map(async u => u === sdk.sender ? 'alguien' : await getName(u)))

        const act = actionByCommand[sdk.command.toLowerCase()] || {
            e: '✨',
            v: 'hizo magia con',
            nsfw: false,
            main: sdk.command.toLowerCase()
        }
        const texto = `${act.e} ${senderName} ${act.v} ${mentionedNames.join(', ')}`
        const endpoint = act.main
        const url = await getWaifuActionUrl(endpoint, act.nsfw)
        if (!url) return sdk.reply.message('stickers.common.apiNoSticker')

        let stiker
        try {
            stiker = await sticker(null, url, texto, botInfo.author)
        } catch (e: unknown) {
        }
        if (stiker) {
            await sdk.sendFile(stiker, 'sticker.webp', '', m, true, {
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
            })
            return
        }

        const gifBuffer = await getRemoteMediaBuffer(url)
        await sdk.sendMessage({
            video: gifBuffer,
            gifPlayback: true,
            caption: texto,
            mentions: m.mentionedJid
        })
    } catch (e: unknown) {
        logError(`[❌ ERROR ${sdk.command}]`, e)
        await sdk.reply.message('stickers.common.actionError', {command: sdk.command})
    }
    }
})
