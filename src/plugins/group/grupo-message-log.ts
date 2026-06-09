import {definePlugin} from '../../core/define-plugin.js';
import {getGroupSettings, setGroupBooleanFlag} from '../../services/group-settings.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['msglog on/off/estado', 'registromsg on/off/estado'],
    tags: ['group'],
    command: /^(msglog|messagelog|registromsg|registrarmensajes)$/i,
    admin: true,
    group: true,
    async execute(m, {args, usedPrefix, command}) {
        const action = (args[0] || 'estado').toLowerCase();

        if (['on', 'activar', 'activo', 'enable', 'encender'].includes(action)) {
            await setGroupBooleanFlag(m.chat, 'messageLogging', true);
            return m.reply(getRequiredPluginMessage('group.messageLog.enabled'));
        }

        if (['off', 'desactivar', 'inactivo', 'disable', 'apagar'].includes(action)) {
            await setGroupBooleanFlag(m.chat, 'messageLogging', false);
            return m.reply(getRequiredPluginMessage('group.messageLog.disabled'));
        }

        if (['estado', 'status'].includes(action)) {
            const settings = await getGroupSettings(m.chat);
            const enabled = settings?.messageLogging ?? false;
            return m.reply(renderTemplate(getRequiredPluginMessage('group.messageLog.status'), {
                status: enabled ? getRequiredPluginMessage('group.messageLog.statusEnabled') : getRequiredPluginMessage('group.messageLog.statusDisabled')
            }));
        }

        return m.reply(renderTemplate(getRequiredPluginMessage('group.messageLog.usage'), {command: usedPrefix + command}));
    },
});
