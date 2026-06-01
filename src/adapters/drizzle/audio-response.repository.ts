import {and, eq, inArray} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {audioResponses} from '../../db/schema.js';
import type {AudioResponseRepository} from '../../ports/repositories.js';

export const audioResponseRepository: AudioResponseRepository = {
    async listByScopes(scopes) {
        if (!scopes.length) return [];
        return orm.select().from(audioResponses).where(inArray(audioResponses.scope, scopes));
    },

    async listAll() {
        return orm.select().from(audioResponses);
    },

    async upsert(input) {
        await orm.insert(audioResponses).values({
            scope: input.scope,
            phrase: input.phrase,
            regex: input.regex,
            audioUrls: input.audioUrls,
            deleted: false,
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: [audioResponses.scope, audioResponses.phrase],
            set: {
                regex: input.regex,
                audioUrls: input.audioUrls,
                deleted: false,
                updatedAt: new Date(),
            },
        });
    },

    async markDeleted(scope, phrase, regex = '') {
        await orm.insert(audioResponses).values({
            scope,
            phrase,
            regex,
            audioUrls: [],
            deleted: true,
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: [audioResponses.scope, audioResponses.phrase],
            set: {
                deleted: true,
                audioUrls: [],
                updatedAt: new Date(),
            },
        });
    },
};
