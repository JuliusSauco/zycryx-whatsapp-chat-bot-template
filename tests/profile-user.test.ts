import assert from 'node:assert/strict';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import type {UserRecord} from '../src/domain/users.js';
import {repositories} from '../src/services/data-source.js';
import {resolveProfileUser, resolveStoredUserMention} from '../src/services/profile-user.service.js';
import {DEFAULT_PROFILE_AVATAR, loadProfileMedia} from '../src/plugins/rpg/rpg-profile.helpers.js';

const originalUsers = repositories.users;

function user(id: string, lid: string | null = null): UserRecord {
    return {
        id, lid, nombre: 'User', username: null, registered: false, num: id.endsWith('@s.whatsapp.net') ? id.split('@')[0] : null,
        banned: false, razonBan: null, avisosBan: 0, warnPv: false, warn: 0, warnAntiporn: 0,
        warnEstado: 0, edad: null, gender: null, birthday: null, money: 100, limite: 10, exp: 0,
        banco: 0, level: 0, role: 'novato', roleDescription: null, regTime: null, serialNumber: null,
        stickerPackname: null, stickerAuthor: null, ryTime: 0, lastwork: 0, lastmiming: 0, lastclaim: 0,
        dailystreak: 0, lastcofre: 0, lastrob: 0, lastslut: 0, timevot: 0, wait: 0, crime: 0,
        marry: null, marryRequest: null,
    };
}

function installStore(initial: UserRecord[] = []) {
    const store = new Map(initial.map(value => [value.id, value]));
    repositories.users = {
        ...originalUsers,
        findById: async id => store.get(id) ?? null,
        upsertBasicUser: async input => {
            if (!store.has(input.id)) store.set(input.id, user(input.id));
        },
        clearLidFromOtherUsers: async (lid, userId) => {
            for (const value of store.values()) if (value.id !== userId && value.lid === lid) value.lid = null;
        },
        setUserLid: async (userId, lid) => {
            const value = store.get(userId);
            if (value) value.lid = lid;
        },
    };
    return store;
}

try {
    {
        installStore([user('573001112233@s.whatsapp.net'), user('12345@lid')]);
        const resolved = await resolveProfileUser({rawJid: '12345@lid', aliases: ['573001112233@s.whatsapp.net']});
        assert.equal(resolved?.userId, '573001112233@s.whatsapp.net', 'phone JID must win when both records exist');
    }
    {
        installStore([user('12345@lid')]);
        const resolved = await resolveProfileUser({rawJid: '12345@lid', aliases: ['573001112233@s.whatsapp.net']});
        assert.equal(resolved?.userId, '12345@lid', 'legacy LID record must be reused when canonical row is absent');
    }
    {
        const spouse = user('12345@lid');
        spouse.num = '573001112233';
        installStore([spouse]);
        const mention = await resolveStoredUserMention('12345@lid');
        assert.deepEqual(mention, {
            tag: '@573001112233',
            mentionJid: '573001112233@s.whatsapp.net',
        });
    }
    {
        const store = installStore();
        const resolved = await resolveProfileUser({
            rawJid: '12345@lid',
            participants: [{id: '12345@lid', participantAlt: '573001112233@s.whatsapp.net'} as GroupParticipant],
            createIfMissing: true,
            displayName: 'Nuevo',
        });
        assert.equal(resolved?.userId, '573001112233@s.whatsapp.net');
        assert.equal(store.size, 1, 'new identity must create a single canonical row');
        assert.equal(store.get('573001112233@s.whatsapp.net')?.lid, '12345@lid');
    }

    const media = Buffer.from('image');
    assert.equal(await loadProfileMedia({
        conn: {profilePictureUrl: async () => 'https://example.test/avatar.jpg'} as never,
        mentionJid: '573001112233@s.whatsapp.net',
        fetchBuffer: async () => media,
    }), media);
    const groupFallback = Buffer.from('group-image');
    const requestedJids: string[] = [];
    assert.equal(await loadProfileMedia({
        conn: {profilePictureUrl: async (jid: string) => {
            requestedJids.push(jid);
            if (jid.endsWith('@s.whatsapp.net')) throw new Error('private');
            return 'https://example.test/group.jpg';
        }} as never,
        mentionJid: '573001112233@s.whatsapp.net',
        groupJid: '120363000000@g.us',
        fetchBuffer: async () => groupFallback,
    }), groupFallback);
    assert.deepEqual(requestedJids, ['573001112233@s.whatsapp.net', '120363000000@g.us']);
    assert.equal(await loadProfileMedia({
        conn: {profilePictureUrl: async (jid: string) => jid.endsWith('@g.us')
            ? 'https://example.test/group-expired.jpg'
            : 'https://example.test/user-expired.jpg'} as never,
        mentionJid: '573001112233@s.whatsapp.net',
        groupJid: '120363000000@g.us',
        fetchBuffer: async () => { throw new Error('expired'); },
    }), DEFAULT_PROFILE_AVATAR);
} finally {
    repositories.users = originalUsers;
}

console.log('profile-user.test.ts OK');
