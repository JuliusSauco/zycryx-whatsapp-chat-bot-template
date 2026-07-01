import {defineSdkPlugin, type PluginContentSdk} from '../../core/sdk-plugin.js'
import {clearAiMemory} from '../../services/chat-memory.service.js';
import {setAutorespondPrompt, setMemoryTtl} from '../../services/group-settings.service.js';
import {readFile} from 'fs/promises';
import path from 'path';
import {loadJsonResource} from '../../lib/local-json-resource.js';

interface PromptPresetResource {
    label: string;
    file: string;
}

interface PromptResourcesManifest {
    presets: Record<string, PromptPresetResource>;
}

const PROMPTS_MANIFEST_PATH = 'resources/data/prompts.json';

async function readPromptPreset(preset: PromptPresetResource): Promise<string> {
    return (await readFile(path.resolve(process.cwd(), preset.file), 'utf-8')).trim();
}

async function getPromptManifest(): Promise<PromptResourcesManifest> {
    return loadJsonResource<PromptResourcesManifest>(PROMPTS_MANIFEST_PATH);
}

function buildPromptUsage(content: PluginContentSdk, command: string, presets: Record<string, PromptPresetResource>): string {
    const presetLines = Object.entries(presets)
        .map(([key, preset]) => content.renderMessage('group.prompt.presetLine', {command, key, label: preset.label}))
        .join('\n');
    return content.renderMessage('group.prompt.usage', {command, presets: presetLines});
}

export default defineSdkPlugin({
    help: ['setprompt', 'resetai', 'timeIA'],
    tags: ['group'],
    command: /^setprompt|autorespond|clearmemory|clearai|resetai|memttl|timeIA$/i,
    admin: true,
    group: true,
    async execute(m, {sdk}) {
    const input = sdk.text?.trim().toLowerCase();
    const promptManifest = await getPromptManifest();

    if (sdk.command === 'clearmemory' || sdk.command === 'clearai' || sdk.command === 'resetai') {
        await clearAiMemory(sdk.chatId);
        return sdk.reply.message('group.prompt.memoryCleared');
    }

    if (sdk.command === 'timeIA' || sdk.command === 'memttl') {
        if (!sdk.isOwner) return sdk.reply.message('group.prompt.ownerOnly');
        if (!sdk.text) return sdk.reply.message('group.prompt.ttlUsage', {command: sdk.usedPrefix + sdk.command});

        if (sdk.text === '0') {
            await setMemoryTtl(sdk.chatId, 0);
            return sdk.reply.message('group.prompt.memoryDisabled');
        }

        const match = sdk.text.match(/^(\d+)([smhd])$/i);
        if (!match) return sdk.reply.message('group.prompt.invalidTtl');
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const unitToSeconds: Record<string, number> = {s: 1, m: 60, h: 3600, d: 86400};
        const seconds = num * unitToSeconds[unit];
        await setMemoryTtl(sdk.chatId, seconds);
        return sdk.reply.message('group.prompt.ttlUpdated', {value: `${num}${unit}`, seconds});
    }

    if (!sdk.text) return sdk.reply.text(buildPromptUsage(sdk.content, sdk.usedPrefix + sdk.command, promptManifest.presets));
    let prompt: string | null = null;
    const preset = input ? promptManifest.presets[input] : undefined;
    const isDelete = ['delete', 'borrar'].includes(input);
    const resetMemory = true;

    if (isDelete) {
        prompt = null;
    } else if (preset) {
        prompt = await readPromptPreset(preset);
    } else {
        prompt = sdk.text;
    }

    await setAutorespondPrompt(sdk.chatId, prompt);
    if (resetMemory) {
        await clearAiMemory(sdk.chatId);
    }
    const promptLabel = preset ? preset.label : prompt;
    return prompt ? sdk.reply.message('group.prompt.saved', {label: promptLabel || ''}) : sdk.reply.message('group.prompt.deleted');
    }
});

;
