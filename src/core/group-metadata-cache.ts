import type {GroupMetadata} from '@whiskeysockets/baileys';
import {BoundedTtlCache} from '../lib/bounded-ttl-cache.js';
import {GROUP_META_CACHE_TTL} from '../utils/constants.js';

export const groupMetadataCache = new BoundedTtlCache<string, GroupMetadata>({
    ttlMs: GROUP_META_CACHE_TTL,
    maxEntries: 5_000,
});
