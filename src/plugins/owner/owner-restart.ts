import {definePlugin} from '../../core/define-plugin.js';

export default definePlugin({
    help: ['restart'],
    tags: ['owner'],
    command: ['restart', 'reiniciar'],
    owner: true,
    async execute(m, {conn}) {
        //if (!process.send) throw 'Dont: node main.js\nDo: node index.js'
        if (conn.user?.id) {
            async function loading() {
                var hawemod = ["10%", "30%", "50%", "80%", "100%"]
                let {key} = await conn.sendMessage(m.chat, {text: `*Reiniciando...*`}, {quoted: m})
                for (let i = 0; i < hawemod.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await conn.sendMessage(m.chat, {text: hawemod[i], edit: key}, {quoted: m})
                }
                await conn.sendMessage(m.chat, {
                    text: `🚀 Reiniciando Bot...\nPor favor espere un momento`,
                    edit: key
                }, {quoted: m});
                //process.send("reset")
                process.exit(0);
            }

            await loading()
        } else {
            throw 'eh'
        }
    }
});
