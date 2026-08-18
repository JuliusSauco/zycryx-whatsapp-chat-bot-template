/**
 * Construye el contexto completo para el procesamiento de un mensaje.
 * Centraliza resolución de sender, permisos, metadata de grupo y configuración del bot.
 *
 * Optimizaciones aplicadas:
 *  - `getSubbotConfig` + `getCachedGroupMetadata` + query consolidada a
 *    `group_settings` corren en PARALELO (antes en serie).
 *  - Una sola query a `group_settings` trae banned/primary_bot/modoadmin/antifake
 *    (antes 3 queries separadas distribuidas entre buildContext, checkGroupRestrictions
 *    y antifakeCheck).
 *  - `checkGroupRestrictions` ya no hace `conn.groupMetadata` extra: reusa los
 *    participants ya cargados.
 */
import type {GroupMetadata, GroupParticipant} from '@whiskeysockets/baileys';
import {getSubbotConfig} from '../services/subbot.service.js';
import {getContextGroupSettings} from '../services/group-settings.service.js';
import type {SubbotConfig} from '../types/config.js';
import type {AccessMode, AutoresponderTrigger} from '../types/config.js';
import type {CommandAccessMap, FamilyAccessMap} from '../domain/groups.js';
import type {BotBranding, ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';
import {cleanJid, isGroupJid, resolveSenderInfo} from '../utils/jid.js';
import {isGroupCreator} from '../utils/group-creator.js';
import {requireBotInstanceIdentity} from './bot-instance-identity.js';
import {createDefaultFamilyAccessMap} from '../utils/family-access.js';
import {resolveMention} from '../utils/mention-identity.js';
import {botInfo, configuredOwners} from './config.js';
import {groupMetadataCache} from './group-metadata-cache.js';

// --- Cache de metadata de grupos ---
const groupMetaCache = groupMetadataCache;

interface GroupMetadataResolution {
    metadata: GroupMetadata;
    /** Solo una lectura fresca de WhatsApp autoriza decisiones destructivas. */
    authoritative: boolean;
}

export interface GroupSettings {
    banned: boolean;
    primary_bot: string | null;
    modoadmin: boolean;
    botAccessMode: AccessMode;
    antifake: boolean;
    message_logging: boolean;
    antilink: boolean;
    antilink2: boolean;
    virusTotal: boolean;
    autoresponder: boolean;
    autoresponderMode: AccessMode;
    autoresponderTrigger: AutoresponderTrigger;
    gamesAccessMode: AccessMode;
    toolsAccessMode: AccessMode;
    rpgAccessMode: AccessMode;
    downloadsAccessMode: AccessMode;
    searchAccessMode: AccessMode;
    stickersAccessMode: AccessMode;
    convertersAccessMode: AccessMode;
    funAccessMode: AccessMode;
    modohorny: boolean;
    nsfwAccessMode: AccessMode;
    nsfwGifEnabled: boolean;
    nsfwGifAccessMode: AccessMode;
    nsfw_horario: string | null;
    audios: boolean;
    autolevelup: boolean;
    familyAccess: FamilyAccessMap;
    commandAccess: CommandAccessMap;
}

export interface HandlerContext {
    chatId: string;
    sender: string;
    senderJid: string;
    lid: string | undefined;
    isGroup: boolean;
    isCreator: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isGroupCreator: boolean;
    isBotAdmin: boolean;
    metadata: GroupMetadata;
    participants: GroupParticipant[];
    adminIds: string[];
    botConfig: SubbotConfig;
    branding: BotBranding;
    botJid: string;
    modoAdminActivo: boolean;
    botAccessMode: AccessMode;
    /** Settings del grupo precargados (lectura en memoria para guards). */
    groupSettings: GroupSettings;
    /** true si el handler debe abortar (grupo baneado, primary bot, etc.) */
    shouldAbort: boolean;
}

const EMPTY_GROUP_SETTINGS: GroupSettings = {
    banned: false,
    primary_bot: null,
    modoadmin: false,
    botAccessMode: 'all',
    antifake: false,
    message_logging: false,
    antilink: false,
    antilink2: false,
    virusTotal: false,
    autoresponder: true,
    autoresponderMode: 'all',
    autoresponderTrigger: 'mention',
    gamesAccessMode: 'all',
    toolsAccessMode: 'all',
    rpgAccessMode: 'all',
    downloadsAccessMode: 'all',
    searchAccessMode: 'all',
    stickersAccessMode: 'all',
    convertersAccessMode: 'all',
    funAccessMode: 'all',
    modohorny: false,
    nsfwAccessMode: 'owner',
    nsfwGifEnabled: false,
    nsfwGifAccessMode: 'owner',
    nsfw_horario: null,
    audios: false,
    autolevelup: true,
    familyAccess: createDefaultFamilyAccessMap(),
    commandAccess: {},
};

/**
 * Construye todo el contexto necesario para procesar un mensaje.
 * Llama `getSubbotConfig()`, `getCachedGroupMetadata()` y la query de
 * `group_settings` en PARALELO para minimizar latencia total.
 */
export async function buildContext(conn: ExtendedConn, m: BotMessage): Promise<HandlerContext> {
    const chatId: string = m.key?.remoteJid || "";
    const botId: string = conn.user?.id || "";
    const botIdentity = requireBotInstanceIdentity(conn);
    const isGroup = isGroupJid(chatId);

    // --- Resolver sender (sincrónico) ---
    resolveSender(conn, m, chatId);

    const botJid = cleanJid(botId);
    const senderJid = cleanJid(m.sender || "");

    // --- Disparar TODAS las llamadas IO en paralelo ---
    const [botConfig, metadataResult, groupSettings] = await Promise.all([
        getSubbotConfig(botIdentity.instanceId),
        isGroup
            ? getCachedGroupMetadata(conn, chatId)
            : Promise.resolve({metadata: {participants: []} as unknown as GroupMetadata, authoritative: true}),
        isGroup ? getContextGroupSettings(chatId) : Promise.resolve(EMPTY_GROUP_SETTINGS),
    ]);
    const {metadata} = metadataResult;

    const branding: BotBranding = {
        watermark: botConfig.name ?? botInfo.wm,
        logoUrl: botConfig.logo_url ?? botInfo.img2,
    };

    // --- Ownership ---
    const isCreator = configuredOwners
        .map(([v]: string[]) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        .includes(senderJid);
    const isOwner = isCreator || senderJid === botJid || (botConfig.owners || []).includes(senderJid);

    const participants = metadata.participants || [];
    normalizeMessageMentions(m, participants);
    const adminIds = buildAdminIds(participants);

    // --- isAdmin del sender ---
    const uniqueSenderJids = buildSenderJids(m);
    const isAdmin = adminIds.some(adminJid => uniqueSenderJids.includes(adminJid));
    const groupCreator = isGroup ? isGroupCreator({chatId, sender: m.sender, senderLid: m.lid, metadata}) : false;
    m.isAdmin = isAdmin;

    // --- isBotAdmin ---
    const botLid = cleanJid(conn.user?.lid || "");
    const isBotAdmin = adminIds.includes(botJid) || adminIds.includes(botLid);

    // --- Grupo baneado / primary bot check (usando datos ya cargados, sin más IO) ---
    let shouldAbort = false;
    if (isGroup && !isCreator && senderJid !== botJid) {
        shouldAbort = checkGroupRestrictions(isAdmin, botIdentity.instanceId, groupSettings);
    }

    m.isGroup = isGroup;

    return {
        chatId,
        sender: m.sender,
        senderJid,
        lid: m.lid,
        isGroup,
        isCreator,
        isOwner,
        isAdmin,
        isGroupCreator: groupCreator,
        isBotAdmin,
        metadata,
        participants,
        adminIds,
        botConfig,
        branding,
        botJid,
        modoAdminActivo: groupSettings.modoadmin,
        botAccessMode: groupSettings.botAccessMode,
        groupSettings,
        shouldAbort,
    };
}

/**
 * Baileys puede entregar las menciones como LID. Los plugins y la persistencia
 * trabajan preferentemente con el JID telefónico, así que resolvemos la pareja
 * LID/participantAlt una sola vez antes de ejecutar hooks y comandos.
 */
function normalizeMessageMentions(m: BotMessage, participants: GroupParticipant[]): void {
    const originalMentions = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
    m.mentionedJid = [...new Set(originalMentions
        .map(jid => resolveMention(jid, participants).mentionJid)
        .filter(Boolean))];

    if (m.quoted?.sender) {
        m.quoted.sender = resolveMention(m.quoted.sender, participants).mentionJid;
    }
    if (m.mentionedJid[0]) m.who = m.mentionedJid[0];
}

// ---- Funciones internas ----

/** Resuelve m.sender y m.lid a partir del key del mensaje, usando el helper unificado. */
function resolveSender(conn: ExtendedConn, m: BotMessage, chatId: string): void {
    const info = resolveSenderInfo(m);
    m.sender = info.sender || chatId;
    m.lid = info.lid || "";

    if (m.key?.fromMe) {
        m.sender = conn.user?.id ? cleanJid(conn.user.id) : m.sender;
    }
}

/** Obtiene metadata de grupo del cache o la solicita al server. */
async function getCachedGroupMetadata(conn: ExtendedConn, chatId: string): Promise<GroupMetadataResolution> {
    if (groupMetaCache.has(chatId)) {
        return {metadata: groupMetaCache.get(chatId)!, authoritative: false};
    }

    // Hidratar desde el cache de Baileys (NodeCache, TTL 1h) sin pegar a la red.
    const baileysCached = conn?.groupCache?.get?.(chatId) as GroupMetadata | undefined;
    if (baileysCached?.participants?.length) {
        groupMetaCache.set(chatId, baileysCached);
        return {metadata: baileysCached, authoritative: false};
    }

    try {
        const metadata = await conn.groupMetadata(chatId);
        groupMetaCache.set(chatId, metadata);
        conn?.groupCache?.set?.(chatId, metadata);
        return {metadata, authoritative: true};
    } catch {
        const cached = groupMetaCache.get(chatId) ?? conn?.groupCache?.get?.(chatId) as GroupMetadata | undefined;
        return {
            metadata: cached ?? {participants: []} as unknown as GroupMetadata,
            authoritative: false,
        };
    }
}

/** Exportar para que otros módulos puedan actualizar el cache (ej: participantsUpdate). */
export {groupMetaCache};

/** Construye adminIds solo con identidades observadas; un LID nunca se convierte en teléfono por sufijo. */
function buildAdminIds(participants: GroupParticipant[]): string[] {
    const ids = participants
        .filter(p => p.admin === "admin" || p.admin === "superadmin")
        .flatMap(p => {
            const participant = p as GroupParticipant & {participantAlt?: string | null};
            return [participant.id, participant.participantAlt].map(value => cleanJid(value || '')).filter(Boolean);
        });
    return [...new Set(ids)];
}

/** Construye las variantes de JID del sender para comparación con adminIds. */
function buildSenderJids(m: BotMessage): string[] {
    const jids: string[] = [];
    if (m.user?.id) jids.push(cleanJid(m.user.id));
    if (m.user?.lid) jids.push(cleanJid(m.user.lid));
    if (m.sender) jids.push(cleanJid(m.sender));
    if (m.lid) jids.push(cleanJid(m.lid));
    return [...new Set(jids.filter(Boolean))];
}

/**
 * Verifica si el grupo está baneado o si otro bot tiene prioridad.
 * Usa `groupSettings` y `participants` ya cargados (sin IO adicional).
 */
function checkGroupRestrictions(
    isAdmin: boolean,
    botInstanceId: string,
    settings: GroupSettings,
): boolean {
    if (settings.banned) return true;

    const primaryBot = settings.primary_bot;
    if (!primaryBot || isAdmin) return false;
    return botInstanceId !== primaryBot;
}
