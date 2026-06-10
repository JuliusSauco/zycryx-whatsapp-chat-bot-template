import assert from 'node:assert/strict';
import {
    bytesToSize,
    resolveIndexedYoutubeLink,
    secondString,
    selectQuality,
    youtubeRegexID,
} from '../src/providers/downloads/youtube.provider.js';
import {buildSpotifyDownloadProviders} from '../src/providers/downloads/spotify.provider.js';
import {buildFacebookDownloadProviders, isFacebookUrl} from '../src/providers/downloads/facebook.provider.js';
import {buildDriveDownloadProviders, getFileMimetype} from '../src/providers/downloads/drive.provider.js';
import {buildInstagramDownloadProviders, inferInstagramMediaType} from '../src/providers/downloads/instagram.provider.js';
import {buildMediafireDownloadProviders} from '../src/providers/downloads/mediafire.provider.js';
import {buildTikTokDownloadProviders, isTikTokUrl} from '../src/providers/downloads/tiktok.provider.js';
import {buildThreadsDownloadProviders, inferThreadsMediaType} from '../src/providers/downloads/threads.provider.js';
import {runProviderCandidates} from '../src/providers/provider.types.js';

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

async function testProviderFallback(): Promise<void> {
    const result = await runProviderCandidates([
        {name: 'empty', run: async () => null},
        {name: 'error', run: async () => {
            throw new Error('boom');
        }},
        {name: 'success', run: async () => 'ok'},
    ]);

    assert.equal(result.data, 'ok');
    assert.deepEqual(result.failures, [
        {provider: 'empty', reason: 'empty'},
        {provider: 'error', reason: 'error', error: 'boom'},
    ]);
}

async function testProviderFallbackEmpty(): Promise<void> {
    const result = await runProviderCandidates([
        {name: 'empty', run: async () => undefined},
    ]);

    assert.equal(result.data, null);
    assert.deepEqual(result.failures, [{provider: 'empty', reason: 'empty'}]);
}

function testSpotifyProviders(): void {
    const providers = buildSpotifyDownloadProviders('https://open.spotify.com/track/example');

    assert.deepEqual(providers.map(provider => provider.name), ['siputz-spotify', 'main-spotify']);
}

function testTikTokUrlValidation(): void {
    assert.equal(isTikTokUrl('https://www.tiktok.com/@user/video/123'), true);
    assert.equal(isTikTokUrl('https://vm.tiktok.com/ZMexample'), true);
    assert.equal(isTikTokUrl('https://example.com/video/123'), false);
}

function testTikTokProviders(): void {
    const providers = buildTikTokDownloadProviders('https://www.tiktok.com/@user/video/123');

    assert.deepEqual(providers.map(provider => provider.name), [
        'tikdown',
        'delirius-tiktok',
        'dorratz-tiktok',
        'api-dylux-tiktok',
    ]);
}

function testInstagramMediaType(): void {
    assert.equal(inferInstagramMediaType('https://cdn.example.com/image.jpg'), 'image');
    assert.equal(inferInstagramMediaType('https://cdn.example.com/image.webp'), 'image');
    assert.equal(inferInstagramMediaType('https://cdn.example.com/video.mp4'), 'video');
    assert.equal(inferInstagramMediaType('https://cdn.example.com/file', 'image'), 'image');
}

function testInstagramProviders(): void {
    const providers = buildInstagramDownloadProviders('https://www.instagram.com/reel/example/');

    assert.deepEqual(providers.map(provider => provider.name), [
        'siputz-instagram',
        'fgmods-instagram',
        'main-instagram',
        'bochil-instagram',
    ]);
}

function testFacebookUrlValidation(): void {
    assert.equal(isFacebookUrl('https://www.facebook.com/share/r/example'), true);
    assert.equal(isFacebookUrl('https://fb.watch/example'), true);
    assert.equal(isFacebookUrl('https://example.com/share/r/example'), false);
}

function testFacebookProviders(): void {
    const providers = buildFacebookDownloadProviders('https://www.facebook.com/share/r/example');

    assert.deepEqual(providers.map(provider => provider.name), [
        'agatz-facebook',
        'fgmods-facebook',
        'main-facebook',
        'dorratz-facebook',
        'api-dylux-facebook',
    ]);
}

function testMediafireProviders(): void {
    const providers = buildMediafireDownloadProviders('https://www.mediafire.com/file/example/file.zip/file');

    assert.deepEqual(providers.map(provider => provider.name), [
        'delirius-mediafire',
        'neoxr-mediafire',
        'agatz-mediafire',
        'siputz-mediafire',
    ]);
}

function testDriveProviders(): void {
    const providers = buildDriveDownloadProviders('https://drive.google.com/file/d/example/view');

    assert.deepEqual(providers.map(provider => provider.name), [
        'siputz-gdrive',
        'david-cyril-gdrive',
    ]);
}

function testFileMimetype(): void {
    assert.equal(getFileMimetype('report.pdf'), 'application/pdf');
    assert.equal(getFileMimetype('song.mp3'), 'audio/mpeg');
    assert.equal(getFileMimetype('archive.unknown'), 'application/octet-stream');
}

function testThreadsMediaType(): void {
    assert.equal(inferThreadsMediaType('https://cdn.example.com/photo.jpg'), 'image');
    assert.equal(inferThreadsMediaType('https://cdn.example.com/photo.webp'), 'image');
    assert.equal(inferThreadsMediaType('https://cdn.example.com/video.mp4'), 'video');
    assert.equal(inferThreadsMediaType('https://cdn.example.com/file', 'video'), 'video');
}

function testThreadsProviders(): void {
    const providers = buildThreadsDownloadProviders('https://www.threads.net/@user/post/example');

    assert.deepEqual(providers.map(provider => provider.name), [
        'agatz-threads',
        'main-threads',
    ]);
}

testYoutubeRegex();
testQualitySelection();
testFormatting();
testIndexedYoutubeLinks();
await testProviderFallback();
await testProviderFallbackEmpty();
testSpotifyProviders();
testTikTokUrlValidation();
testTikTokProviders();
testInstagramMediaType();
testInstagramProviders();
testFacebookUrlValidation();
testFacebookProviders();
testMediafireProviders();
testDriveProviders();
testFileMimetype();
testThreadsMediaType();
testThreadsProviders();

console.log('download-providers.test.ts OK');
