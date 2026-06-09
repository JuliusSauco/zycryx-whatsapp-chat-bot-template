import {logError} from '../../lib/logger.js';
import {setSubbotBooleanFlag} from '../../services/subbot.service.js'
import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'

export default definePlugin({
    help: ['setprivacy', 'setprestar'],
    tags: ['jadibot'],
    command: /^(privacy|prestar|setprestar|setprivacy)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, command, args, usedPrefix}) {
    const val = args[0];
    if (!['1', '0'].includes(val)) return m.reply(renderTemplate(getRequiredPluginMessage('subbots.privacy.usage'), {command: usedPrefix + command}));

    const id = conn.user?.id;
    if (!id) return
    const botId = id.replace(/:\d+/, '');
    try {
        if (/setprivacy|privacy/i.test(command)) {
            const privacyVal = val === '1';
            await setSubbotBooleanFlag(botId, 'privacy', privacyVal);
            return m.reply(privacyVal ? getRequiredPluginMessage('subbots.privacy.privacyOn') : getRequiredPluginMessage('subbots.privacy.privacyOff'));
        }

        if (/setprestar|prestar/i.test(command)) {
            const prestarVal = val === '1';
            await setSubbotBooleanFlag(botId, 'prestar', prestarVal);
            return m.reply(prestarVal ? getRequiredPluginMessage('subbots.privacy.lendOn') : getRequiredPluginMessage('subbots.privacy.lendOff'));
        }
    } catch (err: unknown) {
        logError(err);
    }
    }
})
