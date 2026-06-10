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
import {getSubbotConfig, updateSubbotTipo} from '../services/subbot.service.js';
import {clearPrimaryBot, getContextGroupSettings} from '../services/group-settings.service.js';
import type {SubbotConfig} from '../types/config.js';
import type {AccessMode, AutoresponderTrigger} from '../types/config.js';
import type {ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';
import {cleanJid, isGroupJid, resolveSenderInfo} from '../utils/jid.js';
import {FIXED_OWNERS, GROUP_META_CACHE_TTL} from '../utils/constants.js';
import {isGroupCreator} from '../utils/group-creator.js';

// --- Cache de metadata de grupos ---
const groupMetaCache = new Map<string, GroupMetadata>();

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
    audios: boolean;
    autolevelup: boolean;
}

export interface HandlerContext {
    chatId: string;
    sender: string;
    senderJid: string;
    lid: string | undefined;
    isGroup: boolean;
    isCreator: boolean;
    isOwner: boolean;
    isROwner: boolean;
    isAdmin: boolean;
    isGroupCreator: boolean;
    isBotAdmin: boolean;
    metadata: GroupMetadata;
    participants: GroupParticipant[];
    adminIds: string[];
    botConfig: SubbotConfig;
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
    nsfwAccessMode: 'all',
    audios: false,
    autolevelup: true,
};

/**
 * Construye todo el contexto necesario para procesar un mensaje.
 * Llama `getSubbotConfig()`, `getCachedGroupMetadata()` y la query de
 * `group_settings` en PARALELO para minimizar latencia total.
 */
export async function buildContext(conn: ExtendedConn, m: BotMessage): Promise<HandlerContext> {
    const chatId: string = m.key?.remoteJid || "";
    const botId: string = conn.user?.id || "";
    const isGroup = isGroupJid(chatId);

    // --- Resolver sender (sincrónico) ---
    resolveSender(conn, m, chatId);

    const botJid = cleanJid(botId);
    const senderJid = cleanJid(m.sender || "");

    // --- Disparar TODAS las llamadas IO en paralelo ---
    const [botConfig, metadata, groupSettings] = await Promise.all([
        getSubbotConfig(botId),
        isGroup ? getCachedGroupMetadata(conn, chatId) : Promise.resolve({participants: []} as unknown as GroupMetadata),
        isGroup ? getContextGroupSettings(chatId) : Promise.resolve(EMPTY_GROUP_SETTINGS),
    ]);

    // Aplicar nombre y logo del subbot
    info.wm = botConfig.name ?? info.wm;
    info.img2 = botConfig.logo_url ?? info.img2;

    // Actualizar tipo de bot si cambió (fire-and-forget)
    const isMainBot = conn === globalThis.conn;
    const botType = isMainBot ? "oficial" : "subbot";
    if (botConfig.tipo !== botType) {
        updateSubbotTipo(cleanJid(botId), botType);
    }

    // --- Ownership ---
    const isROwner = FIXED_OWNERS.includes(m.sender);
    const isCreator = isROwner ||
        global.owner.map(([v]: string[]) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
    const isOwner = isCreator || senderJid === botJid || (botConfig.owners || []).includes(senderJid);

    const participants = metadata.participants || [];
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
        shouldAbort = await checkGroupRestrictions(chatId, isAdmin, botId, groupSettings, participants);
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
        isROwner,
        isAdmin,
        isGroupCreator: groupCreator,
        isBotAdmin,
        metadata,
        participants,
        adminIds,
        botConfig,
        botJid,
        modoAdminActivo: groupSettings.modoadmin,
        botAccessMode: groupSettings.botAccessMode,
        groupSettings,
        shouldAbort,
    };
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
async function getCachedGroupMetadata(conn: ExtendedConn, chatId: string): Promise<GroupMetadata> {
    if (groupMetaCache.has(chatId)) {
        return groupMetaCache.get(chatId)!;
    }

    // Hidratar desde el cache de Baileys (NodeCache, TTL 1h) sin pegar a la red.
    const baileysCached = conn?.groupCache?.get?.(chatId) as GroupMetadata | undefined;
    if (baileysCached?.participants?.length) {
        groupMetaCache.set(chatId, baileysCached);
        setTimeout(() => groupMetaCache.delete(chatId), GROUP_META_CACHE_TTL).unref?.();
        return baileysCached;
    }

    try {
        const metadata = await conn.groupMetadata(chatId);
        groupMetaCache.set(chatId, metadata);
        conn?.groupCache?.set?.(chatId, metadata);
        setTimeout(() => groupMetaCache.delete(chatId), GROUP_META_CACHE_TTL).unref?.();
        return metadata;
    } catch {
        return {participants: []} as unknown as GroupMetadata;
    }
}

/** Exportar para que otros módulos puedan actualizar el cache (ej: participantsUpdate). */
export {groupMetaCache};

/** Construye la lista de adminIds con ambas variantes (JID y LID). */
function buildAdminIds(participants: GroupParticipant[]): string[] {
    return participants
        .filter(p => p.admin === "admin" || p.admin === "superadmin")
        .flatMap(p => {
            const clean = cleanJid(p.id || "");
            return clean.endsWith("@lid")
                ? [clean, clean.replace("@lid", "@s.whatsapp.net")]
                : [clean, clean.replace("@s.whatsapp.net", "@lid")];
        });
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
async function checkGroupRestrictions(
    chatId: string,
    isAdmin: boolean,
    botId: string,
    settings: GroupSettings,
    participants: GroupParticipant[],
): Promise<boolean> {
    if (settings.banned) return true;

    const primaryBot = settings.primary_bot;
    if (!primaryBot || isAdmin) return false;

    const botExists = participants.some((p) => p.id === primaryBot);
    if (!botExists) {
        // Si el primary_bot ya no está en el grupo, limpiar la setting (fire-and-forget).
        clearPrimaryBot(chatId);
        return false;
    }

    const currentBotJid = cleanJid(botId) + "@s.whatsapp.net";
    const expected = cleanJid(primaryBot);
    return !currentBotJid.includes(expected);
}
