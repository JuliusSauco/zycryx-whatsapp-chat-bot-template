import {definePlugin} from '../../core/define-plugin.js';
import {
    auditSensitiveCommand,
    getExecOutput,
    limitOutput,
    runSensitiveShellCommand,
    sanitizeCommandError,
} from '../../lib/sensitive-command.js';

export default definePlugin({
    help: ['$'],
    tags: ['owner'],
    customPrefix: /^[$]\s?/,
    rowner: true,
    async execute(m, {isROwner}) {
        if (!isROwner) return;

        await m.react("💻");

        const commandInput = m.originalText?.replace(/^\$+\s?/, '').trim();
        if (!commandInput) return;
        auditSensitiveCommand({action: 'shell-exec', sender: m.sender, chatId: m.chat, command: commandInput});
        try {
            const {stdout, stderr} = await runSensitiveShellCommand(commandInput);
            if (stdout.trim()) await m.reply(limitOutput(stdout));
            if (stderr.trim()) await m.reply(limitOutput(stderr));
        } catch (e: unknown) {
            const {stdout, stderr} = getExecOutput(e);
            if (stdout.trim()) await m.reply(limitOutput(stdout));
            if (stderr.trim()) await m.reply(limitOutput(stderr));
            if (!stdout.trim() && !stderr.trim()) await m.reply(sanitizeCommandError(e));
        }
    }
});
