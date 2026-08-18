import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {UserWallet} from '../src/domain/users.js';
import {findLeaderboardPosition, resolveLeaderboardIdentity} from '../src/plugins/rpg/rpg-leaderboard.helpers.js';

type RankedIdentity = Pick<UserWallet, 'id' | 'username' | 'num' | 'lid'>;

const lid = '424242424242424@lid';
const phone = '573001234567@s.whatsapp.net';

assert.deepEqual(resolveLeaderboardIdentity({id: phone, username: null, num: null, lid: null}), {
    label: '573001234567', mentionJid: phone,
});
assert.deepEqual(resolveLeaderboardIdentity({id: lid, username: '@My Queen', num: null, lid}), {
    label: 'My Queen', mentionJid: lid,
});
assert.deepEqual(resolveLeaderboardIdentity({id: lid, username: 'My Queen', num: '573001234567', lid}), {
    label: 'My Queen', mentionJid: phone,
});
assert.deepEqual(resolveLeaderboardIdentity({id: lid, username: 'My Queen', num: null, lid}, [{
    id: lid, participantAlt: phone,
}]), {
    label: 'My Queen', mentionJid: phone,
});
const unresolvedLid = resolveLeaderboardIdentity({id: lid, username: null, num: null, lid});
assert.equal(unresolvedLid.label, 'usuario-2424');
assert.equal(unresolvedLid.mentionJid, lid);
assert.notEqual(unresolvedLid.mentionJid, '424242424242424@s.whatsapp.net');

const users: RankedIdentity[] = [
    {id: phone, username: null, num: phone, lid},
    {id: '111111111111@lid', username: null, num: null, lid: '111111111111@lid'},
];
assert.equal(findLeaderboardPosition(users, [lid]), 1);
assert.equal(findLeaderboardPosition(users, [phone]), 1);
assert.equal(findLeaderboardPosition(users, ['111111111111@lid']), 2);
assert.equal(findLeaderboardPosition(users, ['999999999999@s.whatsapp.net']), 0);

const pluginSource = readFileSync('src/plugins/rpg/rpg-leaderboard.ts', 'utf8');
assert.doesNotMatch(pluginSource, /parseMention/);
assert.match(pluginSource, /mentions: \[\.\.\.mentions\]/);
const repositorySource = readFileSync('src/adapters/drizzle/user-wallet.repository.ts', 'utf8');
for (const identity of ['username', 'phone', 'lid']) {
    assert.match(repositorySource, new RegExp(`identityValue\\('${identity}'\\)`));
}

console.log('rpg-leaderboard.test.ts OK');
