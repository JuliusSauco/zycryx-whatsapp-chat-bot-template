import os from 'os';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';
import {limitOutput, runSensitiveFileCommand, sanitizeCommandError} from '../../lib/sensitive-command.js';

export default defineSdkPlugin({
    help: ['speedtest'],
    tags: ['main'],
    command: /^(speedtest?|test?speed)$/i,
    register: true,
    async execute(_m, {sdk}) {
    await sdk.reply.react("🚀")
    try {
        const {stdout, stderr} = await runSensitiveFileCommand('python3', ['speed.py', '--secure', '--share'], {
            timeoutMs: 120_000,
            maxBuffer: 128 * 1024,
        });
        if (stdout.trim()) {
            const match = stdout.match(/http[^"]+\.png/);
            const urlImagen = match ? match[0] : null;
            await sdk.sendMessage({
                text: limitOutput(stdout.trim()),
                contextInfo: {
                    externalAdReply: {
                        title: "< ＩＮＦＯ - ＳＰＥＥＤＴＥＳＴ />", body: `${toTime(os.uptime() * 1000)}`, mediaType: 1,
                        renderLargerThumbnail: true,
                        thumbnailUrl: urlImagen, sourceUrl: info.nna
                    }
                }
            })
            //conn.sendMessage(m.chat, {image: {url: urlImagen}, caption: stdout.trim()}, {quoted: m});
        }
        if (stderr.trim()) {
            const match2 = stderr.match(/http[^"]+\.png/);
            const urlImagen2 = match2 ? match2[0] : null;
            await sdk.sendMessage({
                text: limitOutput(stderr.trim()), contextInfo: {
                    externalAdReply: {
                        title: "< ＩＮＦＯ - ＳＰＥＥＤＴＥＳＴ />", body: `${toTime(os.uptime() * 1000)}`, mediaType: 1,
                        renderLargerThumbnail: true,
                        thumbnailUrl: urlImagen2,
                        sourceUrl: info.nna
                    }
                }
            })
        }
    } catch (e: unknown) {
        return sdk.reply.text(sanitizeCommandError(e))
    }
    }
});

function toTime(milliseconds: number) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    return `${days} days, ${hours % 24} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`;
}
