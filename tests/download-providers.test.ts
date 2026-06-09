import assert from 'node:assert/strict';
import {
    bytesToSize,
    resolveIndexedYoutubeLink,
    secondString,
    selectQuality,
    youtubeRegexID,
} from '../src/providers/downloads/youtube.provider.js';

function testYoutubeRegex(): void {
    assert.equal(youtubeRegexID.test('https://youtu.be/dQw4w9WgXcQ'), true);
    youtubeRegexID.lastIndex = 0;
    assert.equal(youtubeRegexID.test('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
    youtubeRegexID.lastIndex = 0;
    assert.equal(youtubeRegexID.test('https://example.com/watch?v=dQw4w9WgXcQ'), false);
}

function testQualitySelection(): void {
    assert.equal(selectQuality('192', true), '192');
    assert.equal(selectQuality('999', true), '320');
    assert.equal(selectQuality('480', false), '480');
    assert.equal(selectQuality('999', false), '720');
}

function testFormatting(): void {
    assert.equal(bytesToSize(undefined), 'n/a');
    assert.equal(bytesToSize(512), '512 Bytes');
    assert.equal(bytesToSize(2048), '2.0 KB');
    assert.equal(secondString(65), '1 minuto, 5 segundos');
    assert.equal(secondString(3600), '1 hora, ');
}

function testIndexedYoutubeLinks(): void {
    global.videoList = [{from: 'user@s.whatsapp.net', urls: ['https://youtu.be/one', 'https://youtu.be/two']}];

    assert.equal(resolveIndexedYoutubeLink('2', 'user@s.whatsapp.net'), 'https://youtu.be/two');
    assert.equal(resolveIndexedYoutubeLink('3', 'user@s.whatsapp.net'), '');
    assert.equal(resolveIndexedYoutubeLink('https://youtube.com/watch?v=abc', 'user@s.whatsapp.net'), 'https://youtube.com/watch?v=abc');
}

testYoutubeRegex();
testQualitySelection();
testFormatting();
testIndexedYoutubeLinks();

console.log('download-providers.test.ts OK');
