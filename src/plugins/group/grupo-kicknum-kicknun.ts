import {defineSdkPlugin} from '../../core/sdk-plugin.js'
export default defineSdkPlugin({
    help: ['kicknum', 'listnum'],
    tags: ['group'],
    command: /^(kicknum|listanum|listnum)$/i,
    admin: true,
    botAdmin: true,
    group: true,
    async execute(m, {sdk}) {
    if (!sdk.args[0]) return sdk.reply.message('group.kickNum.missingPrefix', {command: sdk.usedPrefix + sdk.command});
    if (isNaN(Number(sdk.args[0]))) return sdk.reply.message('group.kickNum.invalidPrefix', {command: sdk.usedPrefix + sdk.command});

    const prefijo = sdk.args[0].replace(/[+]/g, '');
    const botJid = sdk.conn.user?.id || '';
    const encontrados = sdk.participants.map(u => u.id).filter(v => v !== botJid && v.startsWith(prefijo));
    const numeros = encontrados.map(v => '⭔ @' + v.replace(/@.+/, ''));
    if (!encontrados.length) return sdk.reply.message('group.kickNum.empty', {prefix: prefijo});

    switch (sdk.command) {
        case 'listanum':
        case 'listnum':
            return sdk.reply.message('group.kickNum.list', {
                prefix: prefijo,
                numbers: numeros.join('\n'),
            }, null, {mentions: encontrados});

        case 'kicknum':
            if (!sdk.isBotAdmin) return sdk.reply.message('group.kickNum.botNotAdmin');
            await sdk.reply.message('group.kickNum.start', {prefix: prefijo});
            const ownerGroup = sdk.chatId.split('-')[0] + '@s.whatsapp.net';
            for (const user of encontrados) {
                const error = sdk.content.renderMessage('group.kickNum.alreadyGone', {user: user.split('@')[0]});
                const protegido = [ownerGroup, botJid, global.owner + '@s.whatsapp.net'];

                if (!protegido.includes(user)) {
                    try {
                        const r = await sdk.conn.groupParticipantsUpdate(sdk.chatId, [user], 'remove');
                        if (r[0]?.status === '404') await sdk.reply.text(error, null, {mentions: [user]});
                    } catch (e: unknown) {
                        await sdk.reply.message('group.kickNum.removeError', {user: user.split('@')[0]}, null, {mentions: [user]});
                    }
                    await delay(10000);
                }
            }
            return sdk.reply.message('group.kickNum.done');
    }
    }
});
;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
