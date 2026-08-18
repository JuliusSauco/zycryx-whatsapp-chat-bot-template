import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import {toAudio} from '../../lib/converter.js';
import {httpBuffer} from '../../lib/http-client.js';

export type VoiceEffect = 'anonymous' | 'robot' | 'grave' | 'aguda' | 'niño' | 'demonio';

const TMP_DIR = path.join(process.cwd(), 'tmp');
const VOICE_EFFECTS: VoiceEffect[] = ['anonymous', 'robot', 'grave', 'aguda', 'niño', 'demonio'];

export function isVoiceEffect(value: string): value is VoiceEffect {
    return VOICE_EFFECTS.includes(value as VoiceEffect);
}

export function listVoiceEffects(): VoiceEffect[] {
    return [...VOICE_EFFECTS];
}

export async function convertMediaToMp3(media: Buffer): Promise<Buffer | null> {
    const audio = await toAudio(media, 'mp4');
    return audio.data || null;
}

export async function synthesizeTtsPtt(text: string, lang = 'es', effect: VoiceEffect | null = null): Promise<Buffer> {
    await fs.promises.mkdir(TMP_DIR, {recursive: true});
    const source = await synthTTS(text, lang);
    const ogg = await applyEffect(source, effect);
    try {
        return await fs.promises.readFile(ogg);
    } finally {
        await Promise.all([
            fs.promises.rm(source, {force: true}),
            fs.promises.rm(ogg, {force: true}),
        ]);
    }
}

export function splitTtsText(text: string, maxLength = 180): string[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const chunks: string[] = [];
    let remaining = normalized;
    while (remaining.length > maxLength) {
        const window = remaining.slice(0, maxLength + 1);
        const boundary = Math.max(window.lastIndexOf('. '), window.lastIndexOf(', '), window.lastIndexOf(' '));
        const cut = boundary > 0 ? boundary + 1 : maxLength;
        chunks.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

function runFFmpeg(args: string[]): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        const ff = spawn('ffmpeg', args);
        let stderr = '';
        ff.stderr.on('data', (data) => (stderr += data.toString()));
        ff.on('close', (code) => {
            if (code === 0) resolve(true);
            else reject(new Error('ffmpeg error:\n' + stderr));
        });
    });
}

async function synthTTS(text: string, lang = 'es'): Promise<string> {
    const safeLanguage = /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(lang) ? lang : 'es';
    const chunks = splitTtsText(text);
    if (!chunks.length) throw new Error('El texto TTS no puede estar vacío.');
    if (chunks.length > 12) throw new Error('El texto TTS excede el máximo permitido.');

    const audioParts = await Promise.all(chunks.map(chunk => {
        const params = new URLSearchParams({
            ie: 'UTF-8',
            client: 'tw-ob',
            tl: safeLanguage,
            q: chunk,
        });
        return httpBuffer(`https://translate.google.com/translate_tts?${params}`, {
            headers: {'User-Agent': 'Mozilla/5.0'},
            timeoutMs: 15_000,
        });
    }));
    const outPath = path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}-raw.mp3`);
    await fs.promises.writeFile(outPath, Buffer.concat(audioParts));
    return outPath;
}

async function applyEffect(inputWav: string, style: VoiceEffect | null = null): Promise<string> {
    const outPath = path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}-out.ogg`);
    const styleFilters: Record<VoiceEffect, string> = {
        anonymous: 'asetrate=44100*0.75,lowpass=f=1400,highpass=f=180',
        robot: 'chorus=0.6:0.9:55:0.4:0.25:2',
        grave: 'asetrate=44100*0.80',
        aguda: 'asetrate=44100*1.20',
        niño: 'asetrate=44100*1.25,treble=g=5',
        demonio: 'asetrate=44100*0.65,areverb=70:70:100',
    };
    const audioFilter = style ? styleFilters[style] : 'anull';
    await runFFmpeg([
        '-y',
        '-i', inputWav,
        '-af', audioFilter,
        '-ac', '1',
        '-ar', '48000',
        '-c:a', 'libopus',
        '-b:a', '48k',
        outPath,
    ]);
    return outPath;
}
