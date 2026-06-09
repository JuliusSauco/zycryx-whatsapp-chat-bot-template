import {definePlugin} from '../../core/define-plugin.js'
import {clearAiMemory} from '../../services/chat-memory.service.js';
import {setAutorespondPrompt, setMemoryTtl} from '../../services/group-settings.service.js';
import {readFile} from 'fs/promises';
import path from 'path';
import {loadJsonResource} from '../../lib/local-json-resource.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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

function buildPromptUsage(command: string, presets: Record<string, PromptPresetResource>): string {
    const presetLines = Object.entries(presets)
        .map(([key, preset]) => renderTemplate(getRequiredPluginMessage('group.prompt.presetLine'), {command, key, label: preset.label}))
        .join('\n');
    return renderTemplate(getRequiredPluginMessage('group.prompt.usage'), {command, presets: presetLines});
}

export default definePlugin({
    help: ['setprompt', 'resetai', 'timeIA'],
    tags: ['group'],
    command: /^setprompt|autorespond|clearmemory|clearai|resetai|memttl|timeIA$/i,
    admin: true,
    group: true,
    async execute(m, {text, usedPrefix, command, isOwner}) {
    const input = text?.trim().toLowerCase();
    const promptManifest = await getPromptManifest();

    if (command === 'clearmemory' || command === 'clearai' || command === 'resetai') {
        await clearAiMemory(m.chat);
        return m.reply(getRequiredPluginMessage('group.prompt.memoryCleared'));
    }

    if (command === 'timeIA' || command === 'memttl') {
        if (!isOwner) return m.reply(getRequiredPluginMessage('group.prompt.ownerOnly'));
        if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('group.prompt.ttlUsage'), {command: usedPrefix + command}));

        if (text === '0') {
            await setMemoryTtl(m.chat, 0);
            return m.reply(getRequiredPluginMessage('group.prompt.memoryDisabled'));
        }

        const match = text.match(/^(\d+)([smhd])$/i);
        if (!match) return m.reply(getRequiredPluginMessage('group.prompt.invalidTtl'));
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const unitToSeconds: Record<string, number> = {s: 1, m: 60, h: 3600, d: 86400};
        const seconds = num * unitToSeconds[unit];
        await setMemoryTtl(m.chat, seconds);
        return m.reply(renderTemplate(getRequiredPluginMessage('group.prompt.ttlUpdated'), {value: `${num}${unit}`, seconds}));
    }

    if (!text) return m.reply(buildPromptUsage(usedPrefix + command, promptManifest.presets));
    let prompt: string | null = null;
    const preset = input ? promptManifest.presets[input] : undefined;
    const isDelete = ['delete', 'borrar'].includes(input);
    const resetMemory = true;

    if (isDelete) {
        prompt = null;
    } else if (preset) {
        prompt = await readPromptPreset(preset);
    } else {
        prompt = text;
    }

    await setAutorespondPrompt(m.chat, prompt);
    if (resetMemory) {
        await clearAiMemory(m.chat);
    }
    const promptLabel = preset ? preset.label : prompt;
    return m.reply(prompt ? renderTemplate(getRequiredPluginMessage('group.prompt.saved'), {label: promptLabel || ''}) : getRequiredPluginMessage('group.prompt.deleted'));
    }
});

;
