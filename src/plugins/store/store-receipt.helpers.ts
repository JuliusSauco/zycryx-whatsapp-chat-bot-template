import type {BotMessage} from '../../types/message.js';
import type {SdkPluginContext} from '../../core/plugin-sdk.js';
import {getSecurityOverview} from '../../services/store.service.js';
import {getSecurityDailyPrice} from '../../domain/store.js';

export async function deliverPrivateReceipt(
    m: BotMessage,
    context: SdkPluginContext,
    receipt: string,
    messageRoot: 'store' | 'economy.shared' = 'store',
): Promise<unknown> {
    const overview = await getSecurityOverview(m.sender);
    const guide = context.sdk.content.renderMessage('economy.shared.privateGuide', {
        prefix: context.usedPrefix,
        level: overview.level,
        securityPrice: getSecurityDailyPrice(Math.max(1, overview.level)),
    });
    const detailedReceipt = `${receipt}\n\n${guide}`;
    if (!m.isGroup) return context.sdk.reply.text(detailedReceipt);
    const user = m.sender.split('@')[0];
    try {
        await context.conn.sendMessage(m.sender, {text: detailedReceipt});
        return context.conn.reply(m.chat, context.sdk.content.renderMessage(`${messageRoot}.groupCompleted`, {user}), m, {
            mentions: [m.sender],
        });
    } catch {
        return context.conn.reply(m.chat, context.sdk.content.renderMessage(`${messageRoot}.privateDeliveryFailed`, {user}), m, {
            mentions: [m.sender],
        });
    }
}
