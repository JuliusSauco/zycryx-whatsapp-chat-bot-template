import fs from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import fuzzysort from 'fuzzysort';
import {definePlugin} from '../../core/define-plugin.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const stripExtension = (pluginPath: string): string => pluginPath.replace(/\.(js|ts)$/i, '');

export default definePlugin({
    help: ['getplugin'].map(v => v + ' <texto>'),
    tags: ['owner'],
    command: /^(getplugin|gp)$/i,
    rowner: true,
    async execute(m, {usedPrefix, command, text}) {
        const pluginPaths = Object.keys(plugins);
        const searchablePaths = pluginPaths.map(stripExtension);

        if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('owner.getPlugin.missingQuery'), {command: usedPrefix + command}))

        const results = fuzzysort.go(text, searchablePaths);

        if (results.length === 0) {
            return m.reply(renderTemplate(getRequiredPluginMessage('owner.getPlugin.notFoundSuggestions'), {
                query: text,
                suggestions: searchablePaths.map(v => ' ' + v).join('\n')
            }));
        }

        const match = results[0].target;
        const pluginPath = pluginPaths.find(path => stripExtension(path) === match);
        if (!pluginPath) return m.reply(renderTemplate(getRequiredPluginMessage('owner.getPlugin.notFound'), {query: text}));

        m.reply(fs.readFileSync(join(pluginRoot, ...pluginPath.split('/')), 'utf-8'));
    }
});
