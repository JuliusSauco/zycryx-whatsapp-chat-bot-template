import {getCachedDirectoryFiles} from '../../lib/static-resource-cache.js';
import {pickRandom} from '../../utils/random.js';
import path from 'path';

export type ReactionFallbackReason = 'nsfw-required' | 'missing-variant' | null;

export interface ReactionMediaSelection {
    filePath: string | null;
    fallbackReason: ReactionFallbackReason;
    requestedFolder: string;
}

export function getAvailableMp4s(folder: string): string[] {
    return getCachedDirectoryFiles(folder, (fileName) => fileName.toLowerCase().endsWith('.mp4'));
}

export function pickRandomFile(files: string[]): string {
    return pickRandom(files);
}

export function selectReactionMedia(input: {
    publicFolder: string;
    nsfwFolder?: string;
    nsfwEnabled: boolean;
}): ReactionMediaSelection {
    const requestedFolder = input.nsfwEnabled && input.nsfwFolder ? input.nsfwFolder : input.publicFolder;
    const requestedFiles = getAvailableMp4s(requestedFolder);
    if (requestedFiles.length) {
        return {
            filePath: path.join(requestedFolder, pickRandomFile(requestedFiles)),
            fallbackReason: null,
            requestedFolder,
        };
    }

    if (input.nsfwEnabled && input.nsfwFolder && requestedFolder === input.nsfwFolder) {
        const publicFiles = getAvailableMp4s(input.publicFolder);
        if (publicFiles.length) {
            return {
                filePath: path.join(input.publicFolder, pickRandomFile(publicFiles)),
                fallbackReason: 'missing-variant',
                requestedFolder,
            };
        }
    }

    return {
        filePath: null,
        fallbackReason: !input.nsfwEnabled && !!input.nsfwFolder ? 'nsfw-required' : 'missing-variant',
        requestedFolder,
    };
}

export function formatReactionFallbackNotice(input: {
    reason: ReactionFallbackReason;
    requestedFolder: string;
}): string {
    if (input.reason === 'nsfw-required') return '';
    if (input.reason === 'missing-variant') {
        return `⚠️ No hay un MP4 disponible en *${input.requestedFolder}*.`;
    }
    return '';
}
