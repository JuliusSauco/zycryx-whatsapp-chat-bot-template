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

async function testStickerNativeRuntime(): Promise<void> {
    const {Sticker} = await import('wa-sticker-formatter');
    const sharp = (await import('sharp')).default;
    const image = await sharp({
        create: {
            width: 2,
            height: 2,
            channels: 4,
            background: {r: 37, g: 211, b: 102, alpha: 1},
        },
    }).png().toBuffer();
    const sticker = await new Sticker(image, {pack: 'runtime-test', author: 'runtime-test'}).toBuffer();

    assert.equal(sharp.versions.sharp, '0.35.0');
    assert.equal(sticker.subarray(8, 12).toString('ascii'), 'WEBP');
}

testVoiceEffects();
testUploadHelpers();
testStickerHelpers();
await testStickerNativeRuntime();

console.log('media-conversion-providers.test.ts OK');
