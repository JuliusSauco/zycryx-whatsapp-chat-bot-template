import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'
import {getCachedText} from '../../lib/static-resource-cache.js'

/** Archivo con las frases, separadas por '|'. Path dinámico (sirve en producción). */
const TXT_PATH = path.join(process.cwd(), 'media', 'text', 'msg-text-ins.txt')

/** Lee las frases del .txt y las separa por '|'. */
function getFrases(): string[] {
    const content = getCachedText(TXT_PATH)
    if (!content) {
        logError('No se pudo leer media/text/msg-text-ins.txt')
        return []
    }

    return content
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
}

export default definePlugin({
    help: ['msg-text-ins'],
    tags: ['fun'],
    command: /^(ins|insult|insulto|insultar)$/i,
    register: false,
    async execute(m, {conn, participants}) {
    try {
        // mención > respuesta > a sí mismo (misma lógica que los msg-gif-*).
        if (!Array.isArray(m.mentionedJid)) m.mentionedJid = []
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const frases = getFrases()
        if (!frases.length) {
            await m.reply('⚠️ No hay frases en `media/text/msg-text-ins.txt`. Sepáralas con el carácter |.')
            return
        }

        const groupParticipants = getParticipantsFast(conn, m.chat, participants)
        const mentionedResolved: ResolvedMention[] = m.mentionedJid.map((jid: string) => resolveMention(jid, groupParticipants))
        const mentionedTags = mentionedResolved.map((x: ResolvedMention) => x.tag)
        const mentions = Array.from(new Set(mentionedResolved.map((x: ResolvedMention) => x.mentionJid)))

        const fraseRandom = frases[Math.floor(Math.random() * frases.length)]
        const texto = `${mentionedTags.join(' ')} ${fraseRandom}`

        await conn.sendMessage(m.chat, {
            text: texto,
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


