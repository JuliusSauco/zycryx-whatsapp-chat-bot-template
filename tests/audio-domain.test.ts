import assert from 'node:assert/strict';
import {mapAudioResponseRecord, type AudioResponseRow} from '../src/adapters/drizzle/audio-response.mapper.js';
import {getAudioUrls, normalizeAudioEntry} from '../src/domain/audio-responses.js';

{
    assert.deepEqual(getAudioUrls({regex: '^hola$', audio: 'one.mp3'}), ['one.mp3']);
    assert.deepEqual(getAudioUrls({regex: '^hola$', audios: ['one.mp3', 'two.mp3']}), ['one.mp3', 'two.mp3']);
    assert.deepEqual(getAudioUrls({regex: '^hola$'}), []);
}

{
    assert.deepEqual(normalizeAudioEntry({regex: '^a$', audios: ['a.mp3']}), {
        regex: '^a$',
        audio: 'a.mp3',
    });
    assert.deepEqual(normalizeAudioEntry({regex: '^a$', audio: 'a.mp3', audios: ['a.mp3', 'b.mp3']}), {
        regex: '^a$',
        audios: ['a.mp3', 'b.mp3'],
    });
}

{
    const row: AudioResponseRow = {
        scope: 'global',
        phrase: 'hola',
        regex: '^hola$',
        audioUrls: ['hola.mp3'],
        deleted: null,
        createdAt: null,
        updatedAt: null,
    };

    assert.deepEqual(mapAudioResponseRecord(row), {
        scope: 'global',
        phrase: 'hola',
        regex: '^hola$',
        audioUrls: ['hola.mp3'],
        deleted: false,
    });
}

console.log('audio-domain.test.ts OK');
