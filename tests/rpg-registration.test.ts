import assert from 'node:assert/strict';
import {
    ageFromBirthday,
    isPrivateBotChat,
    isProfileEditCommand,
    isRegistrationCommand,
    normalizeGender,
    normalizeNationality,
    normalizeProfileName,
    parseBirthday,
    parseRegistrationIdentity,
    PROFILE_COMMAND_PATTERN,
    profileCommandScope,
} from '../src/plugins/rpg/rpg-registration.helpers.js';

for (const alias of ['reg', 'register', 'registrar', 'registro', 'registrarse', 'signup', 'verify', 'verificar']) {
    assert.equal(isRegistrationCommand(alias), true, `missing registration alias: ${alias}`);
    assert.equal(PROFILE_COMMAND_PATTERN.test(alias), true, `router does not match registration alias: ${alias}`);
}
for (const command of [
    'setnombre', 'setname', 'setgenero', 'setgender', 'setnacionalidad', 'setnationality',
    'setbirthday', 'setcumple', 'setcumpleanos', 'setcumpleaños',
]) {
    assert.equal(isProfileEditCommand(command), true, `missing profile edit command: ${command}`);
    assert.equal(PROFILE_COMMAND_PATTERN.test(command), true, `router does not match profile command: ${command}`);
}

assert.equal(isPrivateBotChat('573001112233@s.whatsapp.net'), true);
assert.equal(isPrivateBotChat('120363000000@g.us'), false);
assert.equal(profileCommandScope(true), 'redirect_to_private');
assert.equal(profileCommandScope(false), 'execute_private');
assert.deepEqual(parseRegistrationIdentity('Alex.25'), {ok: true, name: 'Alex', age: 25});
assert.deepEqual(parseRegistrationIdentity('María José|18'), {ok: true, name: 'María José', age: 18});
assert.deepEqual(parseRegistrationIdentity('Alex.4'), {ok: false, reason: 'too_young'});
assert.deepEqual(parseRegistrationIdentity('Alex.101'), {ok: false, reason: 'too_old'});
assert.deepEqual(parseRegistrationIdentity(`${'a'.repeat(45)}.20`), {ok: false, reason: 'name_too_long'});
assert.deepEqual(parseRegistrationIdentity('sin edad'), {ok: false, reason: 'format'});

assert.equal(normalizeProfileName('  María   José✓  '), 'María José');
assert.equal(normalizeProfileName('x'), null);
assert.equal(normalizeGender('male'), 'hombre');
assert.equal(normalizeGender('FEMENINO'), 'mujer');
assert.equal(normalizeGender('3'), 'otro');
assert.equal(normalizeGender('desconocido'), null);
assert.equal(normalizeNationality('  República   Dominicana '), 'República Dominicana');
assert.equal(normalizeNationality('C0lombia'), null);
assert.equal(normalizeNationality('x'), null);

assert.equal(parseBirthday('30/10/2000'), '2000-10-30');
assert.equal(parseBirthday('31/02/2000'), null);
assert.equal(parseBirthday('01/01/2200'), null);
assert.ok(ageFromBirthday('2000-10-30') >= 25);

console.log('rpg-registration.test.ts OK');
