import fs from 'fs';
import fuzzysort from 'fuzzysort';
import {definePlugin} from '../core/define-plugin.js';

export default definePlugin({
    help: ['getplugin'].map(v => v + ' <texto>'),
    tags: ['owner'],
    command: /^(getplugin|gp)$/i,
    rowner: true,
    async execute(m, {usedPrefix, command, text}) {
        let ar = Object.keys(plugins);
        let ar1 = ar.map(v => v.replace('.js', ''));

        if (!text) return m.reply(`*¿Qué buscar?*\nEjemplo:\n${usedPrefix + command} sticker`)

        let results = fuzzysort.go(text, ar1);

        if (results.length === 0) {
            return m.reply(`'${text}' no encontrado.\n\nSugerencias:\n${ar1.map(v => ' ' + v).join('\n')}`);
        }

        let match = results[0].target;
        m.reply(fs.readFileSync('./plugins/' + match + '.js', 'utf-8'));
    }
});
