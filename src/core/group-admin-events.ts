import {pickRandom} from './group-event-resources.js';
import type {GroupMetadata} from '@whiskeysockets/baileys';
import type {GroupSettings} from '../types/config.js';
import type {EventConn} from './group-event-types.js';

type AdminChangeType = 'promote' | 'demote';

interface AdminChangeInput {
    conn: EventConn;
    groupId: string;
    participantJid: string;
    userJid: string;
    userTag: string;
    authorJid: string;
    authorTag: string;
    groupName: string;
    metadata: GroupMetadata;
    settings: Partial<GroupSettings>;
    type: AdminChangeType;
}

const DEFAULT_PROMOTE_TEXT = `@user 𝘼𝙃𝙊𝙍𝘼 𝙀𝙎 𝘼𝘿𝙈𝙄𝙉 𝙀𝙉 𝙀𝙎𝙏𝙀 𝙂𝙍𝙐𝙋𝙊\n\n😼🫵𝘼𝘾𝘾𝙄𝙊𝙉 𝙍𝙀𝘼𝙇𝙄𝙕𝘼𝘿𝘼 𝙋𝙊𝙍: @author`;
const DEFAULT_DEMOTE_TEXT = `@user 𝘿𝙀𝙅𝘼 𝘿𝙀 𝙎𝙀𝙍 𝘼𝘿𝙈𝙄𝙉 𝙀𝙉 𝙀𝙎𝙏𝙀 𝙂𝙍𝙐𝙋𝙊\n\n😼🫵𝘼𝘾𝘾𝙄𝙊𝙉 𝙍𝙀𝘼𝙇𝙄𝙕𝘼𝘿𝘼 𝙋𝙊𝙍: @author`;

export async function sendAdminChangeMessage(input: AdminChangeInput): Promise<void> {
    const {
        conn,
        groupId,
        participantJid,
        userJid,
        userTag,
        authorJid,
        authorTag,
        groupName,
        metadata,
        settings,
        type,
    } = input;

    const raw = type === 'promote'
        ? settings.sPromote || DEFAULT_PROMOTE_TEXT
        : settings.sDemote || DEFAULT_DEMOTE_TEXT;
    const msg = raw
        .replace(/@user/gi, userTag)
        .replace(/@group/gi, groupName)
        .replace(/@desc/gi, metadata.desc || '')
        .replace(/@author/gi, authorTag);
    const ppUrl = await getProfilePictureUrl(conn, participantJid);

    await conn.sendMessage(groupId, {
        text: msg,
        contextInfo: {
            mentionedJid: [userJid, authorJid].filter((jid): jid is string => !!jid),
            externalAdReply: {
                mediaUrl: pickRandom([info.nna, info.nna2, info.md]),
                mediaType: 2,
                showAdAttribution: false,
                renderLargerThumbnail: false,
                title: type === 'promote' ? 'NUEVO ADMINS 🥳' : '📛 UN ADMINS MENOS',
                body: type === 'promote' ? 'Weon eres admin portante mal 😉' : 'Jjjj Ya no eres admin 😹',
                containsAutoReply: true,
                ...(ppUrl ? {thumbnailUrl: ppUrl} : {}),
                sourceUrl: 'skyultraplus.com'
            }
        }
    });
}

async function getProfilePictureUrl(conn: EventConn, jid: string): Promise<string | null> {
    try {
        return await conn.profilePictureUrl(jid, 'image') || null;
    } catch {
        return null;
    }
}
