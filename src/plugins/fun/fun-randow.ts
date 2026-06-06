import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js'
import {pickRandom} from '../../utils/random.js'
import {asmaulhusna, bucin, chiste, piropo} from './fun-randow.data.js'
import type {ExtendedConn} from '../../types/context.js'
import type {BotMessage} from '../../types/message.js'

interface LuminaiResponse {
    result?: string;
}


type RandomFunCommand = 'piropo' | 'chiste' | 'reto' | 'verdad';

interface RandomFunConfig {
    prompt: string;
    logic: string;
    fallback: () => readonly string[];
    title: string;
    render: (result: string) => string;
}

const randomFunConfigs: Record<RandomFunCommand, RandomFunConfig> = {
    piropo: {
        prompt: 'Cuéntame un piropo, solo di el piropo no agregue mas texto.',
        logic: 'piropo',
        fallback: () => piropo,
        title: '💞 PIROPO',
        render: result => `*╭╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼*\n➢ ${result}\n*╰╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼*`,
    },
    chiste: {
        prompt: 'Cuéntame un chiste, puede ser de cualquier tipo de humor, no repita los chiste haz chiste como jaimito, yayo, solo di el chiste no agregue mas texto y haz chiste nuevo 2024 no repitan los mismo chiste pasado xD.',
        logic: 'chiste',
        fallback: () => chiste,
        title: '😹 CHISTE',
        render: result => `*┏━━━━━━━━━━━━┓*\n😹 ${result} 😹\n*┗━━━━━━━━━━━━┛*`,
    },
    reto: {
        prompt: 'Dame un reto interesante para hacer, solo di el reto no agregue mas texto y no repitan los reto, que sea diferentes y divertido.',
        logic: 'reto',
        fallback: () => bucin,
        title: '😏 HE COJISTE RETO',
        render: result => `[ 𝙍𝙀𝙏𝙊 😏 ]\n\n"${result}"`,
    },
    verdad: {
        prompt: 'Dame una pregunta de verdad intrigante',
        logic: 'verdad',
        fallback: () => bucin,
        title: '🤔 ELIGIRTE VERDAD',
        render: result => `[ 𝙑𝙀𝙍𝘿𝘼𝘿 🤔 ]\n\n“${result}”`,
    },
};

export default definePlugin({
    help: ['piropo', 'chiste', 'reto', 'verdad', 'frases'],
    command: ['piropo', 'chiste', 'reto', 'verdad', 'frases'],
    tags: ['game'],
    register: true,
    async execute(m, {conn, command, usedPrefix, args}) {

    if (isRandomFunCommand(command)) {
        const config = randomFunConfigs[command];
        const result = await getRandomFunResult(config, m.sender);
        await replyRandomFun(conn, m, config, result);
        return;
    }

    if (command == 'frases') {
        const ejemplo = `*Asmaul Husna*`
        const organizar = `Desde Abu Hurairah radhiallahu anhu, Rasulullah SAW dijo: "Tengo noventa y nueve nombres, cien menos 1. Quien los memorice entrará en el Paraíso, y él es un acorde que ama el acorde."
Significado: "De hecho, yo tengo noventa y nueve nombres, también conocido como cien menos uno. Quien los cuente, entrará en el cielo; Él es Witr y ama a Witr".`
        const json = asmaulhusna
        let data = json.map((v, i) => `${i + 1}. ${v.latin}\n${v.arabic}\n${v.translation_id}`).join('\n\n')
        const selectedIndex = Number(args[0])
        if (isNaN(selectedIndex)) throw `Ejemplo:\n${usedPrefix + command} 1`
        if (args[0]) {
            if (selectedIndex < 1 || selectedIndex > 99) throw `mínimo 1 y máximo 99!`
            let {
                index,
                latin,
                arabic,
                translation_id,
                translation_en
            } = json.find((v) => v.index == String(args[0]).replace(/[^0-9]/g, ''))!
            return m.reply(`🔢 *Número:* ${index}
${arabic}
 
${latin}

${translation_id}

${translation_en}
`.trim())
        }
        m.reply(ejemplo + data + organizar)
    }
    }
})

async function luminsesi(q: string, username: string, logic: string): Promise<string | undefined> {
    try {
        const response = await httpJson<LuminaiResponse>("https://luminai.my.id", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
            content: q,
            user: username,
            prompt: logic,
            webSearchMode: true // true = resultado con url
            }),
        });
        return response.result;
    } catch (error: unknown) {
        logError(error);
    }
}

async function getRandomFunResult(config: RandomFunConfig, sender: string): Promise<string> {
    try {
        const result = await luminsesi(config.prompt, sender, config.logic);
        if (result?.trim()) return result;
    } catch {
    }

    return pickRandom(config.fallback());
}

async function replyRandomFun(conn: ExtendedConn, m: BotMessage, config: RandomFunConfig, result: string) {
    return conn.reply(m.chat, config.render(result), m, {
        contextInfo: {
            externalAdReply: {
                mediaUrl: null,
                mediaType: 1,
                description: null,
                title: config.title,
                body: '𝐒𝐮𝐩𝐞𝐫 𝐁𝐨𝐭 𝐃𝐞 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩',
                previewType: 0,
                thumbnail: m.pp,
                sourceUrl: pickRandom([info.md, info.yt, info.tiktok])
            }
        }
    });
}

function isRandomFunCommand(command: string): command is RandomFunCommand {
    return command in randomFunConfigs;
}
