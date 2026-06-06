import cp, {exec as _exec} from 'child_process';
import {promisify} from 'util';
import {definePlugin} from '../../core/define-plugin.js';

let exec = promisify(_exec).bind(cp);

type ExecResult = {
    stdout?: string;
    stderr?: string;
};

export default definePlugin({
    help: ['$'],
    tags: ['owner'],
    customPrefix: /^[$]\s?/,
    rowner: true,
    async execute(m, {isROwner}) {
        if (!isROwner) return;

        m.react("💻");

        let commandInput = m.originalText?.replace(/^\$+\s?/, '').trim();
        let o: ExecResult = {};
        try {
            o = await exec(commandInput);
        } catch (e: unknown) {
            o = e as ExecResult;
        } finally {
            let {stdout, stderr} = o;
            if (stdout?.trim()) m.reply(stdout);
            if (stderr?.trim()) m.reply(stderr);
        }
    }
});
