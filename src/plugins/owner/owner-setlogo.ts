import {definePlugin} from '../../core/define-plugin.js';
import {setSubbotLogoUrl} from '../../services/subbot.service.js';

export default definePlugin({
    help: ["setlogo <url>"],
    tags: ["jadibot"],
    command: /^setlogo$/i,
    register: true,
    owner: true,
    async execute(m, {args, conn}) {
        const id = conn.user?.id;
        if (!id) return;
        const url = args[0];
        if (!url || !url.startsWith("http")) return m.reply("❌ Proporcione una URL válida de imagen.\n\nEjemplo:\n/setlogo https://i.imgur.com/logo.jpg");
        await setSubbotLogoUrl(id, url);
        m.reply("✅ Foto/logo del bot actualizada correctamente.");
    },
});
