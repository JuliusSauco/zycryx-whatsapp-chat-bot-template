import {setSubbotBooleanFlag} from '../services/subbot.service.js'
import {definePlugin} from '../core/define-plugin.js'

export default definePlugin({
    help: ['setprivacy', 'setprestar'],
    tags: ['jadibot'],
    command: /^(privacy|prestar|setprestar|setprivacy)$/i,
    owner: true,
    register: true,
    async execute(m, {conn, command, args, usedPrefix}) {
    const val = args[0];
    if (!['1', '0'].includes(val)) return m.reply(`Usa:\n${usedPrefix}${command} 1 (activar)\n${usedPrefix}${command} 0 (desactivar)`);

    const id = conn.user?.id;
    if (!id) return
    const botId = id.replace(/:\d+/, '');
    try {
        if (/setprivacy|privacy/i.test(command)) {
            const privacyVal = val === '1';
            await setSubbotBooleanFlag(botId, 'privacy', privacyVal);
            return m.reply(privacyVal ? '✅ *Privacidad activada.*\n> Tu número no se mostrará en la lista de bots.' : '✅ *Privacidad desactivada.*\n> Tu número se mostrará en la lista de bots.');
        }

        if (/setprestar|prestar/i.test(command)) {
            const prestarVal = val === '1';
            await setSubbotBooleanFlag(botId, 'prestar', prestarVal);
            return m.reply(prestarVal ? '✅ *Prestar bot activado.*\n> Los usuarios pueden usar el bot para unirlo a grupos.' : '✅ *Prestar bot desactivado.*\n> Los usuarios no podrán unir el bot a grupos.');
        }
    } catch (err: unknown) {
        console.error(err);
    }
    }
})
