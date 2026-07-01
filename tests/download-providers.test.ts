import assert from 'node:assert/strict';
import {
    bytesToSize,
    buildAudioApis,
    buildVideoApis,
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
import {buildAppleMusicDownloadProviders} from '../src/providers/downloads/applemusic.provider.js';
import {buildModApkDownloadProviders} from '../src/providers/downloads/modapk.provider.js';
import {buildPinterestSearchProviders} from '../src/providers/downloads/pinterest.provider.js';
import {buildInstagramStalkProviders} from '../src/providers/downloads/instagram-stalk.provider.js';
import {buildTikTokStalkProviders} from '../src/providers/downloads/tiktok-stalk.provider.js';
import {
    classifyProviderFailure,
    runProviderCandidates,
    sanitizeProviderError,
    summarizeProviderFailures,
} from '../src/providers/provider.types.js';
import {HttpError} from '../src/lib/http-client.js';
import {getRequiredPluginMessage} from '../src/lib/message-template.js';

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

function testYoutubeDownloadApiPolicy(): void {
    const audioApis = buildAudioApis('https://youtu.be/dQw4w9WgXcQ', 'title', 'mp3', '128');
    const videoApis = buildVideoApis('https://youtu.be/dQw4w9WgXcQ', 'title', '720');

    assert.equal(audioApis.every(provider => provider.timeoutMs === 20_000), true);
    assert.equal(audioApis.every(provider => provider.retries === 1), true);
    assert.equal(videoApis.every(provider => provider.timeoutMs === 20_000), true);
    assert.equal(videoApis.every(provider => provider.retries === 1), true);
}

async function testProviderFallback(): Promise<void> {
    const result = await runProviderCandidates([
        {name: 'empty', run: async () => null},
        {name: 'error', run: async () => {
            throw new Error('rate limit exceeded');
        }},
        {name: 'success', run: async () => 'ok'},
    ]);

    assert.equal(result.data, 'ok');
    assert.deepEqual(result.failures, [
        {provider: 'empty', reason: 'invalid_response', attempts: 1},
        {provider: 'error', reason: 'rate_limit', error: 'rate limit exceeded', attempts: 1},
    ]);
}

async function testProviderFallbackEmpty(): Promise<void> {
    const result = await runProviderCandidates([
        {name: 'empty', run: async () => undefined},
    ]);

    assert.equal(result.data, null);
    assert.deepEqual(result.failures, [{provider: 'empty', reason: 'invalid_response', attempts: 1}]);
}

async function testProviderRetrySuccess(): Promise<void> {
    let attempts = 0;
    const result = await runProviderCandidates([
        {
            name: 'retry-provider',
            retries: 1,
            retryDelayMs: 1,
            run: async () => {
                attempts++;
                if (attempts === 1) throw new Error('temporary network failure');
                return 'ok';
            },
        },
    ]);

    assert.equal(result.data, 'ok');
    assert.equal(attempts, 2);
    assert.deepEqual(result.failures, []);
}

async function testProviderTimeout(): Promise<void> {
    const result = await runProviderCandidates([
        {
            name: 'slow-provider',
            timeoutMs: 5,
            run: async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return 'late';
            },
        },
    ]);

    assert.equal(result.data, null);
    assert.equal(result.failures[0]?.provider, 'slow-provider');
    assert.equal(result.failures[0]?.reason, 'timeout');
    assert.equal(result.failures[0]?.attempts, 1);
}

function testProviderFailureClassification(): void {
    assert.equal(classifyProviderFailure(new Error('[HTTP] Timeout 15000ms')), 'timeout');
    assert.equal(classifyProviderFailure(new HttpError('not found', 404, 'Not Found', 'https://example.com', '')), 'not_found');
    assert.equal(classifyProviderFailure(new HttpError('too many requests', 429, 'Too Many Requests', 'https://example.com', '')), 'rate_limit');
    assert.equal(classifyProviderFailure(new Error('invalid url')), 'unsupported');
    assert.equal(classifyProviderFailure(new Error('Unexpected token < in JSON')), 'invalid_response');
}

