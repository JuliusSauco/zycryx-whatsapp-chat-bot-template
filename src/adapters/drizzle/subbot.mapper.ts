import type {subbots} from '../../db/schema.js';
import type {SubbotConfig} from '../../domain/subbots.js';
import {DEFAULT_SUBBOT_CONFIG} from '../../domain/subbots.js';

export type SubbotRow = typeof subbots.$inferSelect;

export function mapSubbotConfig(row: SubbotRow, prefix: string[] = [], owners: string[] = []): SubbotConfig {
    return {
        id: row.id,
        instanceType: row.instanceType === 'main' ? 'main' : 'subbot',
        name: row.name,
        logo_url: row.logoUrl,
        prefix: prefix.length ? prefix : DEFAULT_SUBBOT_CONFIG.prefix,
        mode: row.mode === 'private' ? 'private' : DEFAULT_SUBBOT_CONFIG.mode,
        owners,
        anti_private: row.antiPrivate ?? DEFAULT_SUBBOT_CONFIG.anti_private,
        anti_call: row.antiCall ?? DEFAULT_SUBBOT_CONFIG.anti_call,
        privacy: row.privacy,
        prestar: row.prestar,
    };
}
