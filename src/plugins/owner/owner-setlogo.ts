import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {setSubbotLogoUrl} from '../../services/subbot.service.js';

export default defineSdkPlugin({
    help: ["setlogo <url>"],
    tags: ["jadibot"],
    command: /^setlogo$/i,
    register: true,
    owner: true,
    async execute(m, {args, conn, sdk}) {
        const id = conn.user?.id;
        if (!id) return;
        const url = args[0];
        if (!url || !url.startsWith("http")) return sdk.reply.message('owner.setLogo.invalidUrl');
        await setSubbotLogoUrl(id, url);
        await sdk.reply.message('owner.setLogo.success');
    },
});
