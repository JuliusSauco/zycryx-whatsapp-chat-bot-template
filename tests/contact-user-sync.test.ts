import assert from 'node:assert/strict';
import {buildContactUserUpsert} from '../src/core/contact-user-sync.js';
import {repositories} from '../src/services/data-source.js';

const originalUsers = repositories.users;

repositories.users = {
    ...originalUsers,
    findNumberByLid: async lid => lid === '12345@lid' ? '573001112233' : null,
};

try {
    assert.deepEqual(await buildContactUserUpsert({
        id: '573009998887@s.whatsapp.net',
        lid: '99887@lid',
        notify: 'Alias nuevo',
        username: '@usuario.nuevo',
    }), {
        id: '573009998887@s.whatsapp.net',
        nombre: 'Alias nuevo',
        username: 'usuario.nuevo',
        num: '573009998887',
        lid: '99887@lid',
    });

    assert.deepEqual(await buildContactUserUpsert({
        id: '12345@lid',
        username: 'otro_usuario',
    }), {
        id: '573001112233@s.whatsapp.net',
        nombre: 'sin name',
        username: 'otro_usuario',
        num: '573001112233',
        lid: '12345@lid',
    });

    assert.equal(await buildContactUserUpsert({id: 'invalid', username: 'usuario'}), null);
} finally {
    repositories.users = originalUsers;
}

console.log('contact-user-sync.test.ts OK');
