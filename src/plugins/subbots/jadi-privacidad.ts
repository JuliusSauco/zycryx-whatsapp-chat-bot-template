import {logError} from '../../lib/logger.js';
import {setSubbotBooleanFlag} from '../../services/subbot.service.js'
import {defineSdkPlugin} from '../../core/sdk-plugin.js'

export default defineSdkPlugin({
    help: ['setprivacy', 'setprestar'],
    tags: ['jadibot'],
    command: /^(privacy|prestar|setprestar|setprivacy)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, command, args, usedPrefix, sdk}) {
    const val = args[0];
    if (!['1', '0'].includes(val)) return sdk.reply.message('subbots.privacy.usage', {command: usedPrefix + command});

    const id = conn.user?.id;
    if (!id) return
    const botId = id.replace(/:\d+/, '');
    try {
        if (/setprivacy|privacy/i.test(command)) {
            const privacyVal = val === '1';
            await setSubbotBooleanFlag(botId, 'privacy', privacyVal);
            return sdk.reply.text(privacyVal ? sdk.content.message('subbots.privacy.privacyOn') : sdk.content.message('subbots.privacy.privacyOff'));
        }

        if (/setprestar|prestar/i.test(command)) {
            const prestarVal = val === '1';
            await setSubbotBooleanFlag(botId, 'prestar', prestarVal);
            return sdk.reply.text(prestarVal ? sdk.content.message('subbots.privacy.lendOn') : sdk.content.message('subbots.privacy.lendOff'));
        }
    } catch (err: unknown) {
        logError(err);
    }
    }
})