function testProviderErrorSanitization(): void {
    const sanitized = sanitizeProviderError(
        new Error('GET https://api.example.com/path?api_key=secret&token=abc failed Bearer xyz.payload.signature'),
    );

    assert.equal(sanitized.includes('secret'), false);
    assert.equal(sanitized.includes('abc'), false);
    assert.equal(sanitized.includes('xyz.payload.signature'), false);
    assert.match(sanitized, /https:\/\/api\.example\.com\/path\?\[query\]/);
}

function testProviderFailureSummary(): void {
    const reason = summarizeProviderFailures([
        {provider: 'a', reason: 'invalid_response'},
        {provider: 'b', reason: 'network'},
        {provider: 'c', reason: 'timeout'},
    ]);

    assert.equal(reason, 'timeout');
}

function testSpotifyProviders(): void {
    const providers = buildSpotifyDownloadProviders('https://open.spotify.com/track/example');

    assert.deepEqual(providers.map(provider => provider.name), ['siputz-spotify', 'main-spotify']);
    assert.equal(providers.every(provider => provider.timeoutMs === 12_000), true);
    assert.equal(providers.every(provider => provider.retries === 1), true);
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
    assert.equal(providers[0]?.timeoutMs, 20_000);
    assert.equal(providers.slice(1).every(provider => provider.timeoutMs === 12_000), true);
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
    assert.equal(providers.every(provider => provider.timeoutMs === 20_000), true);
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

function testAppleMusicProviders(): void {
    const providers = buildAppleMusicDownloadProviders('https://music.apple.com/us/album/example/123');

    assert.deepEqual(providers.map(provider => provider.name), [
        'main-applemusic',
        'aaplmusicdownloader',
    ]);
}

function testModApkProviders(): void {
    const providers = buildModApkDownloadProviders('whatsapp');

    assert.deepEqual(providers.map(provider => provider.name), [
        'dorratz-apk',
        'main-apk',
    ]);
}

function testPinterestProviders(): void {
    const providers = buildPinterestSearchProviders('wallpaper');

    assert.deepEqual(providers.map(provider => provider.name), [
        'scraper-pinterest',
        'siputz-pinterest',
        'dorratz-pinterest',
        'main-pinterest',
    ]);
    assert.equal(providers[0]?.timeoutMs, 20_000);
    assert.equal(providers.slice(1).every(provider => provider.timeoutMs === 12_000), true);
}

function testInstagramStalkProviders(): void {
    const providers = buildInstagramStalkProviders('openai');

    assert.deepEqual(providers.map(provider => provider.name), [
        'main-instagram-stalk',
        'api-dylux-instagram-stalk',
    ]);
}

function testTikTokStalkProviders(): void {
    const providers = buildTikTokStalkProviders('openai');

    assert.deepEqual(providers.map(provider => provider.name), [
        'main-tiktok-stalk',
        'api-dylux-tiktok-stalk',
    ]);
}

function testDownloadFailureMessages(): void {
    const scopes = ['play', 'play2', 'facebook', 'instagram', 'tiktok', 'spotify', 'mediafire', 'drive', 'threads', 'appleMusic', 'modApk', 'pinterest'];
    const reasons = ['timeout', 'rate_limit', 'not_found', 'invalid_response', 'network', 'unsupported'];

    for (const scope of scopes) {
        assert.ok(getRequiredPluginMessage(`downloads.${scope}.downloadFailed`).includes('{reason}'));
        for (const reason of reasons) {
            assert.ok(getRequiredPluginMessage(`downloads.${scope}.failureReason.${reason}`).length > 0);
        }
    }
}

testYoutubeRegex();
testQualitySelection();
testFormatting();
testIndexedYoutubeLinks();
testYoutubeDownloadApiPolicy();
await testProviderFallback();
await testProviderFallbackEmpty();
await testProviderRetrySuccess();
await testProviderTimeout();
testProviderFailureClassification();
testProviderErrorSanitization();
testProviderFailureSummary();
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
testAppleMusicProviders();
testModApkProviders();
testPinterestProviders();
testInstagramStalkProviders();
testTikTokStalkProviders();
testDownloadFailureMessages();

console.log('download-providers.test.ts OK');
