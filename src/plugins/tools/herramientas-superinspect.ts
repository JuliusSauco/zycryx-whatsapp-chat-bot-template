// Código adaptado por https://github.com/GataNina-Li
// Código compatible con canales y comunidades de WhatsApp

import {getUrlFromDirectPath} from "@whiskeysockets/baileys";
import _ from "lodash";
import {definePlugin} from '../../core/define-plugin.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';

interface GroupInfoLike {
    id: string;
    subject?: string;
    subjectOwner?: string;
    subjectTime?: number;
    size?: number;
    creation?: number;
    owner?: string;
    desc?: string;
    descOwner?: string;
    descId?: string;
    linkedParent?: string;
    restrict?: boolean;
    announce?: boolean;
    isCommunity?: boolean;
    isCommunityAnnounce?: boolean;
    joinApprovalMode?: boolean;
    memberAddMode?: boolean;
    ephemeralDuration?: number;
    inviteCode?: string;
    author?: string;
    participants?: GroupParticipant[];
}

type NewsletterObject = Record<string, unknown> & {
    id?: string;
    preview?: string;
};

export default definePlugin({
    help: ["superinspect", "inspect"],
    tags: ['tools'],
    command: /^(superinspect|inspect|revisar|inspeccionar)$/i,
    register: true,
    async execute(m, {conn, args, text}) {
    const channelUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
    const thumb = m.pp

    let inviteCode: string | null = null
    if (!text) return await m.reply(`*⚠️ Ingrese un enlace de un grupo/comunidad/canal de WhatsApp para obtener información.*`)

    const MetadataGroupInfo = async (res: GroupInfoLike) => {
        let nameCommunity = "no pertenece a ninguna Comunidad"
        let groupPicture = "No se pudo obtener"

        if (res.linkedParent) {
            const linkedGroupMeta = await conn.groupMetadata(res.linkedParent).catch(() => null)
            nameCommunity = linkedGroupMeta ? "\n" + ("`Nombre:` " + linkedGroupMeta.subject || "") : nameCommunity
        }
        const pp = await conn.profilePictureUrl(res.id, 'image').catch(() => null)
        inviteCode = await conn.groupInviteCode(m.chat).catch(() => null) || null
        const admins = formatParticipants((res.participants || []).filter(user => user.admin === "admin" || user.admin === "superadmin"))

        let caption = `🆔 *Identificador del grupo:*\n${res.id || "No encontrado"}\n\n` +
            `👑 *Creado por:*\n${res.owner ? `@${res.owner?.split("@")[0]}` : "No encontrado"} ${res.creation ? `el ${formatDate(res.creation)}` : "(Fecha no encontrada)"}\n\n` +
            `🏷️ *Nombre:*\n${res.subject || "No encontrado"}\n\n` +
            `✏️ *Nombre cambiado por:*\n${res.subjectOwner ? `@${res.subjectOwner?.split("@")[0]}` : "No encontrado"} ${res.subjectTime ? `el ${formatDate(res.subjectTime)}` : "(Fecha no encontrada)"}\n\n` +
            `📄 *Descripción:*\n${res.desc || "No encontrado"}\n\n` +
            `📝 *Descripción cambiado por:*\n${res.descOwner ? `@${res.descOwner?.split("@")[0]}` : "No encontrado"}\n\n` +
            `🗃️ *Id de la descripción:*\n${res.descId || "No encontrado"}\n\n` +
            `🖼️ *Imagen del grupo:*\n${pp ? pp : groupPicture}\n\n` +
            `💫 *Autor:*\n${res.author || "No encontrado"}\n\n` +
            `🎫 *Código de invitación:*\n${res.inviteCode || inviteCode || "No disponible"}\n\n` +
            `⌛ *Duración:*\n${res.ephemeralDuration !== undefined ? `${res.ephemeralDuration} segundos` : "Desconocido"}\n\n` +
            `🛃 *Admins:*\n${admins}\n\n` +
            `🔰 *Usuarios en total:*\n${res.size || "Cantidad no encontrada"}\n\n` +
            `✨ *Información avanzada* ✨\n\n🔎 *Comunidad vinculada al grupo:*\n${res.isCommunity ? "Este grupo es un chat de avisos" : `${res.linkedParent ? "`Id:` " + res.linkedParent : "Este grupo"} ${nameCommunity}`}\n\n` +
            `⚠️ *Restricciones:* ${res.restrict ? "✅" : "❌"}\n` +
            `📢 *Anuncios:* ${res.announce ? "✅" : "❌"}\n` +
            `🏘️ *¿Es comunidad?:* ${res.isCommunity ? "✅" : "❌"}\n` +
            `📯 *¿Es anuncio de comunidad?:* ${res.isCommunityAnnounce ? "✅" : "❌"}\n` +
            `🤝 *Tiene aprobación de miembros:* ${res.joinApprovalMode ? "✅" : "❌"}\n` +
            `🆕 *Puede Agregar futuros miembros:* ${res.memberAddMode ? "✅" : "❌"}\n\n`
        return caption.trim()
    }

    const inviteGroupInfo = async (groupData: GroupInfoLike) => {
        const {
            id, subject, subjectOwner, subjectTime, size, creation, owner, desc, descId, linkedParent,
            restrict, announce, isCommunity, isCommunityAnnounce, joinApprovalMode, memberAddMode
        } = groupData
        let nameCommunity = "no pertenece a ninguna Comunidad"
        let groupPicture = "No se pudo obtener"
        if (linkedParent) {
            const linkedGroupMeta = await conn.groupMetadata(linkedParent).catch(() => null)
            nameCommunity = linkedGroupMeta ? "\n" + ("`Nombre:` " + linkedGroupMeta.subject || "") : nameCommunity
        }
        const pp = await conn.profilePictureUrl(id, 'image').catch(() => null)

        let caption = `🆔 *Identificador del grupo:*\n${id || "No encontrado"}\n\n` +
            `👑 *Creado por:*\n${owner ? `@${owner?.split("@")[0]}` : "No encontrado"} ${creation ? `el ${formatDate(creation)}` : "(Fecha no encontrada)"}\n\n` +
            `🏷️ *Nombre:*\n${subject || "No encontrado"}\n\n` +
            `✏️ *Nombre cambiado por:*\n${subjectOwner ? `@${subjectOwner?.split("@")[0]}` : "No encontrado"} ${subjectTime ? `el ${formatDate(subjectTime)}` : "(Fecha no encontrada)"}\n\n` +
            `📄 *Descripción:*\n${desc || "No encontrada"}\n\n` +
            `💠 *ID de la descripción:*\n${descId || "No encontrado"}\n\n` +
            `🖼️ *Imagen del grupo:*\n${pp ? pp : groupPicture}\n\n` +
            `🏆 *Miembros destacados:*\n${formatParticipants(groupData.participants)}\n\n` +
            `👥 *Destacados total:*\n${size || "Cantidad no encontrada"}\n\n` +
            `✨ *Información avanzada* ✨\n\n🔎 *Comunidad vinculada al grupo:*\n${isCommunity ? "Este grupo es un chat de avisos" : `${linkedParent ? "`Id:` " + linkedParent : "Este grupo"} ${nameCommunity}`}\n\n` +
            `📢 *Anuncios:* ${announce ? "✅ Si" : "❌ No"}\n` +
            `🏘️ *¿Es comunidad?:* ${isCommunity ? "✅ Si" : "❌ No"}\n` +
            `📯 *¿Es anuncio de comunidad?:* ${isCommunityAnnounce ? "✅" : "❌"}\n` +
            `🤝 *Tiene aprobación de miembros:* ${joinApprovalMode ? "✅" : "❌"}\n`
        return caption.trim()
    }

    let groupInfo: string | null = null
    try {
        if (!text) {
            const res = await conn.groupMetadata(m.chat) as GroupInfoLike
            groupInfo = await MetadataGroupInfo(res)
        }
    } catch {
        const inviteUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1]
        if (inviteUrl) {
            try {
                const inviteInfo = await conn.groupGetInviteInfo(inviteUrl) as GroupInfoLike
                groupInfo = await inviteGroupInfo(inviteInfo)
            } catch {
                m.reply('Grupo no encontrado')
                return
            }
        }
    }
    if (groupInfo) {
        await conn.sendMessage(m.chat, {
            text: groupInfo, contextInfo: {
                externalAdReply: {
                    title: "🔰 Inspector de Grupos",
                    body: m.pushName,
                    thumbnailUrl: m.pp,
                    sourceUrl: args[0] ? args[0] : inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : info.md,
                    mediaType: 1,
                    showAdAttribution: false,
                    renderLargerThumbnail: true
                }
            }
        }, {quoted: m})
    } else {
        if (!channelUrl) return await conn.reply(m.chat, "*Verifique que sea un enlace de canal de WhatsApp.*", m)
        try {
            const newsletterInfo = await conn.newsletterMetadata("invite", channelUrl).catch(() => null) as NewsletterObject | null
            if (!newsletterInfo) return await conn.reply(m.chat, "*No se encontró información del canal.* Verifique que el enlace sea correcto.", m)
            const caption = "*Inspector de enlaces de Canales*\n\n" + processObject(newsletterInfo, "", newsletterInfo.preview)
            const pp = newsletterInfo.preview ? getUrlFromDirectPath(newsletterInfo.preview) : thumb
            await conn.sendMessage(m.chat, {
                text: caption, contextInfo: {
                    externalAdReply: {
                        title: "📢 Inspector de Canales",
                        body: m.pushName,
                        thumbnailUrl: pp,
                        sourceUrl: args[0],
                        mediaType: 1,
                        showAdAttribution: false,
                        renderLargerThumbnail: true
                    }
                }
            }, {quoted: m})
            if (newsletterInfo.id) await conn.sendMessage(m.chat, {text: newsletterInfo.id})
        } catch (e: unknown) {
            console.log(e)
        }
    }
    }
});

