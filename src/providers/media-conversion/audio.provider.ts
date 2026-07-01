import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import gTTS from 'node-gtts';
import {toAudio} from '../../lib/converter.js';

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
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
    const wav = await synthTTS(text, lang);
    const ogg = await applyEffect(wav, effect);
    try {
        return fs.readFileSync(ogg);
    } finally {
        fs.rmSync(wav, {force: true});
        fs.rmSync(ogg, {force: true});
    }
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
    const outPath = path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}-raw.wav`);
    const tts = gTTS(lang);
    await new Promise<void>((resolve, reject) => {
        tts.save(outPath, text, (error) => (error ? reject(error) : resolve()));
    });
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
