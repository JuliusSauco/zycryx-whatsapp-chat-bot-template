import path from 'path';
import {httpBuffer} from '../lib/http-client.js';
import {getCachedBuffer, getCachedText} from '../lib/static-resource-cache.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import type {EventConn} from './group-event-types.js';
import {pickRandom as pickRandomItem} from '../utils/random.js';

export const DEFAULT_PP_PATH = path.join(process.cwd(), 'resources', 'media', 'menus', 'Menu1.jpg');

const TEXT_DIR = path.join(process.cwd(), 'resources', 'text', 'messages');

export function getWelcomeText(): string {
    return readTextFile('welcome.txt', 'HOLAA!! @user, ¡Bienvenido a *@group*! 🎉');
}

export function getByeText(): string {
    return readTextFile('bye.txt', 'Bueno, se fue @user 👋\n\nQue dios lo bendiga 😎');
}

export function pickRandom<T>(arr: T[]): T {
    return pickRandomItem(arr);
}

export function uniqueJids(jids: Array<string | null | undefined>): string[] {
    return [...new Set(jids.filter((jid): jid is string => !!jid && jid.includes('@')))];
}

export function getGroupMentionJids(participants: GroupParticipant[]): string[] {
    return uniqueJids(participants.map((participant) => {
        const withPhone = participant as GroupParticipant & {phoneNumber?: string};
        return withPhone.phoneNumber || participant.id;
    }));
}

export function getGroupAdminMentionJids(participants: GroupParticipant[]): string[] {
    return uniqueJids(participants
        .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin' || participant.isAdmin || participant.isSuperAdmin)
        .map((participant) => {
            const withPhone = participant as GroupParticipant & {phoneNumber?: string};
            return withPhone.phoneNumber || participant.id;
        }));
}

export async function getGroupEventImageBuffer(conn: EventConn, groupId: string, participantJid: string, userJid: string, preferGroupPhoto = false): Promise<Buffer | null> {
    const firstImage = preferGroupPhoto
        ? await getGroupImageBuffer(conn, groupId)
        : await getParticipantImageBuffer(conn, participantJid, userJid);
    if (firstImage) return firstImage;

    const secondImage = preferGroupPhoto
        ? await getParticipantImageBuffer(conn, participantJid, userJid)
        : await getGroupImageBuffer(conn, groupId);
    if (secondImage) return secondImage;

    return getDefaultPpBuffer();
}

function readTextFile(fileName: string, fallback: string): string {
    return getCachedText(path.join(TEXT_DIR, fileName))?.trim() || fallback;
}

function getDefaultPpBuffer(): Buffer | null {
    return getCachedBuffer(DEFAULT_PP_PATH);
}

async function downloadImageBuffer(url: string | null): Promise<Buffer | null> {
    if (!url) return null;
    try {
        return httpBuffer(url);
    } catch {
        return null;
    }
}

async function getProfilePictureUrl(conn: EventConn, jid: string): Promise<string | null> {
    try {
        return await conn.profilePictureUrl(jid, 'image') || null;
    } catch {
        return null;
    }
}

async function getParticipantImageBuffer(conn: EventConn, participantJid: string, userJid: string): Promise<Buffer | null> {
    const participantUrl = await getProfilePictureUrl(conn, participantJid)
        || (participantJid !== userJid ? await getProfilePictureUrl(conn, userJid) : null);
    return downloadImageBuffer(participantUrl);
}

async function getGroupImageBuffer(conn: EventConn, groupId: string): Promise<Buffer | null> {
    return downloadImageBuffer(await getProfilePictureUrl(conn, groupId));
}
