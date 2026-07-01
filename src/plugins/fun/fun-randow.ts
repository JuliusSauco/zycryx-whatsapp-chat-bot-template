import {logError} from '../../lib/logger.js';
import {defineSdkPlugin, type PluginContentSdk, type PluginHttpSdk} from '../../core/sdk-plugin.js'
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

function createRandomFunConfigs(pluginContent: PluginContentSdk): Record<RandomFunCommand, RandomFunConfig> {
    return {
    piropo: {
        prompt: pluginContent.message('fun.random.piropo.prompt'),
        logic: 'piropo',
        fallback: () => piropo,
        title: pluginContent.message('fun.random.piropo.title'),
        template: pluginContent.message('fun.random.piropo.result'),
    },
    chiste: {
        prompt: pluginContent.message('fun.random.chiste.prompt'),
        logic: 'chiste',
        fallback: () => chiste,
        title: pluginContent.message('fun.random.chiste.title'),
        template: pluginContent.message('fun.random.chiste.result'),
    },
    reto: {
        prompt: pluginContent.message('fun.random.reto.prompt'),
        logic: 'reto',
        fallback: () => bucin,
        title: pluginContent.message('fun.random.reto.title'),
        template: pluginContent.message('fun.random.reto.result'),
    },
    verdad: {
        prompt: pluginContent.message('fun.random.verdad.prompt'),
        logic: 'verdad',
        fallback: () => bucin,
        title: pluginContent.message('fun.random.verdad.title'),
        template: pluginContent.message('fun.random.verdad.result'),
    },
    };
}

export default defineSdkPlugin({
    help: ['piropo', 'chiste', 'reto', 'verdad', 'frases'],
    command: ['piropo', 'chiste', 'reto', 'verdad', 'frases'],
    tags: ['game'],
    register: true,
    async execute(m, {conn, command, usedPrefix, args, sdk}) {

    if (isRandomFunCommand(command)) {
        const randomFunConfigs = createRandomFunConfigs(sdk.content);
        const config = randomFunConfigs[command];
        const result = await getRandomFunResult(config, m.sender, sdk.http);
        await replyRandomFun(conn, m, config, result, sdk.content);
        return;
    }

    if (command == 'frases') {
        const ejemplo = sdk.content.message('fun.phrases.title')
        const organizar = sdk.content.message('fun.phrases.intro')
        const json = asmaulhusna
        let data = json.map((v, i) => `${i + 1}. ${v.latin}\n${v.arabic}\n${v.translation_id}`).join('\n\n')
        const selectedIndex = Number(args[0])
        if (isNaN(selectedIndex)) throw sdk.content.renderMessage('fun.phrases.usage', {command: usedPrefix + command})
        if (args[0]) {
            if (selectedIndex < 1 || selectedIndex > 99) throw sdk.content.message('fun.phrases.range')
            let {
                index,
                latin,
                arabic,
                translation_id,
                translation_en
            } = json.find((v) => v.index == String(args[0]).replace(/[^0-9]/g, ''))!
            return sdk.reply.message('fun.phrases.detail', {
                index,
                arabic,
                latin,
                translationId: translation_id,
                translationEn: translation_en,
            })
        }
        await sdk.reply.text(ejemplo + data + organizar)
    }
    }
})

async function luminsesi(q: string, username: string, logic: string, http: PluginHttpSdk): Promise<string | undefined> {
    try {
        const response = await http.json<LuminaiResponse>("https://luminai.my.id", {
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

async function getRandomFunResult(config: RandomFunConfig, sender: string, http: PluginHttpSdk): Promise<string> {
    try {
        const result = await luminsesi(config.prompt, sender, config.logic, http);
        if (result?.trim()) return result;
    } catch {
    }

    return pickRandom(config.fallback());
}

async function replyRandomFun(conn: ExtendedConn, m: BotMessage, config: RandomFunConfig, result: string, pluginContent: PluginContentSdk) {
    return conn.reply(m.chat, pluginContent.renderTemplate(config.template, {result}), m, {
        contextInfo: {
            externalAdReply: {
                mediaUrl: null,
                mediaType: 1,
                description: null,
                title: config.title,
                body: pluginContent.message('fun.random.adBody'),
                previewType: 0,
                thumbnail: m.pp,
                sourceUrl: pickRandom([info.md, info.yt, info.tiktok])
            }
        }
    });
}

function isRandomFunCommand(command: string): command is RandomFunCommand {
    return ['piropo', 'chiste', 'reto', 'verdad'].includes(command);
}
