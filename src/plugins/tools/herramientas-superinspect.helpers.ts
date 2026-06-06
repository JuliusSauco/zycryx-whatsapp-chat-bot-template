import {getUrlFromDirectPath} from '@whiskeysockets/baileys';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import _ from 'lodash';
import type {ExtendedConn} from '../../types/context.js';

export interface GroupInfoLike {
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

export type NewsletterObject = Record<string, unknown> & {
    id?: string;
    preview?: string;
};

export async function buildCurrentGroupCaption(conn: ExtendedConn, chatId: string, res: GroupInfoLike): Promise<{caption: string; inviteCode: string | null}> {
    let nameCommunity = 'no pertenece a ninguna Comunidad';
    const groupPicture = 'No se pudo obtener';

    if (res.linkedParent) {
        const linkedGroupMeta = await conn.groupMetadata(res.linkedParent).catch(() => null);
        nameCommunity = linkedGroupMeta ? '\n' + ('`Nombre:` ' + linkedGroupMeta.subject || '') : nameCommunity;
    }

    const pp = await conn.profilePictureUrl(res.id, 'image').catch(() => null);
    const inviteCode = await conn.groupInviteCode(chatId).catch(() => null) || null;
    const admins = formatParticipants((res.participants || []).filter(user => user.admin === 'admin' || user.admin === 'superadmin'));

    const caption = `🆔 *Identificador del grupo:*
${res.id || 'No encontrado'}

👑 *Creado por:*
${res.owner ? `@${res.owner?.split('@')[0]}` : 'No encontrado'} ${res.creation ? `el ${formatDate(res.creation)}` : '(Fecha no encontrada)'}

🏷️ *Nombre:*
${res.subject || 'No encontrado'}

✏️ *Nombre cambiado por:*
${res.subjectOwner ? `@${res.subjectOwner?.split('@')[0]}` : 'No encontrado'} ${res.subjectTime ? `el ${formatDate(res.subjectTime)}` : '(Fecha no encontrada)'}

📄 *Descripción:*
${res.desc || 'No encontrado'}

📝 *Descripción cambiado por:*
${res.descOwner ? `@${res.descOwner?.split('@')[0]}` : 'No encontrado'}

🗃️ *Id de la descripción:*
${res.descId || 'No encontrado'}

🖼️ *Imagen del grupo:*
${pp ? pp : groupPicture}

💫 *Autor:*
${res.author || 'No encontrado'}

🎫 *Código de invitación:*
${res.inviteCode || inviteCode || 'No disponible'}

⌛ *Duración:*
${res.ephemeralDuration !== undefined ? `${res.ephemeralDuration} segundos` : 'Desconocido'}

🛃 *Admins:*
${admins}

🔰 *Usuarios en total:*
${res.size || 'Cantidad no encontrada'}

✨ *Información avanzada* ✨

🔎 *Comunidad vinculada al grupo:*
${res.isCommunity ? 'Este grupo es un chat de avisos' : `${res.linkedParent ? '`Id:` ' + res.linkedParent : 'Este grupo'} ${nameCommunity}`}

⚠️ *Restricciones:* ${res.restrict ? '✅' : '❌'}
📢 *Anuncios:* ${res.announce ? '✅' : '❌'}
🏘️ *¿Es comunidad?:* ${res.isCommunity ? '✅' : '❌'}
📯 *¿Es anuncio de comunidad?:* ${res.isCommunityAnnounce ? '✅' : '❌'}
🤝 *Tiene aprobación de miembros:* ${res.joinApprovalMode ? '✅' : '❌'}
🆕 *Puede Agregar futuros miembros:* ${res.memberAddMode ? '✅' : '❌'}`;

    return {caption: caption.trim(), inviteCode};
}

export async function buildInviteGroupCaption(conn: ExtendedConn, groupData: GroupInfoLike): Promise<string> {
    const {
        id, subject, subjectOwner, subjectTime, size, creation, owner, desc, descId, linkedParent,
        announce, isCommunity, isCommunityAnnounce, joinApprovalMode,
    } = groupData;
    let nameCommunity = 'no pertenece a ninguna Comunidad';
    const groupPicture = 'No se pudo obtener';

    if (linkedParent) {
        const linkedGroupMeta = await conn.groupMetadata(linkedParent).catch(() => null);
        nameCommunity = linkedGroupMeta ? '\n' + ('`Nombre:` ' + linkedGroupMeta.subject || '') : nameCommunity;
    }

    const pp = await conn.profilePictureUrl(id, 'image').catch(() => null);

    return `🆔 *Identificador del grupo:*
${id || 'No encontrado'}

👑 *Creado por:*
${owner ? `@${owner?.split('@')[0]}` : 'No encontrado'} ${creation ? `el ${formatDate(creation)}` : '(Fecha no encontrada)'}

🏷️ *Nombre:*
${subject || 'No encontrado'}

✏️ *Nombre cambiado por:*
${subjectOwner ? `@${subjectOwner?.split('@')[0]}` : 'No encontrado'} ${subjectTime ? `el ${formatDate(subjectTime)}` : '(Fecha no encontrada)'}

📄 *Descripción:*
${desc || 'No encontrada'}

💠 *ID de la descripción:*
${descId || 'No encontrado'}

🖼️ *Imagen del grupo:*
${pp ? pp : groupPicture}

🏆 *Miembros destacados:*
${formatParticipants(groupData.participants)}

👥 *Destacados total:*
${size || 'Cantidad no encontrada'}

✨ *Información avanzada* ✨

🔎 *Comunidad vinculada al grupo:*
${isCommunity ? 'Este grupo es un chat de avisos' : `${linkedParent ? '`Id:` ' + linkedParent : 'Este grupo'} ${nameCommunity}`}

📢 *Anuncios:* ${announce ? '✅ Si' : '❌ No'}
🏘️ *¿Es comunidad?:* ${isCommunity ? '✅ Si' : '❌ No'}
📯 *¿Es anuncio de comunidad?:* ${isCommunityAnnounce ? '✅' : '❌'}
🤝 *Tiene aprobación de miembros:* ${joinApprovalMode ? '✅' : '❌'}`.trim();
}

export function getNewsletterPreviewUrl(newsletterInfo: NewsletterObject, fallback: string): string {
    return newsletterInfo.preview ? getUrlFromDirectPath(newsletterInfo.preview) : fallback;
}

export function buildNewsletterCaption(newsletterInfo: NewsletterObject): string {
    return '*Inspector de enlaces de Canales*\n\n' + processObject(newsletterInfo, '', newsletterInfo.preview);
}

function formatParticipants(participants?: GroupParticipant[]) {
    return participants && participants.length > 0
        ? participants.map((user, i) => `${i + 1}. @${user.id?.split('@')[0]}${user.admin === 'superadmin' ? ' (superadmin)' : user.admin === 'admin' ? ' (admin)' : ''}`).join('\n')
        : 'No encontrado';
}

function formatDate(input: number, locale = 'es', includeTime = true) {
    let n = input;
    if (n > 1e12) {
        n = Math.floor(n / 1000);
    } else if (n < 1e10) {
        n = Math.floor(n * 1000);
    }
    const date = new Date(n);
    if (Number.isNaN(date.getTime())) return 'Fecha no válida';
    const optionsDate: Intl.DateTimeFormatOptions = {day: '2-digit', month: '2-digit', year: 'numeric'};
    const formattedDate = date.toLocaleDateString(locale, optionsDate);
    if (!includeTime) return formattedDate;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const period = Number(hours) < 12 ? 'AM' : 'PM';
    return `${formattedDate}, ${hours}:${minutes}:${seconds} ${period}`;
}

function formatValue(key: string, value: unknown, preview?: string) {
    switch (key) {
        case 'subscribers':
            return value ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 'No hay suscriptores';
        case 'creation_time':
        case 'nameTime':
        case 'descriptionTime':
            return typeof value === 'number' ? formatDate(value) : 'Fecha no válida';
        case 'description':
        case 'name':
            return value || 'No hay información disponible';
        case 'picture':
            return preview ? getUrlFromDirectPath(preview) : 'No hay imagen disponible';
        default:
            return value !== null && value !== undefined ? String(value) : 'No hay información disponible';
    }
}

function newsletterKey(key: string) {
    return _.startCase(key.replace(/_/g, ' '))
        .replace('Id', '🆔 Identificador')
        .replace('State', '📌 Estado')
        .replace('Creation Time', '📅 Fecha de creación')
        .replace('Name Time', '✏️ Fecha de modificación del nombre')
        .replace('Name', '🏷️ Nombre')
        .replace('Description Time', '📝 Fecha de modificación de la descripción')
        .replace('Description', '📜 Descripción')
        .replace('Invite', '📩 Invitación')
        .replace('Handle', '👤 Alias')
        .replace('Picture', '🖼️ Imagen')
        .replace('Preview', '👀 Vista previa')
        .replace('Reaction Codes', '😃 Reacciones')
        .replace('Subscribers', '👥 Suscriptores')
        .replace('Verification', '✅ Verificación')
        .replace('Viewer Metadata', '🔍 Datos avanzados');
}

function processObject(obj: Record<string, unknown>, prefix = '', preview?: string) {
    let caption = '';
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
            const nested = value as Record<string, unknown>;
            if (Object.keys(nested).length > 0) {
                const sectionName = newsletterKey(prefix + key);
                caption += `\n*\`${sectionName}\`*\n`;
                caption += processObject(nested, `${prefix}${key}_`, preview);
            }
        } else {
            const shortKey = prefix ? prefix.split('_').pop() + '_' + key : key;
            caption += `- *${newsletterKey(shortKey)}:*\n${formatValue(shortKey, value, preview)}\n\n`;
        }
    });
    return caption.trim();
}
