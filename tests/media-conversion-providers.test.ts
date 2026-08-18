import assert from 'node:assert/strict';
import {isVoiceEffect, listVoiceEffects, splitTtsText} from '../src/providers/media-conversion/audio.provider.js';
import {getSlapGifUrl, parseTelegramPackName} from '../src/providers/media-conversion/sticker.provider.js';
import {listUploadServiceNames, normalizeUploadLink} from '../src/providers/media-conversion/upload.provider.js';
import {sticker5} from '../src/lib/sticker.js';

function testVoiceEffects(): void {
    assert.deepEqual(listVoiceEffects(), ['anonymous', 'robot', 'grave', 'aguda', 'niño', 'demonio']);
    assert.equal(isVoiceEffect('robot'), true);
    assert.equal(isVoiceEffect('es'), false);
    assert.deepEqual(splitTtsText('  hola   mundo  '), ['hola mundo']);
    assert.equal(splitTtsText('uno dos tres cuatro', 10).join(' '), 'uno dos tres cuatro');
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

async function testStickerNativeRuntime(): Promise<void> {
    const sharp = (await import('sharp')).default;
    const image = await sharp({
        create: {
            width: 2,
            height: 2,
            channels: 4,
            background: {r: 37, g: 211, b: 102, alpha: 1},
        },
    }).png().toBuffer();
    const sticker = await sticker5(image, undefined, 'runtime-test', 'runtime-test');

    assert.equal(sharp.versions.sharp, '0.35.0');
    assert.equal(sticker.subarray(8, 12).toString('ascii'), 'WEBP');
}

testVoiceEffects();
testUploadHelpers();
testStickerHelpers();
await testStickerNativeRuntime();

console.log('media-conversion-providers.test.ts OK');
