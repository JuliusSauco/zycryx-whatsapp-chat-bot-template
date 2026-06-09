import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {httpJson} from '../../lib/http-client.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js'
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
    template: string;
}

const randomFunConfigs: Record<RandomFunCommand, RandomFunConfig> = {
    piropo: {
        prompt: getRequiredPluginMessage('fun.random.piropo.prompt'),
        logic: 'piropo',
        fallback: () => piropo,
        title: getRequiredPluginMessage('fun.random.piropo.title'),
        template: getRequiredPluginMessage('fun.random.piropo.result'),
    },
    chiste: {
        prompt: getRequiredPluginMessage('fun.random.chiste.prompt'),
        logic: 'chiste',
        fallback: () => chiste,
        title: getRequiredPluginMessage('fun.random.chiste.title'),
        template: getRequiredPluginMessage('fun.random.chiste.result'),
    },
    reto: {
        prompt: getRequiredPluginMessage('fun.random.reto.prompt'),
        logic: 'reto',
        fallback: () => bucin,
        title: getRequiredPluginMessage('fun.random.reto.title'),
        template: getRequiredPluginMessage('fun.random.reto.result'),
    },
    verdad: {
        prompt: getRequiredPluginMessage('fun.random.verdad.prompt'),
        logic: 'verdad',
        fallback: () => bucin,
        title: getRequiredPluginMessage('fun.random.verdad.title'),
        template: getRequiredPluginMessage('fun.random.verdad.result'),
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
        const ejemplo = getRequiredPluginMessage('fun.phrases.title')
        const organizar = getRequiredPluginMessage('fun.phrases.intro')
        const json = asmaulhusna
        let data = json.map((v, i) => `${i + 1}. ${v.latin}\n${v.arabic}\n${v.translation_id}`).join('\n\n')
        const selectedIndex = Number(args[0])
        if (isNaN(selectedIndex)) throw renderTemplate(getRequiredPluginMessage('fun.phrases.usage'), {command: usedPrefix + command})
        if (args[0]) {
            if (selectedIndex < 1 || selectedIndex > 99) throw getRequiredPluginMessage('fun.phrases.range')
            let {
                index,
                latin,
                arabic,
                translation_id,
                translation_en
            } = json.find((v) => v.index == String(args[0]).replace(/[^0-9]/g, ''))!
            return m.reply(renderTemplate(getRequiredPluginMessage('fun.phrases.detail'), {
                index,
                arabic,
                latin,
                translationId: translation_id,
                translationEn: translation_en,
            }))
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
    return conn.reply(m.chat, renderTemplate(config.template, {result}), m, {
        contextInfo: {
            externalAdReply: {
                mediaUrl: null,
                mediaType: 1,
                description: null,
                title: config.title,
                body: getRequiredPluginMessage('fun.random.adBody'),
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
