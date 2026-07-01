import assert from 'node:assert/strict';
import {isVoiceEffect, listVoiceEffects} from '../src/providers/media-conversion/audio.provider.js';
import {getSlapGifUrl, parseTelegramPackName} from '../src/providers/media-conversion/sticker.provider.js';
import {listUploadServiceNames, normalizeUploadLink} from '../src/providers/media-conversion/upload.provider.js';

function testVoiceEffects(): void {
    assert.deepEqual(listVoiceEffects(), ['anonymous', 'robot', 'grave', 'aguda', 'niño', 'demonio']);
    assert.equal(isVoiceEffect('robot'), true);
    assert.equal(isVoiceEffect('es'), false);
}

function testUploadHelpers(): void {
    assert.deepEqual(listUploadServiceNames(), [
        'quax',
        'restfulapi',
        'catbox',
        'uguu',
        'filechan',
        'pixeldrain',
        'gofile',
        'krakenfiles',
        'telegraph',
        'sky',
    ]);
    assert.equal(normalizeUploadLink('https://example.com/file'), 'https://example.com/file');
    assert.equal(normalizeUploadLink(['https://a.example', 'https://b.example']), 'https://a.example\nhttps://b.example');
}

function testStickerHelpers(): void {
    assert.equal(parseTelegramPackName('https://t.me/addstickers/Porcientoreal'), 'Porcientoreal');
    assert.equal(getSlapGifUrl().startsWith('https://'), true);
}

testVoiceEffects();
testUploadHelpers();
testStickerHelpers();

console.log('media-conversion-providers.test.ts OK');
