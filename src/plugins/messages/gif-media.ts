import {getCachedDirectoryFiles} from '../../lib/static-resource-cache.js';

export function getAvailableMp4s(folder: string): string[] {
    return getCachedDirectoryFiles(folder, (fileName) => fileName.toLowerCase().endsWith('.mp4'));
}

export function pickRandomFile(files: string[]): string {
    return files[Math.floor(Math.random() * files.length)];
}
