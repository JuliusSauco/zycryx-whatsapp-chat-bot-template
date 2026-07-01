import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setSubbotName} from '../../services/subbot.service.js';

export default defineSdkPlugin({
    help: ["setbotname <name>"],
    tags: ["jadibot"],
    command: /^setbotname$/i,
    register: true,
    owner: true,
    async execute(m, {args, conn, sdk}) {
        const id = conn.user?.id;
        if (!id) return;
        const name = args.join(" ").trim();
        if (!name) return sdk.reply.message('owner.setBotName.missing');
        await setSubbotName(id, name);
        await sdk.reply.message('owner.setBotName.success', {name});
    },
});
