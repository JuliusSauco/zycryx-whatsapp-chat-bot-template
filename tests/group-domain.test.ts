import assert from 'node:assert/strict';
import {
    mapContextGroupSettings,
    mapGroupSettings,
    mapNsfwGroupSettings,
    mapUserGroupRole,
    type GroupSettingsRow,
    type UserGroupRoleRow,
} from '../src/adapters/drizzle/group-settings.mapper.js';

const groupRow: GroupSettingsRow = {
    groupId: 'group@g.us',
    welcomeConfigId: 1,
    welcome: null,
    detect: null,
    antifake: null,
    antilink: null,
    antilink2: null,
    virusTotal: null,
    autoresponder: null,
    autoresponderMode: 'owner',
    autoresponderTrigger: 'all',
    gamesAccessMode: 'invalid',
    toolsAccessMode: null,
    rpgAccessMode: 'admin',
    downloadsAccessMode: null,
    searchAccessMode: null,
    stickersAccessMode: null,
    convertersAccessMode: null,
    funAccessMode: null,
    modohorny: null,
    nsfwAccessMode: null,
    audios: null,
    antiStatus: null,
    modoadmin: true,
    photowelcome: null,
    welcomeRegisteredBy: null,
    welcomeHidetag: true,
    welcomeHidetagMode: null,
    welcomeGroupPhoto: null,
    bye: null,
    byeConfigId: 2,
    byeRegisteredBy: null,
    byeHidetag: false,
    byeHidetagMode: null,
    byeGroupPhoto: null,
    photobye: null,
    autolevelup: null,
    antiporn: null,
    nsfwHorario: null,
    sWelcome: null,
    sBye: null,
    sPromote: null,
    sDemote: null,
    sAutorespond: null,
    banned: null,
    expired: null,
    memoryTtl: null,
    primaryBot: null,
    autoAcceptMode: 'bad-mode',
    botAccessMode: null,
    messageLogging: null,
};

{
    const settings = mapGroupSettings(groupRow);
    assert.equal(settings.welcome, true);
    assert.equal(settings.detect, true);
    assert.equal(settings.autoresponderMode, 'owner');
    assert.equal(settings.autoresponderTrigger, 'all');
    assert.equal(settings.gamesAccessMode, 'all');
    assert.equal(settings.rpgAccessMode, 'admin');
    assert.equal(settings.botAccessMode, 'admin');
    assert.equal(settings.welcomeHidetagMode, 'all');
    assert.equal(settings.byeHidetagMode, 'off');
    assert.equal(settings.autoAcceptMode, 'off');
    assert.equal(settings.memory_ttl, 86400);
}

{
    const context = mapContextGroupSettings(groupRow);
    assert.equal(context.botAccessMode, 'admin');
    assert.equal(context.autoresponder, true);
    assert.equal(context.message_logging, false);
    assert.equal(context.autolevelup, true);
}

{
    const nsfw = mapNsfwGroupSettings(groupRow);
    assert.deepEqual(nsfw, {modohorny: false, nsfwAccessMode: 'owner', nsfw_horario: null});
}

{
    const roleRow: UserGroupRoleRow = {
        groupId: 'group@g.us',
        userId: 'user@s.whatsapp.net',
        role: 'Admin',
        roleDescription: null,
        updatedBy: null,
        updatedAt: null,
    };
    assert.deepEqual(mapUserGroupRole(roleRow), {
        group_id: 'group@g.us',
        user_id: 'user@s.whatsapp.net',
        role: 'Admin',
        role_description: null,
    });
}

console.log('group-domain.test.ts OK');
