import {logInfo} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/sdk-plugin.js'
import {googleImage} from '@bochilteam/scraper';
import {pickRandom} from '../../utils/random.js';

export default defineSdkPlugin({
    help: ['gimage <query>', 'imagen <query>'],
    tags: ['buscadores'],
    command: /^(gimage|image|imagen)$/i,
    register: true,
    limit: 4,
    alternativeCoins: 40,
    async execute(m, {sdk}) {
    if (!sdk.text) return sdk.reply.message('downloads.image.missingQuery', {
        command: sdk.usedPrefix + sdk.command
    })
    const forbiddenWords = ['caca', 'polla', 'porno', 'porn', 'gore', 'cum', 'semen', 'puta', 'puto', 'culo', 'putita', 'putito', 'pussy', 'hentai', 'pene', 'coño', 'asesinato', 'zoofilia', 'mia khalifa', 'desnudo', 'desnuda', 'cuca', 'chocha', 'muertos', 'pornhub', 'xnxx', 'xvideos', 'teta', 'vagina', 'marsha may', 'misha cross', 'sexmex', 'furry', 'furro', 'furra', 'xxx', 'rule34', 'panocha', 'pedofilia', 'necrofilia', 'pinga', 'horny', 'ass', 'nude', 'popo', 'nsfw', 'femdom', 'futanari', 'erofeet', 'sexo', 'sex', 'yuri', 'ero', 'ecchi', 'blowjob', 'anal', 'ahegao', 'pija', 'verga', 'trasero', 'violation', 'violacion', 'bdsm', 'cachonda', '+18', 'cp', 'mia marin', 'lana rhoades', 'cepesito', 'hot', 'buceta', 'xxx', 'Violet Myllers', 'Violet Myllers pussy', 'Violet Myllers desnuda', 'Violet Myllers sin ropa', 'Violet Myllers culo', 'Violet Myllers vagina', 'Pornografía', 'Pornografía infantil', 'niña desnuda', 'niñas desnudas', 'niña pussy', 'niña pack', 'niña culo', 'niña sin ropa', 'niña siendo abusada', 'niña siendo abusada sexualmente', 'niña cogiendo', 'niña fototeta', 'niña vagina', 'hero Boku no pico', 'Mia Khalifa cogiendo', 'Mia Khalifa sin ropa', 'Mia Khalifa comiendo polla', 'Mia Khalifa desnuda']
    if (forbiddenWords.some(word => m.text.toLowerCase().includes(word))) return sdk.reply.message('downloads.image.forbidden')
    try {
        const res = await googleImage(sdk.text);
        const image = pickRandom(res);
        const link = image;
        await sdk.sendFile(link, 'error.jpg', sdk.content.renderMessage('downloads.image.caption', {query: sdk.text}));
    } catch (e: unknown) {
        logInfo(e);
    }
    }
})

;
