import {logError, logInfo, logWarn} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {findCharacterByName, withdrawCharacterFromSale} from '../../services/character.service.js'

export default definePlugin({
    help: ['rw-retirar'],
    tags: ['gacha'],
    command: ['rw-retirar'],
    register: true,
    async execute(m, {conn, text}) {
    const characterName = text.trim().toLowerCase();
    if (!characterName) return conn.reply(m.chat, '⚠️ Por favor, especifica el nombre del personaje a retirar.', m);
    try {
        const characterToRemove = await findCharacterByName(characterName);

        if (!characterToRemove) return conn.reply(m.chat, `❌ No se encontró ningún personaje con el nombre: *${characterName}*.`, m);
        if (characterToRemove.seller !== m.sender) return conn.reply(m.chat, `❌ No puedes retirar este personaje porque no eres el vendedor.`, m);
        if (!characterToRemove.for_sale) {
            return conn.reply(m.chat, `❌ El personaje *${characterName}* no está actualmente a la venta.`, m);
        }

        await withdrawCharacterFromSale(characterToRemove.id);
        return conn.reply(m.chat, `✅ Has retirado el personaje *${characterToRemove.name}* del mercado.`, m);
    } catch (e: unknown) {
        logError(e);
        return conn.reply(m.chat, '⚠️ Error al retirar el personaje. Intenta de nuevo.', m);
    }
    }
});

;