function formatParticipants(participants?: GroupParticipant[]) {
    return participants && participants.length > 0
        ? participants.map((user, i) => `${i + 1}. @${user.id?.split("@")[0]}${user.admin === "superadmin" ? " (superadmin)" : user.admin === "admin" ? " (admin)" : ""}`).join("\n")
        : "No encontrado"
}

function formatDate(input: number, locale = "es", includeTime = true) {
    let n = input
    if (n > 1e12) {
        n = Math.floor(n / 1000)
    } else if (n < 1e10) {
        n = Math.floor(n * 1000)
    }
    const date = new Date(n)
    if (Number.isNaN(date.getTime())) return "Fecha no válida"
    const optionsDate: Intl.DateTimeFormatOptions = {day: '2-digit', month: '2-digit', year: 'numeric'}
    const formattedDate = date.toLocaleDateString(locale, optionsDate)
    if (!includeTime) return formattedDate
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const period = Number(hours) < 12 ? 'AM' : 'PM'
    const formattedTime = `${hours}:${minutes}:${seconds} ${period}`
    return `${formattedDate}, ${formattedTime}`
}

function formatValue(key: string, value: unknown, preview?: string) {
    switch (key) {
        case "subscribers":
            return value ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "No hay suscriptores"
        case "creation_time":
        case "nameTime":
        case "descriptionTime":
            return typeof value === 'number' ? formatDate(value) : "Fecha no válida"
        case "description":
        case "name":
            return value || "No hay información disponible"
        case "state":
            switch (value) {
                case "ACTIVE":
                    return "Activo"
                case "GEOSUSPENDED":
                    return "Suspendido por región"
                case "SUSPENDED":
                    return "Suspendido"
                default:
                    return "Desconocido"
            }
        case "reaction_codes":
            switch (value) {
                case "ALL":
                    return "Todas las reacciones permitidas"
                case "BASIC":
                    return "Reacciones básicas permitidas"
                case "NONE":
                    return "No se permiten reacciones"
                default:
                    return "Desconocido"
            }
        case "verification":
            switch (value) {
                case "VERIFIED":
                    return "Verificado"
                case "UNVERIFIED":
                    return "No verificado"
                default:
                    return "Desconocido"
            }
        case "mute":
            switch (value) {
                case "ON":
                    return "Silenciado"
                case "OFF":
                    return "No silenciado"
                case "UNDEFINED":
                    return "Sin definir"
                default:
                    return "Desconocido"
            }
        case "view_role":
            switch (value) {
                case "ADMIN":
                    return "Administrador"
                case "OWNER":
                    return "Propietario"
                case "SUBSCRIBER":
                    return "Suscriptor"
                case "GUEST":
                    return "Invitado"
                default:
                    return "Desconocido"
            }
        case "picture":
            return preview ? getUrlFromDirectPath(preview) : "No hay imagen disponible"
        default:
            return value !== null && value !== undefined ? String(value) : "No hay información disponible"
    }
}

