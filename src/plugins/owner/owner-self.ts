import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setSubbotMode} from '../../services/subbot.service.js';

export default defineSdkPlugin({
    help: ['self'],
    tags: ['jadibot'],
    command: /^modoprivado|self|modoprivate$/i,
    owner: true,
    async execute(m, {args, conn, usedPrefix, command, sdk}) {
        const id = conn.user?.id;
        if (!id) return;
        const modoNuevo = args[0]?.toLowerCase();
        if (!["on", "off", "private", "public"].includes(modoNuevo)) return sdk.reply.message('owner.self.usage', {
            command: usedPrefix + command,
        });

        const nuevoModo = (modoNuevo === "on" || modoNuevo === "private") ? "private" : "public";
        try {
            await setSubbotMode(id, nuevoModo);
            const estado = nuevoModo === "private"
                ? sdk.content.message('owner.self.privateStatus')
                : sdk.content.message('owner.self.publicStatus');
            await sdk.reply.message('owner.self.success', {status: estado});
        } catch (err: unknown) {
            logError(err);
        }
    },
});
