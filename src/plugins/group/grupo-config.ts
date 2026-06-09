import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
export default definePlugin({
    help: ['group open/close', 'grupo abrir/cerrar', 'grupo aprobar +number'],
    tags: ['group'],
    command: /^(group|grupo)$/i,
    async execute(m, {conn, args, usedPrefix, command, isOwner}) {
    let groupId = m.isGroup ? m.chat : null;
    if (!m.isGroup && !isOwner) return m.reply(getRequiredPluginMessage('group.config.ownerPrivateOnly'));
    let identifier, action, target;

    if (!m.isGroup && !m.isAdmin && isOwner) {
        if (args.length < 2) return m.reply(getRequiredPluginMessage('group.config.invalidPrivateFormat'))

        if (args[0].startsWith('id')) {
            identifier = args[1];
            action = args[2]?.replace('-', '').trim().toLowerCase();
            target = args[3]?.replace('+', '') + '@s.whatsapp.net';
            groupId = identifier;
        } else if (args[0].match(/chat\.whatsapp\.com/)) {
            identifier = args[0];
            if (args[1] === '-') {
                action = args[2]?.trim().toLowerCase();
                target = args[3]?.replace('+', '') + '@s.whatsapp.net';
            } else {
                action = args[1]?.replace('-', '').trim().toLowerCase();
                target = args[2]?.replace('+', '') + '@s.whatsapp.net';
            }
            const inviteCode = identifier.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
            if (!inviteCode) return m.reply(getRequiredPluginMessage('group.config.invalidInvite'))
            try {
                const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
                groupId = inviteInfo.id;
            } catch (e: unknown) {
                return m.reply(getRequiredPluginMessage('group.config.inviteInfoError'))
            }
        } else if (args[0] === 'enlace') {
            identifier = args[1];
            if (args[2] === '-') {
                action = args[3]?.trim().toLowerCase();
                target = args[4]?.replace('+', '') + '@s.whatsapp.net';
            } else {
                action = args[2]?.replace('-', '').trim().toLowerCase();
                target = args[3]?.replace('+', '') + '@s.whatsapp.net';
            }
            if (!identifier.match(/chat\.whatsapp\.com/)) {
                return m.reply(getRequiredPluginMessage('group.config.missingValidLink'))
            }
            const inviteCode = identifier.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
            if (!inviteCode) return m.reply(getRequiredPluginMessage('group.config.invalidInvite'))
            try {
                const inviteInfo = await conn.groupGetInviteInfo(inviteCode);
                groupId = inviteInfo.id;
            } catch (e: unknown) {
                return m.reply(getRequiredPluginMessage('group.config.inviteInfoError'))
            }
        } else {
            return m.reply(getRequiredPluginMessage('group.config.invalidIdentifier'))
        }
    } else if (m.isGroup) {
        action = args[0]?.toLowerCase();
        target = args[1]?.replace(/@/, '') + '@s.whatsapp.net';
    }

    if (!groupId) return m.reply(getRequiredPluginMessage('group.config.missingGroup'));
    if (!action) return m.reply(getRequiredPluginMessage('group.config.missingAction'))

    switch (action) {
        case 'abrir':
        case 'open':
        case 'abierto':
            await conn.groupSettingUpdate(groupId, 'not_announcement');
            m.reply(getRequiredPluginMessage('group.config.opened'));
            break;

        case 'cerrar':
        case 'close':
        case 'cerrado':
            await conn.groupSettingUpdate(groupId, 'announcement');
            m.reply(getRequiredPluginMessage('group.config.closed'));
            break;

        case 'addadmin':
        case 'promote':
        case 'daradmin':
            if (!target) return m.reply(getRequiredPluginMessage('group.config.missingPromoteTarget'))
            await conn.groupParticipantsUpdate(groupId, [target], 'promote');
            m.reply(renderTemplate(getRequiredPluginMessage('group.config.promoted'), {user: target.split('@')[0]}));
            break;

        case 'removeadmin':
        case 'demote':
        case 'quitaradmin':
            if (!target) return m.reply(getRequiredPluginMessage('group.config.missingDemoteTarget'))
            await conn.groupParticipantsUpdate(groupId, [target], 'demote');
            m.reply(renderTemplate(getRequiredPluginMessage('group.config.demoted'), {user: target.split('@')[0]}));
            break;

        case 'kick':
        case 'eliminar':
            if (!target) return m.reply(getRequiredPluginMessage('group.config.missingKickTarget'))
            await conn.groupParticipantsUpdate(groupId, [target], 'remove');
            m.reply(renderTemplate(getRequiredPluginMessage('group.config.kicked'), {user: target.split('@')[0]}));
            break;

        case 'aprobar':
            if (!target) return m.reply(getRequiredPluginMessage('group.config.missingApproveTarget'))
            await conn.groupRequestParticipantsUpdate(groupId, [target], 'approve');
            m.reply(renderTemplate(getRequiredPluginMessage('group.config.approved'), {user: target.split('@')[0]}));
            break;
        default:
            return m.reply(renderTemplate(getRequiredPluginMessage('group.config.invalidCommand'), {
                command: usedPrefix + command,
            }))
    }
    }
});
;
