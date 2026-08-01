import type {Contact, WASocket} from '@whiskeysockets/baileys';
import {enqueueBackgroundTask} from '../lib/background-task-queue.js';
import {getNumberByLid, upsertUser} from '../services/user.service.js';
import type {UpsertUserInput} from '../domain/users.js';
import {cleanJid, isLidJid, isUserJid, jidToPhone, normalizeWhatsAppUsername} from '../utils/jid.js';

type ContactUpdate = Partial<Contact> & Pick<Contact, 'id'>;

export function registerContactUserSync(sock: Pick<WASocket, 'ev'>): void {
    const enqueueContacts = (contacts: Partial<Contact>[]): void => {
        for (const contact of contacts) {
            if (!contact.id || !Object.prototype.hasOwnProperty.call(contact, 'username')) continue;
            enqueueBackgroundTask('sync-contact-user', async () => {
                const input = await buildContactUserUpsert(contact as ContactUpdate);
                if (input) await upsertUser(input);
            }, {key: `sync-contact-user:${cleanJid(contact.id)}`, maxRetries: 1});
        }
    };

    sock.ev.on('contacts.upsert', enqueueContacts);
    sock.ev.on('contacts.update', enqueueContacts);
}

export async function buildContactUserUpsert(contact: ContactUpdate): Promise<UpsertUserInput | null> {
    const rawId = cleanJid(contact.id || '');
    const rawPhone = toPhoneJid(contact.phoneNumber);
    const lid = [contact.lid, rawId].map(value => cleanJid(value || '')).find(isLidJid);

    let userId = [rawPhone, rawId].find(isUserJid) || '';
    let num = userId ? jidToPhone(userId) : null;
    if (!userId && lid) {
        num = await getNumberByLid(lid);
        userId = num ? `${num}@s.whatsapp.net` : lid;
    }
    if (!userId) return null;

    return {
        id: userId,
        nombre: contact.notify?.trim() || 'sin name',
        username: normalizeWhatsAppUsername(contact.username),
        num,
        lid,
    };
}

function toPhoneJid(value: string | undefined): string {
    const cleaned = cleanJid(value || '');
    if (isUserJid(cleaned)) return cleaned;
    const phone = cleaned.replace(/\D/g, '');
    return /^\d{8,15}$/.test(phone) ? `${phone}@s.whatsapp.net` : '';
}
