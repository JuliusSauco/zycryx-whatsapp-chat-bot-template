import fs from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import fuzzysort from 'fuzzysort';
import {definePlugin} from '../../core/define-plugin.js';

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

        if (!text) return m.reply(`*¿Qué buscar?*\nEjemplo:\n${usedPrefix + command} sticker`)

        const results = fuzzysort.go(text, searchablePaths);

        if (results.length === 0) {
            return m.reply(`'${text}' no encontrado.\n\nSugerencias:\n${searchablePaths.map(v => ' ' + v).join('\n')}`);
        }

        const match = results[0].target;
        const pluginPath = pluginPaths.find(path => stripExtension(path) === match);
        if (!pluginPath) return m.reply(`'${text}' no encontrado.`);

        m.reply(fs.readFileSync(join(pluginRoot, ...pluginPath.split('/')), 'utf-8'));
    }
});
