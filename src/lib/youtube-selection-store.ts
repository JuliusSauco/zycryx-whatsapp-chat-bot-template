import {createExpiringMap} from './ephemeral-state.js';
import {normalizeJid} from '../utils/jid.js';

export interface YoutubeSelectionScope {
    botId: string;
    chatId: string;
    senderId: string;
}

const selections = createExpiringMap<readonly string[]>({
    ttlMs: 10 * 60_000,
    maxEntries: 2_000,
});

function scopeKey(scope: YoutubeSelectionScope): string {
    return [normalizeJid(scope.botId), scope.chatId, normalizeJid(scope.senderId)].join('\u0000');
}

export function rememberYoutubeSelections(scope: YoutubeSelectionScope, urls: readonly string[]): void {
    selections.set(scopeKey(scope), urls.slice(0, 25));
}

export function resolveYoutubeSelection(scope: YoutubeSelectionScope, oneBasedIndex: number): string {
    if (!Number.isInteger(oneBasedIndex) || oneBasedIndex < 1) return '';
    return selections.get(scopeKey(scope))?.[oneBasedIndex - 1] ?? '';
}
