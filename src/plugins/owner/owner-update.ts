import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {
    auditSensitiveCommand,
    getExecOutput,
    limitOutput,
    runSensitiveFileCommand,
    sanitizeCommandError,
} from '../../lib/sensitive-command.js';

export default defineSdkPlugin({
    help: ['update'],
    tags: ['owner'],
    command: /^(update|actualizar|gitpull)$/i,
    owner: true,
    async execute(_m, {sdk}) {
        auditSensitiveCommand({action: 'git-pull', sender: sdk.sender, chatId: sdk.chatId, command: sdk.text});
        try {
            const args = ['pull', ...getSafeGitPullArgs(sdk.m.fromMe ? sdk.text : '')];
            const {stdout, stderr} = await runSensitiveFileCommand('git', args, {
                timeoutMs: 120_000,
                maxBuffer: 128 * 1024,
            });
            const output = `${stdout}${stderr ? `\n${stderr}` : ''}`.trim();
            let message = output;
            if (message.includes('Already up to date.')) message = sdk.content.message('owner.update.alreadyUpdated')
            if (message.includes('Updating')) message = sdk.content.renderMessage('owner.update.updateHeader', {output: limitOutput(output)})
            await sdk.reply.text(limitOutput(message || sdk.content.message('owner.update.alreadyUpdated')));
        } catch (e: unknown) {
            try {
                const {stdout} = await runSensitiveFileCommand('git', ['status', '--porcelain'], {
                    timeoutMs: 30_000,
                    maxBuffer: 64 * 1024,
                });
                if (stdout.length > 0) {
                    const conflictedFiles = stdout
                        .split('\n')
                        .filter(line => line.trim() !== '')
                        .map(line => {
                            if (line.includes('.npm/') || line.includes('.cache/') || line.includes('tmp/') || line.includes('BotSession/') || line.includes('npm-debug.log')) {
                                return null;
                            }
                            return sdk.content.renderMessage('owner.update.conflictItem', {file: line.slice(3)})
                        })
                        .filter(Boolean);
                    if (conflictedFiles.length > 0) {
                        const errorMessage = sdk.content.renderMessage('owner.update.conflict', {files: conflictedFiles.join('\n')})
                        await sdk.reply.text(limitOutput(errorMessage));
                    } else {
                        await sdk.reply.text(sanitizeCommandError(e));
                    }
                } else {
                    const {stdout, stderr} = getExecOutput(e);
                    await sdk.reply.text(limitOutput(stdout || stderr || sanitizeCommandError(e)));
                }
            } catch (error: unknown) {
                logError(error);
                await sdk.reply.text(sdk.content.message('owner.update.unknownError'))
            }
        }
    }
});

function getSafeGitPullArgs(input: string): string[] {
    if (!input.trim()) return [];
    return input
        .split(/\s+/)
        .filter(arg => /^[A-Za-z0-9._/@:-]+$/.test(arg))
        .slice(0, 4);
}
