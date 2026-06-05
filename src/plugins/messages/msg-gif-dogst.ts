import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import fs from 'fs'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'

const GIF_FOLDER = path.join(process.cwd(), 'media', 'gifs', 'dogst')

export default definePlugin({
    help: ['msg-gif-dogst'],
    tags: ['fun'],
    command: /^(doggystyle|encuatro|en4|deaperrito|cogeren4|coger4|follar4)$/i,
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

        let mp4s: string[] = []
        try {
            mp4s = fs.readdirSync(GIF_FOLDER).filter(f => f.toLowerCase().endsWith('.mp4'))
        } catch (e: unknown) {
            logError('No se pudo leer la carpeta de medios para dogst:', e)
        }

        if (!mp4s.length) {
            await m.reply('⚠️ Para enviarlo como “mensaje” (inline), convierte los GIFs a MP4 y guárdalos en `media/gifs/dogst`.\n\nEjemplo ffmpeg:\nffmpeg -i input.gif -vf "fps=15,scale=320:-2:flags=lanczos" -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 30 -preset veryfast output.mp4')
            return
        }

        const randomFile = mp4s[Math.floor(Math.random() * mp4s.length)]
        const filePath = path.join(GIF_FOLDER, randomFile)
        const texto = `🍆💦 *${senderTag}* se esta cogiendo de a perrito a *${mentionedTags.join(', ')}*`
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


