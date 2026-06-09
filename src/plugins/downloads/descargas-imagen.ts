import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {googleImage} from '@bochilteam/scraper';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {pickRandom} from '../../utils/random.js';

export default definePlugin({
    help: ['gimage <query>', 'imagen <query>'],
    tags: ['buscadores'],
    command: /^(gimage|image|imagen)$/i,
    register: true,
    limit: 1,
    async execute(m, {conn, text, usedPrefix, command}) {
    if (!text) return m.reply(renderTemplate(getRequiredPluginMessage('downloads.image.missingQuery'), {
        command: usedPrefix + command
    }))
    const forbiddenWords = ['caca', 'polla', 'porno', 'porn', 'gore', 'cum', 'semen', 'puta', 'puto', 'culo', 'putita', 'putito', 'pussy', 'hentai', 'pene', 'coño', 'asesinato', 'zoofilia', 'mia khalifa', 'desnudo', 'desnuda', 'cuca', 'chocha', 'muertos', 'pornhub', 'xnxx', 'xvideos', 'teta', 'vagina', 'marsha may', 'misha cross', 'sexmex', 'furry', 'furro', 'furra', 'xxx', 'rule34', 'panocha', 'pedofilia', 'necrofilia', 'pinga', 'horny', 'ass', 'nude', 'popo', 'nsfw', 'femdom', 'futanari', 'erofeet', 'sexo', 'sex', 'yuri', 'ero', 'ecchi', 'blowjob', 'anal', 'ahegao', 'pija', 'verga', 'trasero', 'violation', 'violacion', 'bdsm', 'cachonda', '+18', 'cp', 'mia marin', 'lana rhoades', 'cepesito', 'hot', 'buceta', 'xxx', 'Violet Myllers', 'Violet Myllers pussy', 'Violet Myllers desnuda', 'Violet Myllers sin ropa', 'Violet Myllers culo', 'Violet Myllers vagina', 'Pornografía', 'Pornografía infantil', 'niña desnuda', 'niñas desnudas', 'niña pussy', 'niña pack', 'niña culo', 'niña sin ropa', 'niña siendo abusada', 'niña siendo abusada sexualmente', 'niña cogiendo', 'niña fototeta', 'niña vagina', 'hero Boku no pico', 'Mia Khalifa cogiendo', 'Mia Khalifa sin ropa', 'Mia Khalifa comiendo polla', 'Mia Khalifa desnuda']
    if (forbiddenWords.some(word => m.text.toLowerCase().includes(word))) return m.reply(getRequiredPluginMessage('downloads.image.forbidden'))
    try {
        const res = await googleImage(text);
        const image = pickRandom(res);
        const link = image;
        conn.sendFile(m.chat, link, 'error.jpg', renderTemplate(getRequiredPluginMessage('downloads.image.caption'), {query: text}), m);
    } catch (e: unknown) {
        logInfo(e);
    }
    }
})

;
