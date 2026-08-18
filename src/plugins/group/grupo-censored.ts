import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {censorGroupUser, listGroupCensoredUsers, uncensorGroupUser} from '../../services/censored-user.service.js';
import {CENSORED_COMMAND_ACCESS_KEY, defaultCommandAccess} from '../../utils/command-access.js';
import {isGroupCreator} from '../../utils/group-creator.js';
import {cleanJid} from '../../utils/jid.js';
import {isProtectedCensoredTarget, resolveCensoredTarget} from '../../utils/censored-user.js';

export default defineSdkPlugin({
    help: ['censored @usuario', 'censored list', 'uncensored @usuario'],
    tags: ['group'],
    command: /^(censored|uncensored)$/i,
    botAdmin: true,
    group: true,
    register: true,
    commandAccess: {key: CENSORED_COMMAND_ACCESS_KEY, defaultRule: defaultCommandAccess(CENSORED_COMMAND_ACCESS_KEY)},
    async execute(m, {sdk}) {
        if (sdk.command === 'censored' && sdk.args[0]?.toLowerCase() === 'list') {
            const records = await listGroupCensoredUsers(sdk.chatId);
            if (!records.length) return sdk.reply.message('group.censored.listEmpty');
            const mentions = records.map(record => record.user_id || record.user_lid).filter(Boolean);
            const lines = records.map((record, index) => sdk.content.renderMessage('group.censored.listItem', {
                position: index + 1,
                user: record.user_id.split('@')[0],
                date: formatCensoredDate(record.created_at),
            }));
            const text = sdk.content.renderMessage('group.censored.listHeader', {total: records.length}) + lines.join('\n');
            return sdk.reply.text(text, null, {mentions});
        }

        if (m.mentionedJid.length > 1) return sdk.reply.message('group.censored.multipleTargets');
        const rawTarget = m.mentionedJid[0] || m.quoted?.sender;
        if (!rawTarget) return sdk.reply.message('group.censored.missingTarget');
        const target = resolveCensoredTarget(rawTarget, sdk.participants);

        if (sdk.command === 'censored') {
            const protectedReason = isProtectedCensoredTarget({
                actor: {
                    userId: sdk.sender,
                    userLid: m.lid,
                    isOwner: sdk.isOwner,
                    isGroupCreator: isGroupCreator({chatId: sdk.chatId, sender: sdk.sender, senderLid: m.lid, metadata: sdk.metadata}),
                    isAdmin: sdk.isAdmin,
                },
                target,
                chatId: sdk.chatId,
                metadata: sdk.metadata,
                botConfig: sdk.ctx.botConfig,
                botJid: sdk.conn.user?.id ? cleanJid(sdk.conn.user.id) : null,
            });
            if (protectedReason) return sdk.reply.message(`group.censored.${protectedReason}Target`);
            const result = await censorGroupUser({
                groupId: sdk.chatId,
                userId: target.userId,
                userLid: target.userLid,
                censoredBy: sdk.sender,
            });
            return sdk.reply.message(result.created ? 'group.censored.added' : 'group.censored.alreadyAdded', {
                user: target.mentionJid.split('@')[0],
            }, null, {mentions: [target.mentionJid]});
        }

        const result = await uncensorGroupUser(sdk.chatId, target.userId, target.userLid);
        return sdk.reply.message(result.removed ? 'group.censored.removed' : 'group.censored.alreadyRemoved', {
            user: target.mentionJid.split('@')[0],
        }, null, {mentions: [target.mentionJid]});
    },
});

function formatCensoredDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Bogota',
    }).format(date);
}
