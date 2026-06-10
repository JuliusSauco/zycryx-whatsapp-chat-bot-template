declare module 'syntax-error';
declare module 'qrcode';
declare module 'qrcode-terminal' {
    interface QRCodeTerminal {
        generate(text: string, options?: {small?: boolean}, callback?: (output: string) => void): void;
    }

    const qrcodeTerminal: QRCodeTerminal;
    export default qrcodeTerminal;
}
declare module 'cfonts';
declare module 'node-gtts' {
    interface TextToSpeech {
        save(path: string, text: string, callback: (error?: Error | null) => void): void;
    }

    export default function gTTS(language: string): TextToSpeech;
}
declare module 'api-dylux';
declare module 'hispamemes';
declare module 'wa-sticker-formatter';
declare module 'acrcloud';
declare module 'human-readable';
declare module 'fuzzysort';
declare module 'readline-sync';
declare module 'fluent-ffmpeg';
declare module 'node-webpmux';
declare module 'qs';
declare module 'similarity' {
    export default function similarity(a: string, b: string): number;
}
declare module 'yt-search' {
    export interface YouTubeSearchVideo {
        type?: string;
        videoId?: string;
        title: string;
        url: string;
        image?: string;
        thumbnail?: string;
        ago?: string;
        views?: number;
        timestamp?: string;
        duration?: {
            seconds?: number;
        };
    }

    export interface YouTubeSearchResult {
        videos: YouTubeSearchVideo[];
        all: YouTubeSearchVideo[];
    }

    interface YouTubeSearch {
        (query: string): Promise<YouTubeSearchResult>;
        search(options: Record<string, unknown>): Promise<YouTubeSearchResult>;
    }

    const yts: YouTubeSearch;
    export default yts;
}
