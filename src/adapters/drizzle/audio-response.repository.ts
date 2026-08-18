import {asc, eq, inArray} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {audioResponseAssets, audioResponses} from '../../db/schema.js';
import type {AudioResponseRepository} from '../../ports/repositories.js';
import {mapAudioResponseRecord} from './audio-response.mapper.js';

type AudioResponseRow = typeof audioResponses.$inferSelect;

async function hydrateAudioResponses(rows: AudioResponseRow[]) {
    if (!rows.length) return [];
    const assets = await orm.select().from(audioResponseAssets)
        .where(inArray(audioResponseAssets.responseId, rows.map(row => row.id)))
        .orderBy(asc(audioResponseAssets.responseId), asc(audioResponseAssets.position));
    return rows.map(row => mapAudioResponseRecord(
        row,
        assets.filter(asset => asset.responseId === row.id).map(asset => asset.mediaUrl),
    ));
}

export const audioResponseRepository: AudioResponseRepository = {
    async listByScopes(scopes) {
        if (!scopes.length) return [];
        const rows = await orm.select().from(audioResponses).where(inArray(audioResponses.scope, scopes));
        return hydrateAudioResponses(rows);
    },

    async listAll() {
        const rows = await orm.select().from(audioResponses);
        return hydrateAudioResponses(rows);
    },

    async upsert(input) {
        await orm.transaction(async tx => {
            const [response] = await tx.insert(audioResponses).values({
                scope: input.scope,
                phrase: input.phrase,
                regex: input.regex,
                deleted: false,
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: [audioResponses.scope, audioResponses.phrase],
                set: {regex: input.regex, deleted: false, updatedAt: new Date()},
            }).returning({id: audioResponses.id});
            await tx.delete(audioResponseAssets).where(eq(audioResponseAssets.responseId, response.id));
            if (input.audioUrls.length) await tx.insert(audioResponseAssets).values(
                [...new Set(input.audioUrls)].map((mediaUrl, position) => ({responseId: response.id, mediaUrl, position})),
            );
        });
    },

    async markDeleted(scope, phrase, regex = '') {
        await orm.transaction(async tx => {
            const [response] = await tx.insert(audioResponses).values({
                scope, phrase, regex, deleted: true, updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: [audioResponses.scope, audioResponses.phrase],
                set: {deleted: true, updatedAt: new Date()},
            }).returning({id: audioResponses.id});
            await tx.delete(audioResponseAssets).where(eq(audioResponseAssets.responseId, response.id));
        });
    },
};
