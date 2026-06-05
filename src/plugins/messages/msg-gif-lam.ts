import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {getAvailableMp4s, pickRandomFile} from './gif-media.js'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'

const GIF_FOLDER = path.join(process.cwd(), 'media', 'gifs', 'lam')

export default definePlugin({
    help: ['msg-gif-lam'],
    tags: ['fun'],
    command: /^(lick|lamer|lamida|babear)$/i,
    register: false,
    async execute(m, {conn, participants}) {
    try {
        if (!Array.isArray(m.mentionedJid)) m.mentionedJid = []
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const groupParticipants = getParticipantsFast(conn, m.chat, participants)

        const senderResolved = resolveMention(m.sender, groupParticipants)
        const mentionedResolved: ResolvedMention[] = m.mentionedJid.map((jid: string) => resolveMention(jid, groupParticipants))
        const senderTag = senderResolved.tag
        const mentionedTags = mentionedResolved.map((x: ResolvedMention) => x.tag)

        const mp4s = getAvailableMp4s(GIF_FOLDER)

        if (!mp4s.length) {
            await m.reply('⚠️ Para enviarlo como “mensaje” (inline), convierte los GIFs a MP4 y guárdalos en `media/gifs/ks`.\n\nEjemplo ffmpeg:\nffmpeg -i input.gif -vf "fps=15,scale=320:-2:flags=lanczos" -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 30 -preset veryfast output.mp4')
            return
        }

        const randomFile = pickRandomFile(mp4s)
        const filePath = path.join(GIF_FOLDER, randomFile)
        const texto = `😝👅 *${senderTag}* relamio bien rico a *${mentionedTags.join(', ')}* 😋😜`
        const mentions = Array.from(new Set([senderResolved.mentionJid, ...mentionedResolved.map((x: ResolvedMention) => x.mentionJid)]))

        await conn.sendMessage(m.chat, {
            video: {url: filePath},
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption: texto,
            mentions,
            // contextInfo propio para evitar que simple.ts inyecte el banner "Ver canal".
            contextInfo: {mentionedJid: mentions},
        }, {quoted: m})
    } catch (e: unknown) {
        logError(e)
        m.react('❌️')
    }
    }
})


