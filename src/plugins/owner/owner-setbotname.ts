import {definePlugin} from '../../core/define-plugin.js';
import {setSubbotName} from '../../services/subbot.service.js';

export default definePlugin({
    help: ["setbotname <name>"],
    tags: ["jadibot"],
    command: /^setbotname$/i,
    register: true,
    owner: true,
    async execute(m, {args, conn}) {
        const id = conn.user?.id;
        if (!id) return;
        const name = args.join(" ").trim();
        if (!name) return m.reply("❌ Escribe un nombre para el bot.\n\nEjemplo:\n/setbotname LoliBot 😎");
        await setSubbotName(id, name);
        m.reply(`✅ Nombre del bot actualizado a:\n*${name}*`);
    },
});
