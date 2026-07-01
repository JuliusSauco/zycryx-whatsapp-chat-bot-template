import fs from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import fuzzysort from 'fuzzysort';
import {defineSdkPlugin} from '../../core/sdk-plugin.js';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const stripExtension = (pluginPath: string): string => pluginPath.replace(/\.(js|ts)$/i, '');

export default defineSdkPlugin({
    help: ['getplugin'].map(v => v + ' <texto>'),
    tags: ['owner'],
    command: /^(getplugin|gp)$/i,
    rowner: true,
    async execute(_m, {usedPrefix, command, text, sdk}) {
        const pluginPaths = Object.keys(plugins);
        const searchablePaths = pluginPaths.map(stripExtension);

        if (!text) return sdk.reply.message('owner.getPlugin.missingQuery', {command: usedPrefix + command})

        const results = fuzzysort.go(text, searchablePaths);

        if (results.length === 0) {
            return sdk.reply.message('owner.getPlugin.notFoundSuggestions', {
                query: text,
                suggestions: searchablePaths.map(v => ' ' + v).join('\n')
            });
        }

        const match = results[0].target;
        const pluginPath = pluginPaths.find(path => stripExtension(path) === match);
        if (!pluginPath) return sdk.reply.message('owner.getPlugin.notFound', {query: text});

        await sdk.reply.text(fs.readFileSync(join(pluginRoot, ...pluginPath.split('/')), 'utf-8'));
    }
});
