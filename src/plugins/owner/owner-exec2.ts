import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {
    auditSensitiveCommand,
    getExecOutput,
    limitOutput,
    runSensitiveShellCommand,
    sanitizeCommandError,
} from '../../lib/sensitive-command.js';

export default defineSdkPlugin({
    help: ['$'],
    tags: ['owner'],
    customPrefix: /^[$]\s?/,
    customPrefixPriority: 100,
    rowner: true,
    async execute(m, {isROwner, sdk}) {
        if (!isROwner) return;

        await sdk.reply.react("💻");

        const commandInput = m.originalText?.replace(/^\$+\s?/, '').trim();
        if (!commandInput) return;
        auditSensitiveCommand({action: 'shell-exec', sender: m.sender, chatId: m.chat, command: commandInput});
        try {
            const {stdout, stderr} = await runSensitiveShellCommand(commandInput);
            if (stdout.trim()) await sdk.reply.text(limitOutput(stdout));
            if (stderr.trim()) await sdk.reply.text(limitOutput(stderr));
        } catch (e: unknown) {
            const {stdout, stderr} = getExecOutput(e);
            if (stdout.trim()) await sdk.reply.text(limitOutput(stdout));
            if (stderr.trim()) await sdk.reply.text(limitOutput(stderr));
            if (!stdout.trim() && !stderr.trim()) await sdk.reply.text(sanitizeCommandError(e));
        }
    }
});
