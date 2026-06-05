import {definePlugin} from '../../core/define-plugin.js'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'
import {getAvailableMp4s, pickRandomFile} from './gif-media.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const GIF_FOLDER = path.join(process.cwd(), 'media', 'gifs', 'kl')
const FFMPEG_HINT =
    '⚠️ No hay videos en `media/gifs/kl`.\n\n' +
    'Convierte tus GIFs a MP4 con ffmpeg:\n' +
    '```\nffmpeg -i input.gif -vf "fps=15,scale=320:-2:flags=lanczos" \\\n' +
    '  -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart \\\n' +
    '  -crf 30 -preset veryfast output.mp4\n```'

// ─── Handler ──────────────────────────────────────────────────────────────────

export default definePlugin({
    help: ['msg-gif-kill'],
    tags: ['fun'],
    command: /^(kill|asesinar|matar|slay|stab)$/i,
    register: false,
    async execute(m, {conn, participants}) {
    // 1. Collect target JIDs (mentioned > quoted > self)
    const rawMentions: string[] = Array.isArray(m.mentionedJid)
        ? [...m.mentionedJid]
        : []
    if (m.quoted?.sender) rawMentions.push(m.quoted.sender)
    if (!rawMentions.length) rawMentions.push(m.sender)

    // 2. Check media availability (sync, cached)
    const mp4s = getAvailableMp4s(GIF_FOLDER)
    if (!mp4s.length) {
        await m.reply(FFMPEG_HINT)
        return
    }

    // 3. Participants ya vienen del handler (buildContext). Sin fetch de red.
    const groupParticipants = getParticipantsFast(conn, m.chat, participants)

    // 4. Resolve all JIDs
    const resolved = [m.sender, ...rawMentions].map(jid => resolveMention(jid, groupParticipants))
    const [senderResolved, ...targetsResolved] = resolved

    // 5. Build caption & deduplicated mention list
    const targetTags = targetsResolved.map((r: ResolvedMention) => `*${r.tag}*`).join(', ')
    const caption = `🔪 *${senderResolved.tag}* asesinó fríamente a ${targetTags} 😵`

    const mentions = [
        ...new Set([
            senderResolved.mentionJid,
            ...targetsResolved.map((r: ResolvedMention) => r.mentionJid),
        ]),
    ]

    // 6. Send
    await conn.sendMessage(
        m.chat,
        {
            video: {url: path.join(GIF_FOLDER, pickRandomFile(mp4s))},
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption,
            mentions,
            // contextInfo propio para evitar que simple.ts inyecte el banner "Ver canal".
            contextInfo: {mentionedJid: mentions},
        },
        {quoted: m}
    )
    }
})

// ─── Metadata ─────────────────────────────────────────────────────────────────


