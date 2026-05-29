import {eq} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {apiTokens} from '../../db/schema.js';
import type {ApiTokenRepository} from '../../ports/repositories.js';

export const apiTokenRepository: ApiTokenRepository = {
    async findTokenB64(name) {
        const [row] = await orm
            .select({tokenB64: apiTokens.tokenB64})
            .from(apiTokens)
            .where(eq(apiTokens.name, name))
            .limit(1);
        return row?.tokenB64 ?? null;
    },
};
