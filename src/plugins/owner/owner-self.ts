import {definePlugin} from '../../core/define-plugin.js';
import {setSubbotMode} from '../../services/subbot.service.js';

export default definePlugin({
    help: ['self'],
    tags: ['jadibot'],
    command: /^modoprivado|self|modoprivate$/i,
    owner: true,
    async execute(m, {args, conn, usedPrefix, command}) {
        const id = conn.user?.id;
        if (!id) return;
        const modoNuevo = args[0]?.toLowerCase();
        if (!["on", "off", "private", "public"].includes(modoNuevo)) return m.reply(`⚙️ Usa: *${usedPrefix + command} on* o *${usedPrefix + command} off*`);

        const nuevoModo = (modoNuevo === "on" || modoNuevo === "private") ? "private" : "public";
        try {
            await setSubbotMode(id, nuevoModo);
            const estado = nuevoModo === "private" ? "🔒 *Privado*" : "🌐 *Público*";
            m.reply(`✅ Modo cambiado a: ${estado}`);
        } catch (err: unknown) {
            console.error(err);
        }
    },
});
