import {defineSdkPlugin} from '../../core/sdk-plugin.js';

export default defineSdkPlugin({
    help: ['restart'],
    tags: ['owner'],
    command: ['restart', 'reiniciar'],
    owner: true,
    async execute(m, {conn, sdk}) {
        //if (!process.send) throw 'Dont: node main.js\nDo: node index.js'
        if (conn.user?.id) {
            async function loading() {
                var hawemod = sdk.content.messageList('owner.restart.steps')
                let {key} = await conn.sendMessage(m.chat, {text: sdk.content.message('owner.restart.loading')}, {quoted: m})
                for (let i = 0; i < hawemod.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await conn.sendMessage(m.chat, {text: hawemod[i], edit: key}, {quoted: m})
                }
                await conn.sendMessage(m.chat, {
                    text: sdk.content.message('owner.restart.final'),
                    edit: key
                }, {quoted: m});
                //process.send("reset")
                process.exit(0);
            }

            await loading()
        } else {
            throw sdk.content.message('owner.restart.missingConnection')
        }
    }
});
