import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import path from 'path'
import {getParticipantsFast, resolveMention, type ResolvedMention} from '../../utils/mention.js'
import {pickRandom} from '../../utils/random.js'
import {getCachedText} from '../../lib/static-resource-cache.js'
import {loadCachedJsonResource} from '../../lib/local-json-resource.js'

interface TextCommandResource {
    commands: string[];
    file: string;
    separator: string;
    emptyMessage: string;
}

interface MessageResourcesManifest {
    textCommands: Record<string, TextCommandResource>;
}

const MESSAGE_RESOURCES_PATH = 'resources/data/messages.json'
const DEFAULT_INS_CONFIG: TextCommandResource = {
    commands: ['ins', 'insult', 'insulto', 'insultar'],
    file: 'resources/text/messages/msg-text-ins.txt',
    separator: '|',
    emptyMessage: '⚠️ No hay frases en `resources/text/messages/msg-text-ins.txt`. Sepáralas con el carácter |.',
}
const INS_CONFIG = loadCachedJsonResource<MessageResourcesManifest>(MESSAGE_RESOURCES_PATH)?.textCommands?.ins || DEFAULT_INS_CONFIG
const COMMAND_REGEX = new RegExp(`^(${INS_CONFIG.commands.map(escapeRegExp).join('|')})$`, 'i')

/** Lee las frases del .txt y las separa por '|'. */
function getFrases(): string[] {
    const content = getCachedText(path.resolve(process.cwd(), INS_CONFIG.file))
    if (!content) {
        logError(`No se pudo leer ${INS_CONFIG.file}`)
        return []
    }

    return content
        .split(INS_CONFIG.separator)
        .map(s => s.trim())
        .filter(Boolean)
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default definePlugin({
    help: ['msg-text-ins'],
    tags: ['fun'],
    command: COMMAND_REGEX,
    register: false,
    async execute(m, {conn, participants}) {
    try {
        // mención > respuesta > a sí mismo (misma lógica que los msg-gif-*).
        if (!Array.isArray(m.mentionedJid)) m.mentionedJid = []
        if (m.quoted?.sender) m.mentionedJid.push(m.quoted.sender)
        if (!m.mentionedJid.length) m.mentionedJid.push(m.sender)

        const frases = getFrases()
        if (!frases.length) {
            await m.reply(INS_CONFIG.emptyMessage)
            return
        }

        const groupParticipants = getParticipantsFast(conn, m.chat, participants)
        const mentionedResolved: ResolvedMention[] = m.mentionedJid.map((jid: string) => resolveMention(jid, groupParticipants))
        const mentionedTags = mentionedResolved.map((x: ResolvedMention) => x.tag)
        const mentions = Array.from(new Set(mentionedResolved.map((x: ResolvedMention) => x.mentionJid)))

        const fraseRandom = pickRandom(frases)
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
