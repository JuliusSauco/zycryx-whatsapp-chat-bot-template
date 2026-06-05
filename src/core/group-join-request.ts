import './config.js';
import chalk from 'chalk';
import {logError, logInfo, logWarn} from '../lib/logger.js';
import {getGroupAdminMentionJids, getGroupMentionJids, uniqueJids} from './group-event-resources.js';
import {getEventGroupSettings} from './group-event-settings.js';
import {loadEventGroupMetadata} from './group-metadata.js';
import {resolveJoinRequestParticipant} from './group-participant-resolver.js';
import type {AutoAcceptMode} from '../types/config.js';
import type {EventConn, GroupJoinRequest} from './group-event-types.js';

export async function groupJoinRequest(conn: EventConn, request: GroupJoinRequest): Promise<void> {
    const {id, participant, participantPn, action} = request;
    try {
        if (!id || !participant || action !== 'created') return;

        const settings = await getEventGroupSettings(id);
        const mode = (settings?.autoAcceptMode || 'off') as AutoAcceptMode;
        if (mode === 'off') return;

        const metadata = await loadEventGroupMetadata(conn, id);
        if (!metadata) {
            logWarn(chalk.yellow(`[AUTOACEPTAR] Sin metadata para ${id}, se omite solicitud de ${participant}`));
            return;
        }

        const groupName = metadata.subject || 'Grupo';
        const metaParticipants = metadata.participants || [];
        const participantJid = participantPn || participant;
        const {userJid, userTag} = resolveJoinRequestParticipant(participantJid, metaParticipants);
        const admins = getGroupAdminMentionJids(metaParticipants);
        const everyone = getGroupMentionJids(metaParticipants);

        const shouldApprove = mode === 'on' || mode === 'on_hidetag_admin' || mode === 'on_hidetag_all';
        const mentionTargets = mode.endsWith('_admin')
            ? uniqueJids([userJid, ...admins])
            : mode.endsWith('_all')
                ? uniqueJids([userJid, ...everyone])
                : [userJid];

        if (shouldApprove) {
            await conn.groupRequestParticipantsUpdate(id, [participantJid], 'approve');
            if (mode !== 'on') {
                await conn.sendMessage(id, {
                    text: `🛂✅ ${userTag} fue *aceptado automaticamente* en *${groupName}*.\n\n✨ La solicitud de ingreso ya fue aprobada.`,
                    contextInfo: {mentionedJid: mentionTargets}
                });
            }
            logInfo(chalk.green(`[AUTOACEPTAR] Solicitud aprobada para ${userTag} en "${groupName}"`));
            return;
        }

        await conn.sendMessage(id, {
            text: `🛂⏳ ${userTag} quiere ingresar a *${groupName}*.\n\n👥 Un administrador necesita *aceptar participante* para completar la solicitud.`,
            contextInfo: {mentionedJid: mentionTargets}
        });
        logInfo(chalk.cyan(`[AUTOACEPTAR] Solicitud notificada para ${userTag} en "${groupName}"`));
    } catch (err: unknown) {
        logError(chalk.red(`❌ Error en groupJoinRequest - Grupo: ${id} | Participante: ${participant}`), err);
    }
}
