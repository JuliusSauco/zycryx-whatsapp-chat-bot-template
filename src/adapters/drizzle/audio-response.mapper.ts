import type {audioResponses} from '../../db/schema.js';
import type {AudioResponseRecord} from '../../domain/audio-responses.js';

export type AudioResponseRow = typeof audioResponses.$inferSelect;

export function mapAudioResponseRecord(row: AudioResponseRow, audioUrls: string[] = []): AudioResponseRecord {
    return {
        scope: row.scope,
        phrase: row.phrase,
        regex: row.regex,
        audioUrls,
        deleted: row.deleted ?? false,
    };
}
