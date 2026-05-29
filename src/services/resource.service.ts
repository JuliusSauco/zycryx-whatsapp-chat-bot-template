import type {BotMessage} from '../types/message.js';
import type {Plugin} from '../types/plugin.js';
import {repositories} from './data-source.js';

export async function consumeCommandResources(
    sender: string,
    plugin: Plugin,
    m: BotMessage,
): Promise<string | null> {
    const resources = await repositories.users.getResources(sender);

    if (plugin.limit) {
        if (resources.limite < plugin.limit) {
            return '*⚠ 𝐒𝐮𝐬 𝐝𝐢𝐚𝐦𝐚𝐧𝐭𝐞 💎 𝐬𝐞 𝐡𝐚𝐧 𝐚𝐠𝐨𝐭𝐚𝐝𝐨 𝐩𝐮𝐞𝐝𝐞 𝐜𝐨𝐦𝐩𝐫𝐚𝐫 𝐦𝐚𝐬 𝐮𝐬𝐚𝐧𝐝𝐨 𝐞𝐥 𝐜𝐨𝐦𝐚𝐧𝐝𝐨:* #buy.';
        }

        await repositories.users.decrementLimit(sender, plugin.limit);
        await m.reply(`*${plugin.limit} diamante 💎 usado${plugin.limit > 1 ? 's' : ''}.*`);
    }

    if (plugin.money) {
        if (resources.money < plugin.money) {
            return '*NO TIENE SUFICIENTES LOLICOINS 🪙*';
        }

        await repositories.users.decrementMoney(sender, plugin.money);
        await m.reply(`*${plugin.money} LoliCoins usado${plugin.money > 1 ? 's' : ''} 🪙*`);
    }

    if (plugin.level && resources.level < plugin.level) {
        return `*⚠️ 𝐍𝐞𝐜𝐞𝐬𝐢𝐭𝐚 𝐞𝐥 𝐧𝐢𝐯𝐞𝐥 ${plugin.level}, 𝐩𝐚𝐫𝐚 𝐩𝐨𝐝𝐞𝐫 𝐮𝐬𝐚𝐫 𝐞𝐬𝐭𝐞 𝐜𝐨𝐦𝐚𝐧𝐝𝐨, 𝐓𝐮 𝐧𝐢𝐯𝐞𝐥 𝐚𝐜𝐭𝐮𝐚𝐥 𝐞𝐬:* ${resources.level}`;
    }

    return null;
}
