import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {getGroupSettings, setGroupBooleanFlag} from '../../services/group-settings.service.js';

export default defineSdkPlugin({
    help: ['msglog on/off/estado', 'registromsg on/off/estado'],
    tags: ['group'],
    command: /^(msglog|messagelog|registromsg|registrarmensajes)$/i,
    admin: true,
    group: true,
    async execute(m, {sdk}) {
        const action = (sdk.args[0] || 'estado').toLowerCase();

        if (['on', 'activar', 'activo', 'enable', 'encender'].includes(action)) {
            await setGroupBooleanFlag(sdk.chatId, 'messageLogging', true);
            return sdk.reply.message('group.messageLog.enabled');
        }

        if (['off', 'desactivar', 'inactivo', 'disable', 'apagar'].includes(action)) {
            await setGroupBooleanFlag(sdk.chatId, 'messageLogging', false);
            return sdk.reply.message('group.messageLog.disabled');
        }

        if (['estado', 'status'].includes(action)) {
            const settings = await getGroupSettings(sdk.chatId);
            const enabled = settings?.messageLogging ?? false;
            return sdk.reply.message('group.messageLog.status', {
                status: enabled ? sdk.content.message('group.messageLog.statusEnabled') : sdk.content.message('group.messageLog.statusDisabled')
            });
        }

        return sdk.reply.message('group.messageLog.usage', {command: sdk.usedPrefix + sdk.command});
    },
});
