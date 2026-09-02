import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getDailyReminderSettings, setDailyReminderEnabled} from '../../services/daily-reminder.service.js';
import {getGroupCommandAccessRule, setGroupCommandAccessRule} from '../../services/group-settings.service.js';
import type {AccessMode} from '../../types/config.js';
import {accessModeLabel} from '../../utils/access-mode.js';
import {DAILY_REMINDER_COMMAND_ACCESS_KEY, defaultCommandAccess} from '../../utils/command-access.js';
import {getFamilyManagerLevel, getRequiredFamilyManagerLevel} from '../../utils/family-access-authority.js';

const PERMISSION_ALIASES: Readonly<Record<string, AccessMode>> = Object.freeze({
    admin: 'admin',
    admins: 'admin',
    superadmin: 'superadmin',
    creador: 'superadmin',
    owner: 'owner',
    owners: 'owner',
});

export default defineSdkPlugin({
    help: [
        'recordatoriodiario estado',
        'recordatoriodiario on',
        'recordatoriodiario off',
        'recordatoriodiario permisos <admin|superadmin|owner>',
    ],
    tags: ['admin'],
    command: ['recordatoriodiario', 'dailyreminder'],
    group: true,
    register: true,
    commandAccess: {
        key: DAILY_REMINDER_COMMAND_ACCESS_KEY,
        defaultRule: defaultCommandAccess(DAILY_REMINDER_COMMAND_ACCESS_KEY),
    },
    async execute(_m, {sdk, isGroupCreator}) {
        const action = (sdk.args[0] || 'estado').toLowerCase();
        const currentAccess = await getGroupCommandAccessRule(
            sdk.chatId,
            DAILY_REMINDER_COMMAND_ACCESS_KEY,
            defaultCommandAccess(DAILY_REMINDER_COMMAND_ACCESS_KEY),
        );

        if (action === 'on' || action === 'off') {
            const enabled = action === 'on';
            await setDailyReminderEnabled(sdk.chatId, enabled, sdk.sender);
            return sdk.reply.message('dailyReminder.config.updated', {
                status: enabled
                    ? sdk.content.message('dailyReminder.config.enabled')
                    : sdk.content.message('dailyReminder.config.disabled'),
            });
        }

        if (action === 'permisos' || action === 'permissions') {
            const accessMode = PERMISSION_ALIASES[(sdk.args[1] || '').toLowerCase()];
            if (!accessMode) return sdk.reply.usage(
                `${sdk.usedPrefix}${sdk.command} permisos <admin|superadmin|owner>`,
            );
            const actorLevel = getFamilyManagerLevel({
                isOwner: sdk.isOwner,
                isGroupCreator: Boolean(isGroupCreator),
                isAdmin: sdk.isAdmin,
            });
            const requiredLevel = getRequiredFamilyManagerLevel(currentAccess, {enabled: true, accessMode});
            if (actorLevel < requiredLevel) {
                return sdk.reply.userError(sdk.content.message(`dailyReminder.config.permissionDenied.${requiredLevel}`));
            }
            await setGroupCommandAccessRule(sdk.chatId, DAILY_REMINDER_COMMAND_ACCESS_KEY, {enabled: true, accessMode});
            return sdk.reply.message('dailyReminder.config.permissionUpdated', {
                access: accessModeLabel(accessMode),
            });
        }

        if (action !== 'estado' && action !== 'status') {
            return sdk.reply.usage(`${sdk.usedPrefix}${sdk.command} <estado|on|off|permisos>`);
        }

        const settings = await getDailyReminderSettings(sdk.chatId);
        return sdk.reply.message('dailyReminder.config.status', {
            status: settings.enabled
                ? sdk.content.message('dailyReminder.config.enabled')
                : sdk.content.message('dailyReminder.config.disabled'),
            access: accessModeLabel(currentAccess.accessMode),
        });
    },
});
