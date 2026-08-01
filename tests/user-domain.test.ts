import assert from 'node:assert/strict';
import {mapUserRecord, mapUserResources, mapUserWallet, type UserRow, type UserWalletRow} from '../src/adapters/drizzle/user.mapper.js';
import {normalizeWhatsAppUsername, resolveSenderInfo} from '../src/utils/jid.js';

const baseUserRow: UserRow = {
    id: 'user@s.whatsapp.net',
    nombre: null,
    username: null,
    registered: null,
    num: null,
    lid: null,
    banned: null,
    razonBan: null,
    avisosBan: null,
    warnPv: null,
    warn: null,
    warnAntiporn: null,
    warnEstado: null,
    edad: null,
    gender: null,
    birthday: null,
    money: null,
    limite: null,
    exp: null,
    banco: null,
    level: null,
    role: null,
    roleDescription: null,
    regTime: null,
    serialNumber: null,
    stickerPackname: null,
    stickerAuthor: null,
    ryTime: null,
    lastwork: null,
    lastmiming: null,
    lastclaim: null,
    dailystreak: null,
    lastcofre: null,
    lastrob: null,
    lastslut: null,
    timevot: null,
    wait: null,
    crime: null,
    marry: null,
    marryRequest: null,
};

{
    const user = mapUserRecord(baseUserRow);
    assert.equal(user.registered, false);
    assert.equal(user.banned, false);
    assert.equal(user.warn, 0);
    assert.equal(user.money, 0);
    assert.equal(user.limite, 0);
    assert.equal(user.exp, 0);
    assert.equal(user.role, 'novato');
    assert.equal(user.serial_number, null);
}

{
    const wallet = mapUserWallet(baseUserRow as UserWalletRow);
    assert.equal(wallet.money, 0);
    assert.equal(wallet.banco, 0);
    assert.equal(wallet.wait, 0);
    assert.equal(wallet.role, 'novato');
}

{
    assert.deepEqual(mapUserResources(undefined), {limite: 0, money: 0, level: 0});
    assert.deepEqual(mapUserResources({limite: 3, money: null, level: 7}), {limite: 3, money: 0, level: 7});
}

{
    assert.equal(normalizeWhatsAppUsername(' @NuevoUsuario '), 'NuevoUsuario');
    assert.equal(normalizeWhatsAppUsername(''), null);
    assert.deepEqual(resolveSenderInfo({key: {
        remoteJid: '120363000000@g.us',
        participant: '12345@lid',
        participantAlt: '573001112233@s.whatsapp.net',
        participantUsername: 'nuevo.usuario',
    }}), {
        sender: '573001112233@s.whatsapp.net',
        lid: '12345@lid',
        username: 'nuevo.usuario',
    });
}

console.log('user-domain.test.ts OK');
