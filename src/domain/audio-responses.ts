export interface AudioEntry {
    regex: string;
    audio?: string;
    audios?: string[];
}

export type AudioConfig = Record<string, Record<string, AudioEntry>>;

export interface AudioResponseRecord {
    scope: string;
    phrase: string;
    regex: string;
    audioUrls: string[];
    deleted: boolean;
}

export interface UpsertAudioResponseInput {
    scope: string;
    phrase: string;
    regex: string;
    audioUrls: string[];
}

export function getAudioUrls(entry: AudioEntry): string[] {
    return entry.audios?.length ? entry.audios : entry.audio ? [entry.audio] : [];
}

export function normalizeAudioEntry(entry: AudioEntry): AudioEntry {
    const audios = getAudioUrls(entry);
    return {
        regex: entry.regex,
        ...(audios.length === 1 ? {audio: audios[0]} : {}),
        ...(audios.length > 1 ? {audios} : {}),
    };
}
