import {definePlugin} from '../../core/define-plugin.js'
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

function buildPromptUsage(command: string, presets: Record<string, PromptPresetResource>): string {
    const presetLines = Object.entries(presets)
        .map(([key, preset]) => `${command} ${key} - ${preset.label}`)
        .join('\n');
    return `📌 *Uso del comando ${command} de esta forma:*
${presetLines}
${command} tu texto - ✍️ prompt personalizado
${command} delete|borrar - 🧹 borrar prompt y memoria`;
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
        return m.reply('🧠 Memoria del chat borrada correctamente. El bot empezará desde cero.');
    }

    if (command === 'timeIA' || command === 'memttl') {
        if (!isOwner) return m.reply('⛔ Solo el *OWNER* puede poner más de 24 horas.');
        if (!text) return m.reply(`⏱️ *Uso:* ${usedPrefix + command} 10m | 2h | 1d | 0
Unidades válidas: s (seg), m (min), h (horas), d (días)
Ejemplos:
${usedPrefix + command} 30m      → memoria se borra tras 30 minutos
${usedPrefix + command} 2h       → 2 horas
${usedPrefix + command} 0        → se borra en cada mensaje
`);

        if (text === '0') {
            await setMemoryTtl(m.chat, 0);
            return m.reply('🧠 Memoria desactivada. El bot responderá sin historial.');
        }

        const match = text.match(/^(\d+)([smhd])$/i);
        if (!match) return m.reply('❌ Formato inválido. Usa: 10m, 2h, 1d');
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const unitToSeconds: Record<string, number> = {s: 1, m: 60, h: 3600, d: 86400};
        const seconds = num * unitToSeconds[unit];
        await setMemoryTtl(m.chat, seconds);
        return m.reply(`✅ Tiempo de memoria actualizado a *${num}${unit}* (${seconds} segundos).`);
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
    return m.reply(prompt ? `✅ *Configuración exitosa.*\n\n*Has establecido un nuevo prompt para este chat.*\n💬 A partir de ahora, el bot usará las indicaciones que hayas establecido.\n\n> *Recuerda etiquetar "@tag" o responder a un mensaje del bot para que te responda.*\n\n` + promptLabel : '🗑️ *Prompt borrado con éxito.*');
    }
});

;
