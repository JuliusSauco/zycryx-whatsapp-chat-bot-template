import {definePlugin} from '../../core/define-plugin.js';
import {getGroupSettings, setGroupBooleanFlag} from '../../services/group-settings.service.js';

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
            return m.reply('✅ Registro de mensajes activado para este grupo.');
        }

        if (['off', 'desactivar', 'inactivo', 'disable', 'apagar'].includes(action)) {
            await setGroupBooleanFlag(m.chat, 'messageLogging', false);
            return m.reply('✅ Registro de mensajes desactivado para este grupo.');
        }

        if (['estado', 'status'].includes(action)) {
            const settings = await getGroupSettings(m.chat);
            const enabled = settings?.messageLogging ?? false;
            return m.reply(`📋 Registro de mensajes: ${enabled ? 'activado ✅' : 'desactivado ❌'}`);
        }

        return m.reply(`⚠️ Uso:\n${usedPrefix + command} on\n${usedPrefix + command} off\n${usedPrefix + command} estado`);
    },
});
