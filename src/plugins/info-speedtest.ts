import os from 'os';
import cp from 'child_process';
import {promisify} from 'util';
import {definePlugin} from '../core/define-plugin.js';

const exec = promisify(cp.exec).bind(cp);

export default definePlugin({
    help: ['speedtest'],
    tags: ['main'],
    command: /^(speedtest?|test?speed)$/i,
    register: true,
    async execute(m) {
    let o;
    m.react("🚀")
    try {
        o = await exec('python3 speed.py --secure --share');
        const {stdout, stderr} = o;
        if (stdout.trim()) {
            const match = stdout.match(/http[^"]+\.png/);
            const urlImagen = match ? match[0] : null;
            await conn.relayMessage(m.chat, {
                extendedTextMessage: {
                    text: stdout.trim(),
                    contextInfo: {
                        externalAdReply: {
                            title: "< ＩＮＦＯ - ＳＰＥＥＤＴＥＳＴ />", body: `${toTime(os.uptime() * 1000)}`, mediaType: 1,
                            // @ts-ignore
                            previewType: 0, renderLargerThumbnail: true,
                            thumbnailUrl: urlImagen, sourceUrl: info.nna
                        }
                    }, mentions: null
                }
            }, {quoted: m})
            //conn.sendMessage(m.chat, {image: {url: urlImagen}, caption: stdout.trim()}, {quoted: m});
        }
        if (stderr.trim()) {
            const match2 = stderr.match(/http[^"]+\.png/);
            const urlImagen2 = match2 ? match2[0] : null;
            await conn.relayMessage(m.chat, {
                extendedTextMessage: {
                    text: stderr.trim(), contextInfo: {
                        externalAdReply: {
                            title: "< ＩＮＦＯ - ＳＰＥＥＤＴＥＳＴ />", body: `${toTime(os.uptime() * 1000)}`, mediaType: 1,
                            // @ts-ignore
                            previewType: 0, renderLargerThumbnail: true,
                            thumbnailUrl: urlImagen2,
                            sourceUrl: info.nna
                        }
                    }, mentions: null
                }
            }, {quoted: m})
        }
    } catch (e: any) {
        o = e.message;
        return m.reply(o)
    }
    }
});

function toTime(milliseconds: any) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    return `${days} days, ${hours % 24} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`;
}
