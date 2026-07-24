import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {formatReactionFallbackNotice, selectReactionMedia} from './gif-media.js'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'
import {cleanJid} from '../../utils/jid.js'
import {getNsfwSettings} from '../../services/group-settings.service.js'
import {canUseNsfwGifs} from '../../utils/nsfw-access.js'

const GIF_FOLDER = path.join(process.cwd(), 'resources', 'media', 'reaction-gifs', 'tr')
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
export default defineSdkPlugin({
    help: ['msg-gif-tr'],
    tags: ['fun'],
    feature: 'gifs',
    command: /^(trio|trio-2h-1m|trio-hmh)$/i,
    register: false,
    async execute(m, {sdk, isGroupCreator}) {
    try {
        const nsfwEnabled = canUseNsfwGifs(await getNsfwSettings(sdk.chatId), {isAdmin: sdk.isAdmin, isOwner: sdk.isOwner, isGroupCreator})

        // 1. Recolectar targets (mención + quoted), excluyendo al sender y dedupeando.
        const rawTargets: string[] = []
        if (m.quoted?.sender) rawTargets.push(m.quoted.sender)
        if (Array.isArray(m.mentionedJid)) rawTargets.push(...m.mentionedJid)

        const senderClean = cleanJid(sdk.sender || '')
        const seen = new Set<string>([senderClean])
        const targets: string[] = []
        for (const jid of rawTargets) {
            const c = cleanJid(jid || '')
            if (!c || seen.has(c)) continue
            seen.add(c)
            targets.push(c)
        }

        const groupParticipants = getParticipantsFast(sdk.conn, sdk.chatId, sdk.participants)
        const senderResolved = resolveMention(sdk.sender, groupParticipants)

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

            await sdk.sendMessage({
                text: sdk.content.renderMessage('messages.gifTr.needOneMore', {
                    sender: senderResolved.tag,
                    target: partialResolved.tag
                }),
                mentions: mentionsForReply,
                contextInfo: {mentionedJid: mentionsForReply},
            })
            return
        } else {
            // Escenarios 3 y 5: 2 o más targets → tomar los primeros 2.
            finalTargets = targets.slice(0, 2)
        }

        // 3. Resolver la variante; las reacciones solo NSFW quedan en silencio si no están habilitadas.
        const media = selectReactionMedia({publicFolder: GIF_FOLDER, nsfwFolder: NSFW_GIF_FOLDER, nsfwEnabled})
        const fallbackNotice = formatReactionFallbackNotice({
            reason: media.fallbackReason,
            requestedFolder: media.requestedFolder,
        })
        if (!media.filePath) {
            if (media.fallbackReason === 'nsfw-required') return
            return sdk.reply.text(fallbackNotice)
        }

        // 4. Construir caption, mentions y enviar gif.
        const targetsResolved: ResolvedMention[] = finalTargets.map(j => resolveMention(j, groupParticipants))
        const targetTags = targetsResolved.map(x => x.tag)
        const baseText = senderAlone
            ? sdk.content.renderMessage('messages.gifTr.alone', {sender: senderResolved.tag})
            : sdk.content.renderMessage('messages.gifTr.trio', {sender: senderResolved.tag, targets: targetTags.join('* y *')})
        const texto = [baseText, fallbackNotice].filter(Boolean).join('\n\n')
        const mentions = Array.from(new Set([senderResolved.mentionJid, ...targetsResolved.map(x => x.mentionJid)]))

        await sdk.sendMessage({
            video: {url: media.filePath},
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption: texto,
            mentions,
            // contextInfo propio para evitar que simple.ts inyecte el banner "Ver canal".
            contextInfo: {mentionedJid: mentions},
        })
    } catch (e: unknown) {
        logError(e)
        sdk.reply.react('❌️')
    }
    }
})
