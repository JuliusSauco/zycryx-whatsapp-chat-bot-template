import {logInfo} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js';
import {
    isDoxxeoCommand,
    isPercentageCommand,
    isTopCommand,
    replyActionTarget,
    replyDoxxeo,
    replyFreeTop,
    replyGayCanvas,
    replyLoveMeter,
    replyPercentageGame,
    replyPersonality,
    replyRandomPair,
    replyShip,
    replyTopCommand,
} from './fun-juegos.helpers.js';

export default definePlugin({
    help: ["love", "gay2", "lesbiana", "pajero", "pajera", "puto", "puta", "manco", "manca", "rata", "prostituta", "prostituto", "amigorandom", "amistad", "formarpareja", "gay", "personalidad", "ship", "topgays", "top", "topputos", "toplindos", "toppajer@s", "topshipost", "toppanafresco", "topgrasa", "topintegrantes", "topfamos@s", "topsostero", "top5parejas", "Doxxeo", "doxxeo", "follar"],
    tags: ['game'],
    command: /^(love|gay2|lesbiana|pajero|pajera|puto|puta|manco|manca|rata|prostituta|prostituto|amigorandom|amistad|formarpareja|formarparejas|gay|personalidad|ship|shippear|topgays|top|topput@s|topputos|toplindos|toplind@s|toppajer@s|toppajeros|topshipost|topshiposters|toppanafresco|topgrasa|toppanafrescos|toplagrasa|topintegrante|topintegrantes|topotakus|topfamosos|topfamos@s|topsostero|topparejas|top5parejas|Doxxeo|doxxeo|doxxear|Doxxear|doxeo|doxear|doxxeame|doxeame|violar|follar)$/i,
    register: true,
    async execute(m, {conn, metadata, command, text, usedPrefix}) {
        try {
            if (command === 'amistad' || command === 'amigorandom') {
                await replyRandomPair(m, metadata.participants, 'friendship');
            }

            if (command === 'follar' || command === 'violar') {
                await replyActionTarget(conn, m, command, text);
            }

            if (command === 'formarpareja' || command === 'formarparejas') {
                await replyRandomPair(m, metadata.participants, 'couple');
            }

            if (command === 'personalidad') {
                await replyPersonality(conn, m, text);
            }

            if (command === 'ship' || command === 'shippear') {
                await replyShip(conn, m, text);
            }

            if (isDoxxeoCommand(command)) {
                await replyDoxxeo(conn, m, text);
            }

            if (command === 'gay') {
                await replyGayCanvas(conn, m);
            }

            if (isPercentageCommand(command)) {
                await replyPercentageGame(conn, m, command, text);
            }

            if (command === 'love') {
                await replyLoveMeter(conn, m, text);
            }

            if (command === 'top') {
                await replyFreeTop(conn, m, metadata.participants, text, usedPrefix);
            }

            if (isTopCommand(command)) {
                await replyTopCommand(conn, m, metadata.participants, command);
            }
        } catch (e: unknown) {
            logInfo(e);
        }
    }
});