function newsletterKey(key: string) {
    return _.startCase(key.replace(/_/g, " "))
        .replace("Id", "🆔 Identificador")
        .replace("State", "📌 Estado")
        .replace("Creation Time", "📅 Fecha de creación")
        .replace("Name Time", "✏️ Fecha de modificación del nombre")
        .replace("Name", "🏷️ Nombre")
        .replace("Description Time", "📝 Fecha de modificación de la descripción")
        .replace("Description", "📜 Descripción")
        .replace("Invite", "📩 Invitación")
        .replace("Handle", "👤 Alias")
        .replace("Picture", "🖼️ Imagen")
        .replace("Preview", "👀 Vista previa")
        .replace("Reaction Codes", "😃 Reacciones")
        .replace("Subscribers", "👥 Suscriptores")
        .replace("Verification", "✅ Verificación")
        .replace("Viewer Metadata", "🔍 Datos avanzados")
}

function processObject(obj: Record<string, unknown>, prefix = "", preview?: string) {
    let caption = ""
    Object.keys(obj).forEach(key => {
        const value = obj[key]
        if (typeof value === "object" && value !== null) {
            const nested = value as Record<string, unknown>
            if (Object.keys(nested).length > 0) {
                const sectionName = newsletterKey(prefix + key)
                caption += `\n*\`${sectionName}\`*\n`
                caption += processObject(nested, `${prefix}${key}_`, preview)
            }
        } else {
            const shortKey = prefix ? prefix.split("_").pop() + "_" + key : key
            const displayValue = formatValue(shortKey, value, preview)
            const translatedKey = newsletterKey(shortKey)
            caption += `- *${translatedKey}:*\n${displayValue}\n\n`
        }
    })
    return caption.trim()
}
