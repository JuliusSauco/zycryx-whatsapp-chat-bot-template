import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {getAvailableMp4s, pickRandomFile} from './gif-media.js'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'
import {cleanJid} from '../../utils/jid.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
import {getNsfwSettings} from '../../services/group-settings.service.js'
import {canUseNsfw} from '../../utils/nsfw-access.js'

const GIF_FOLDER = path.join(process.cwd(), 'resources', 'media', 'reaction-gifs', 'dp')
const NSFW_GIF_FOLDER = path.join(GIF_FOLDER, 'nsfw')

/**
 * Trío — requiere 2 targets además del sender.
 *
 * Escenarios:
 *  1) Sin etiqueta ni quoted → bot manda el gif etiquetando sólo al sender (broma: trío solo).
 *  2) 1 etiquetado          → bot pide etiquetar 1 persona más (sin gif).
 *  3) 2+ etiquetados        → bot manda el gif con los primeros 2.
 *  4) Responde a un msg sin etiquetar más     → bot pide 1 persona más (sin gif).
 *  5) Responde a un msg + etiqueta a 1 más    → bot manda el gif con ambos.
 */
export default definePlugin({
    help: ['msg-gif-dp'],
    tags: ['fun'],
    command: /^(trio|trio-2h-1m|trio-hmh)$/i,
    register: false,
    async execute(m, {conn, participants, isAdmin, isOwner, isGroupCreator}) {
    try {
        const nsfwEnabled = canUseNsfw(await getNsfwSettings(m.chat), {isAdmin, isOwner, isGroupCreator})
        const selectedFolder = nsfwEnabled ? NSFW_GIF_FOLDER : GIF_FOLDER
        const selectedFolderLabel = nsfwEnabled
            ? 'resources/media/reaction-gifs/dp/nsfw'
            : 'resources/media/reaction-gifs/dp'

        // 1. Recolectar targets (mención + quoted), excluyendo al sender y dedupeando.
        const rawTargets: string[] = []
        if (m.quoted?.sender) rawTargets.push(m.quoted.sender)
        if (Array.isArray(m.mentionedJid)) rawTargets.push(...m.mentionedJid)

        const senderClean = cleanJid(m.sender || '')
        const seen = new Set<string>([senderClean])
        const targets: string[] = []
        for (const jid of rawTargets) {
            const c = cleanJid(jid || '')
            if (!c || seen.has(c)) continue
            seen.add(c)
            targets.push(c)
        }

        const groupParticipants = getParticipantsFast(conn, m.chat, participants)
        const senderResolved = resolveMention(m.sender, groupParticipants)

        // 2. Resolver según cantidad de targets disponibles.
        let finalTargets: string[]
        let senderAlone = false

        if (targets.length === 0) {
            // Escenario 1: sin etiqueta ni quoted → sólo el sender.
            finalTargets = [senderClean]
            senderAlone = true
        } else if (targets.length === 1) {
            // Escenarios 2 y 4: falta 1 más.
            const partialResolved = resolveMention(targets[0], groupParticipants)
            const mentionsForReply = [senderResolved.mentionJid, partialResolved.mentionJid]

            await conn.sendMessage(m.chat, {
                text: renderTemplate(getRequiredPluginMessage('messages.gifDp.needOneMore'), {
                    sender: senderResolved.tag,
                    target: partialResolved.tag
                }),
                mentions: mentionsForReply,
                contextInfo: {mentionedJid: mentionsForReply},
            }, {quoted: m})
            return
        } else {
            // Escenarios 3 y 5: 2 o más targets → tomar los primeros 2.
            finalTargets = targets.slice(0, 2)
        }

        // 3. Cargar mp4s disponibles.
        const mp4s = getAvailableMp4s(selectedFolder)

        if (!mp4s.length) {
            await m.reply(renderTemplate(getRequiredPluginMessage('messages.gifReactions.ffmpegHint'), {
                folder: selectedFolderLabel,
            }))
            return
        }

        // 4. Construir caption, mentions y enviar gif.
        const targetsResolved: ResolvedMention[] = finalTargets.map(j => resolveMention(j, groupParticipants))
        const targetTags = targetsResolved.map(x => x.tag)
        const randomFile = pickRandomFile(mp4s)
        const filePath = path.join(selectedFolder, randomFile)
        const texto = senderAlone
            ? renderTemplate(getRequiredPluginMessage('messages.gifDp.alone'), {sender: senderResolved.tag})
            : renderTemplate(getRequiredPluginMessage('messages.gifDp.trio'), {sender: senderResolved.tag, targets: targetTags.join('* y *')})
        const mentions = Array.from(new Set([senderResolved.mentionJid, ...targetsResolved.map(x => x.mentionJid)]))

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
