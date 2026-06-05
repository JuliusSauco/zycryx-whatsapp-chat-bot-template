import chalk from 'chalk';
import {logDebug, logError, logInfo} from '../lib/logger.js';
import {
    DEFAULT_PP_PATH,
    getByeText,
    getGroupEventImageBuffer,
    getGroupMentionJids,
    getWelcomeText,
    uniqueJids,
} from './group-event-resources.js';
import type {GroupMetadata, GroupParticipant} from '@whiskeysockets/baileys';
import type {GroupSettings} from '../types/config.js';
import type {EventConn} from './group-event-types.js';

interface GroupGreetingInput {
    conn: EventConn;
    groupId: string;
    participantJid: string;
    userJid: string;
    userTag: string;
    groupName: string;
    metadata: GroupMetadata;
    metaParticipants: GroupParticipant[];
    settings: Partial<GroupSettings>;
}

export async function sendWelcomeMessage(input: GroupGreetingInput): Promise<void> {
    const {conn, groupId, participantJid, userJid, userTag, groupName, metadata, metaParticipants, settings} = input;
    const groupDesc = metadata.desc || '*ᴜɴ ɢʀᴜᴘᴏ ɢᴇɴɪᴀ😸*\n *sɪɴ ʀᴇɢʟᴀ 😉*';
    const raw = settings.sWelcome || getWelcomeText();
    const msg = raw
        .replace(/@user/gi, userTag)
        .replace(/@group|@subject/gi, groupName)
        .replace(/@desc/gi, groupDesc);
    const mentionedJid = settings.welcomeHidetag
        ? uniqueJids([...getGroupMentionJids(metaParticipants), userJid])
        : [userJid];

    const welcomeImage = settings.photowelcome
        ? await getGroupEventImageBuffer(conn, groupId, participantJid, userJid, settings.welcomeGroupPhoto)
        : null;

    try {
        if (welcomeImage) {
            await conn.sendMessage(groupId, {
                image: welcomeImage,
                caption: msg,
                contextInfo: {mentionedJid}
            });
        } else {
            if (settings.photowelcome) {
                logDebug(chalk.yellow(`[WELCOME] Sin foto de usuario, grupo ni archivo (${DEFAULT_PP_PATH}) — se envía solo texto`));
            }
            await conn.sendMessage(groupId, {
                text: msg,
                contextInfo: {mentionedJid}
            });
        }
        logInfo(chalk.green(`[WELCOME] ✅ bienvenida enviada a ${userTag} en "${groupName}"`));
    } catch (e: unknown) {
        logError(chalk.red(`[WELCOME] ❌ falló el envío a ${userTag} en ${groupId}:`), e);
    }
}

export async function sendByeMessage(input: GroupGreetingInput): Promise<void> {
    const {conn, groupId, participantJid, userJid, userTag, groupName, metadata, metaParticipants, settings} = input;
    const groupDesc = metadata.desc || 'Sin descripción';
    const raw = settings.sBye || getByeText();
    const msg = raw
        .replace(/@user/gi, userTag)
        .replace(/@group/gi, groupName)
        .replace(/@desc/gi, groupDesc);
    const mentionedJid = settings.byeHidetag
        ? uniqueJids([...getGroupMentionJids(metaParticipants), userJid])
        : [userJid];

    const byeImage = settings.photobye
        ? await getGroupEventImageBuffer(conn, groupId, participantJid, userJid, settings.byeGroupPhoto)
        : null;

    try {
        if (byeImage) {
            await conn.sendMessage(groupId, {
                image: byeImage,
                caption: msg,
                contextInfo: {mentionedJid}
            });
        } else {
            if (settings.photobye) {
                logDebug(chalk.yellow(`[BYE] Sin foto de usuario, grupo ni archivo (${DEFAULT_PP_PATH}) — se envía solo texto`));
            }
            await conn.sendMessage(groupId, {
                text: msg,
                contextInfo: {mentionedJid}
            });
        }
        logInfo(chalk.green(`[BYE] 👋 despedida enviada a ${userTag} en "${groupName}"`));
    } catch (e: unknown) {
        logError(chalk.red(`[BYE] ❌ falló el envío a ${userJid} en ${groupId}:`), e);
    }
}
