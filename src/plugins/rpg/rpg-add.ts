import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';
import {getNumberByLid, getUserById} from '../../services/user.service.js';
import {addWalletResource} from '../../services/wallet.service.js';

export default definePlugin({
    help: ['addexp', 'addlimit', 'removexp', 'removelimit'],
    tags: ['owner'],
    command: /^(añadirdiamantes|dardiamantes|addlimit|removelimit|quitardiamantes|sacardiamantes|añadirxp|addexp|addxp|removexp|quitarxp|sacarexp)$/i,
    owner: true,
    register: true,
    async execute(m, {command, text}) {
    let who = m.isGroup ? m.mentionedJid?.[0] : m.chat;
    if (!who) return m.reply(getRequiredPluginMessage('rpg.adminAdd.missingTarget'));
    let idFinal = who;

    if (idFinal.includes("@lid")) {
        const numero = await getNumberByLid(idFinal);
        if (!numero) return m.reply(getRequiredPluginMessage('rpg.adminAdd.lidNotFound'));
        idFinal = numero + "@s.whatsapp.net";
    }

    const cleanJid = idFinal.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const cantidad = parseInt(text.match(/\d+/)?.[0] || '');
    if (!cantidad || isNaN(cantidad)) return m.reply(getRequiredPluginMessage('rpg.adminAdd.invalidAmount'));
    try {
        const user = await getUserById(cleanJid);
        if (!user) return m.reply(getRequiredPluginMessage('rpg.adminAdd.userNotFound'));

        if (/addlimit|añadirdiamantes|dardiamantes/i.test(command)) {
            await addWalletResource(cleanJid, 'limite', cantidad);
            return m.reply(renderTemplate(getRequiredPluginMessage('rpg.adminAdd.diamondsAdded'), {amount: cantidad}));
        }

        if (/removelimit|quitardiamantes|sacardiamantes/i.test(command)) {
            await addWalletResource(cleanJid, 'limite', -cantidad);
            return m.reply(renderTemplate(getRequiredPluginMessage('rpg.adminAdd.diamondsRemoved'), {amount: cantidad}));
        }

        if (/addexp|añadirxp|addxp/i.test(command)) {
            await addWalletResource(cleanJid, 'exp', cantidad);
            return m.reply(renderTemplate(getRequiredPluginMessage('rpg.adminAdd.expAdded'), {amount: cantidad}));
        }

        if (/removexp|quitarxp|sacarexp/i.test(command)) {
            await addWalletResource(cleanJid, 'exp', -cantidad);
            return m.reply(renderTemplate(getRequiredPluginMessage('rpg.adminAdd.expRemoved'), {amount: cantidad}));
        }
    } catch (e: unknown) {
        logError(e);
        return m.reply(getRequiredPluginMessage('rpg.adminAdd.error'));
    }
    }
});

;
