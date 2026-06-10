import './config.js';
import chalk from 'chalk';
import {logDebug, logError, logWarn} from '../lib/logger.js';
import {deleteMessageCount, markBotLeftGroup} from '../services/chat.service.js';
import {registerGroupAdmins} from '../services/group-role.service.js';
import {handleGroupAntifake} from './group-antifake.js';
import {sendAdminChangeMessage} from './group-admin-events.js';
import {getCurrentBotJid} from './group-bot-identity.js';
import {getEventGroupSettings} from './group-event-settings.js';
import {isBotGroupAdmin, loadEventGroupMetadata} from './group-metadata.js';
import {resolveGroupAuthor, resolveGroupParticipant} from './group-participant-resolver.js';
import {sendByeMessage, sendWelcomeMessage} from './group-welcome-bye.js';
import type {EventConn, GroupParticipantsUpdate} from './group-event-types.js';

export {groupJoinRequest} from './group-join-request.js';
export {groupsUpdate} from './group-update-events.js';

export async function participantsUpdate(conn: EventConn, {id, participants, action, author}: GroupParticipantsUpdate): Promise<void> {
    try {
        if (!id || !Array.isArray(participants) || !action) {
            logDebug(chalk.yellow(`[GRUPO-EVENTO] descartado: id=${id} action=${action} participants=${JSON.stringify(participants)}`));
            return;
        }
        if (!conn?.user?.id) return;
        logDebug(chalk.cyan(`[GRUPO-EVENTO] action=${action} grupo=${id} participantes=${participants.length}`));

        const metadata = await loadEventGroupMetadata(conn, id);
        if (!metadata) {
            logWarn(chalk.red(`❌ participantsUpdate: sin metadata para ${id}, se omite`));
            return;
        }
        const groupName = metadata.subject || 'Grupo';
        const isBotAdmin = isBotGroupAdmin(conn, metadata);

        const settings = await getEventGroupSettings(id);
        if (action === 'add') {
            logDebug(chalk.cyan(`[WELCOME] grupo=${id} settings.welcome=${settings.welcome} (isBotAdmin=${isBotAdmin})`));
        }

        const metaParticipants = metadata.participants || [];
        const {authorJid, authorTag} = resolveGroupAuthor(author, metaParticipants);

        for (const rawParticipant of participants) {
            const participantInfo = resolveGroupParticipant(rawParticipant, metaParticipants);
            if (!participantInfo) continue;
            const {participantJid, userJid, userTag} = participantInfo;

            const antifakeHandled = action === 'add' && await handleGroupAntifake({
                conn,
                groupId: id,
                participantJid,
                userJid,
                userTag,
                enabled: settings.antifake,
                isBotAdmin,
            });
            if (antifakeHandled) continue;

            switch (action) {
                case 'add':
                    if (participantJid.replace(/:\d+/, '') === getCurrentBotJid(conn)) {
                        const registeredAdmins = await registerGroupAdmins(id, metadata);
                        logDebug(chalk.green(`[ROLES] ${registeredAdmins} admins registrados para "${groupName}" al ingresar el bot`));
                    }
                    if (settings.welcome) {
                        await sendWelcomeMessage({
                            conn,
                            groupId: id,
                            participantJid,
                            userJid,
                            userTag,
                            groupName,
                            metadata,
                            metaParticipants,
                            settings,
                        });
                    } else {
                        logDebug(chalk.yellow(`[WELCOME] omitido — welcome desactivado en "${groupName}"`));
                    }
                    break;

                case 'remove':
                    try {
                        await deleteMessageCount(userJid, id);
                        const botJid = getCurrentBotJid(conn);
                        if (participantJid.replace(/:\d+/, '') === botJid) {
                            await markBotLeftGroup(id, botJid);
                            logDebug(`[DEBUG] El bot fue eliminado del grupo ${id}. Marcado como 'joined = false'.`);
                        }
                    } catch (err: unknown) {
                        logError("❌ Error en 'remove':", err);
                    }

                    if (settings.bye) {
                        await sendByeMessage({
                            conn,
                            groupId: id,
                            participantJid,
                            userJid,
                            userTag,
                            groupName,
                            metadata,
                            metaParticipants,
                            settings,
                        });
                    } else {
                        logDebug(chalk.yellow(`[BYE] omitido — bye desactivado en "${groupName}"`));
                    }
                    break;

                case 'promote':
                case 'daradmin':
                case 'darpoder':
                    if (settings.detect) {
                        await sendAdminChangeMessage({
                            conn,
                            groupId: id,
                            participantJid,
                            userJid,
                            userTag,
                            authorJid,
                            authorTag,
                            groupName,
                            metadata,
                            settings,
                            type: 'promote',
                        });
                    }
                    break;

                case 'demote':
                case 'quitaradmin':
                case 'quitarpoder':
                    if (settings.detect) {
                        await sendAdminChangeMessage({
                            conn,
                            groupId: id,
                            participantJid,
                            userJid,
                            userTag,
                            authorJid,
                            authorTag,
                            groupName,
                            metadata,
                            settings,
                            type: 'demote',
                        });
                    }
                    break;
            }
        }
    } catch (err: unknown) {
        logError(chalk.red(`❌ Error en participantsUpdate - Acción: ${action} | Grupo: ${id}`), err);
    }
}
