import {webp2png} from '../../lib/webp2mp4.js';

export async function convertWebpToPng(media: Buffer): Promise<Buffer | string | string[]> {
    return await webp2png(media).catch(() => null) || Buffer.alloc(0);
}
