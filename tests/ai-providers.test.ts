import assert from 'node:assert/strict';
import {
    buildBlackboxTextProviders,
    buildCopilotTextProviders,
    buildDeepSeekTextProviders,
    buildGeminiTextProviders,
    buildMemoryChatProviders,
    buildOpenAiTextProviders,
    decodeApiText,
} from '../src/providers/ai/text.provider.js';
import {buildAiImageProviders} from '../src/providers/ai/image.provider.js';

function testTextProviderOrder(): void {
    assert.deepEqual(buildMemoryChatProviders('hola', [{role: 'user', content: 'hola'}], {fallbackText: 'x'}).map(provider => provider.name), [
        'configured-chat-completion',
        'main-gpt-prompt',
    ]);
    assert.deepEqual(buildOpenAiTextProviders('hola').map(provider => provider.name), [
        'dorratz-gpt',
        'main-gptweb',
        'main-ia2',
        'main-chatgpt',
    ]);
    assert.deepEqual(buildDeepSeekTextProviders('hola').map(provider => provider.name), ['dorratz-deepseek']);
    assert.deepEqual(buildGeminiTextProviders('hola').map(provider => provider.name), ['dorratz-gemini', 'delirius-gemini']);
    assert.deepEqual(buildBlackboxTextProviders('hola').map(provider => provider.name), ['blackbox-ai']);
    assert.deepEqual(buildCopilotTextProviders('hola').map(provider => provider.name), ['dorratz-bing', 'main-bingia']);
}

function testImageProviderOrder(): void {
    assert.deepEqual(buildAiImageProviders('gatitos').map(provider => provider.name), [
        'dorratz-ai-image',
        'flux-lusion',
        'unsplash-search',
        'betabotz-bing-image',
        'vihanga-imagine',
        'lolhuman-dalle',
    ]);
}

function testDecodeApiText(): void {
    assert.equal(decodeApiText('Hola'), 'Hola');
    assert.equal(decodeApiText('Hola\\nMundo'), 'Hola\nMundo');
    assert.equal(decodeApiText(undefined), null);
}

testTextProviderOrder();
testImageProviderOrder();
testDecodeApiText();

console.log('ai-providers.test.ts OK');
