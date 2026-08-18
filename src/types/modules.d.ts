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
declare module 'hispamemes';
declare module 'human-readable';
declare module 'fuzzysort';
declare module 'readline-sync';
declare module 'fluent-ffmpeg';
declare module 'node-webpmux';
declare module 'qs';
declare module 'similarity' {
    export default function similarity(a: string, b: string): number;
}
