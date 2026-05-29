import cp, {exec as _exec} from 'child_process';
import {promisify} from 'util';
import {definePlugin} from '../core/define-plugin.js';

let exec = promisify(_exec).bind(cp);

export default definePlugin({
    help: ['$'],
    tags: ['owner'],
    customPrefix: /^[$]\s?/,
    rowner: true,
    async execute(m, {conn, isROwner}) {
        if (!isROwner) return;
        const legacyConn = conn as any;
        if (legacyConn.user?.jid !== legacyConn.user?.jid) return;

        m.react("💻");

        let commandInput = m.originalText?.replace(/^\$+\s?/, '').trim();
        let o;
        try {
            o = await exec(commandInput);
        } catch (e: any) {
            o = e;
        } finally {
            let {stdout, stderr} = o;
            if (stdout?.trim()) m.reply(stdout);
            if (stderr?.trim()) m.reply(stderr);
        }
    }
});
