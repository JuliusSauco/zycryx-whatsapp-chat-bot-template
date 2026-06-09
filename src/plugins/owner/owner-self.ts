import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {setSubbotMode} from '../../services/subbot.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

export default definePlugin({
    help: ['self'],
    tags: ['jadibot'],
    command: /^modoprivado|self|modoprivate$/i,
    owner: true,
    async execute(m, {args, conn, usedPrefix, command}) {
        const id = conn.user?.id;
        if (!id) return;
        const modoNuevo = args[0]?.toLowerCase();
        if (!["on", "off", "private", "public"].includes(modoNuevo)) return m.reply(renderTemplate(getRequiredPluginMessage('owner.self.usage'), {
            command: usedPrefix + command,
        }));

        const nuevoModo = (modoNuevo === "on" || modoNuevo === "private") ? "private" : "public";
        try {
            await setSubbotMode(id, nuevoModo);
            const estado = nuevoModo === "private"
                ? getRequiredPluginMessage('owner.self.privateStatus')
                : getRequiredPluginMessage('owner.self.publicStatus');
            m.reply(renderTemplate(getRequiredPluginMessage('owner.self.success'), {status: estado}));
        } catch (err: unknown) {
            logError(err);
        }
    },
});
