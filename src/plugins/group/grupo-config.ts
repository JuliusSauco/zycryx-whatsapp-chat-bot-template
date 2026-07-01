import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['group open/close', 'grupo abrir/cerrar', 'grupo aprobar +number'],
    tags: ['group'],
    command: /^(group|grupo)$/i,
    async execute(m, {sdk}) {
    let groupId = sdk.isGroup ? sdk.chatId : null;
    if (!sdk.isGroup && !sdk.isOwner) return sdk.reply.message('group.config.ownerPrivateOnly');
    let identifier, action, target;

    if (!sdk.isGroup && !sdk.isAdmin && sdk.isOwner) {
        if (sdk.args.length < 2) return sdk.reply.message('group.config.invalidPrivateFormat')

        if (sdk.args[0].startsWith('id')) {
            identifier = sdk.args[1];
            action = sdk.args[2]?.replace('-', '').trim().toLowerCase();
            target = sdk.args[3]?.replace('+', '') + '@s.whatsapp.net';
            groupId = identifier;
        } else if (sdk.args[0].match(/chat\.whatsapp\.com/)) {
            identifier = sdk.args[0];
            if (sdk.args[1] === '-') {
                action = sdk.args[2]?.trim().toLowerCase();
                target = sdk.args[3]?.replace('+', '') + '@s.whatsapp.net';
            } else {
                action = sdk.args[1]?.replace('-', '').trim().toLowerCase();
                target = sdk.args[2]?.replace('+', '') + '@s.whatsapp.net';
            }
            const inviteCode = identifier.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
            if (!inviteCode) return sdk.reply.message('group.config.invalidInvite')
            try {
                const inviteInfo = await sdk.conn.groupGetInviteInfo(inviteCode);
                groupId = inviteInfo.id;
            } catch (e: unknown) {
                return sdk.reply.message('group.config.inviteInfoError')
            }
        } else if (sdk.args[0] === 'enlace') {
            identifier = sdk.args[1];
            if (sdk.args[2] === '-') {
                action = sdk.args[3]?.trim().toLowerCase();
                target = sdk.args[4]?.replace('+', '') + '@s.whatsapp.net';
            } else {
                action = sdk.args[2]?.replace('-', '').trim().toLowerCase();
                target = sdk.args[3]?.replace('+', '') + '@s.whatsapp.net';
            }
            if (!identifier.match(/chat\.whatsapp\.com/)) {
                return sdk.reply.message('group.config.missingValidLink')
            }
            const inviteCode = identifier.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
            if (!inviteCode) return sdk.reply.message('group.config.invalidInvite')
            try {
                const inviteInfo = await sdk.conn.groupGetInviteInfo(inviteCode);
                groupId = inviteInfo.id;
            } catch (e: unknown) {
                return sdk.reply.message('group.config.inviteInfoError')
            }
        } else {
            return sdk.reply.message('group.config.invalidIdentifier')
        }
    } else if (sdk.isGroup) {
        action = sdk.args[0]?.toLowerCase();
        target = sdk.args[1]?.replace(/@/, '') + '@s.whatsapp.net';
    }

    if (!groupId) return sdk.reply.message('group.config.missingGroup');
    if (!action) return sdk.reply.message('group.config.missingAction')

    switch (action) {
        case 'abrir':
        case 'open':
        case 'abierto':
            await sdk.conn.groupSettingUpdate(groupId, 'not_announcement');
            await sdk.reply.message('group.config.opened');
            break;

        case 'cerrar':
        case 'close':
        case 'cerrado':
            await sdk.conn.groupSettingUpdate(groupId, 'announcement');
            await sdk.reply.message('group.config.closed');
            break;

        case 'addadmin':
        case 'promote':
        case 'daradmin':
            if (!target) return sdk.reply.message('group.config.missingPromoteTarget')
            await sdk.conn.groupParticipantsUpdate(groupId, [target], 'promote');
            await sdk.reply.message('group.config.promoted', {user: target.split('@')[0]});
            break;

        case 'removeadmin':
        case 'demote':
        case 'quitaradmin':
            if (!target) return sdk.reply.message('group.config.missingDemoteTarget')
            await sdk.conn.groupParticipantsUpdate(groupId, [target], 'demote');
            await sdk.reply.message('group.config.demoted', {user: target.split('@')[0]});
            break;

        case 'kick':
        case 'eliminar':
            if (!target) return sdk.reply.message('group.config.missingKickTarget')
            await sdk.conn.groupParticipantsUpdate(groupId, [target], 'remove');
            await sdk.reply.message('group.config.kicked', {user: target.split('@')[0]});
            break;

        case 'aprobar':
            if (!target) return sdk.reply.message('group.config.missingApproveTarget')
            await sdk.conn.groupRequestParticipantsUpdate(groupId, [target], 'approve');
            await sdk.reply.message('group.config.approved', {user: target.split('@')[0]});
            break;
        default:
            return sdk.reply.message('group.config.invalidCommand', {
                command: sdk.usedPrefix + sdk.command,
            })
    }
    }
});
;
