import {definePlugin} from '../../core/define-plugin.js';
import {setSubbotName} from '../../services/subbot.service.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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
        if (!name) return m.reply(getRequiredPluginMessage('owner.setBotName.missing'));
        await setSubbotName(id, name);
        m.reply(renderTemplate(getRequiredPluginMessage('owner.setBotName.success'), {name}));
    },
});
