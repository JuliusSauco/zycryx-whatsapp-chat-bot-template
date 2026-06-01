import {definePlugin} from '../../core/define-plugin.js'
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
    if (!who) return m.reply("⚠️ Etiqueta a una persona con el @tag");
    let idFinal = who;

    if (idFinal.includes("@lid")) {
        const numero = await getNumberByLid(idFinal);
        if (!numero) return m.reply("❌ No se encontró al usuario con ese LID en la base de datos.");
        idFinal = numero + "@s.whatsapp.net";
    }

    const cleanJid = idFinal.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const cantidad = parseInt(text.match(/\d+/)?.[0] || '');
    if (!cantidad || isNaN(cantidad)) return m.reply("⚠️ Ingresa una cantidad válida");
    try {
        const user = await getUserById(cleanJid);
        if (!user) return m.reply("❌ Ese usuario no está registrado en la base de datos.");

        if (/addlimit|añadirdiamantes|dardiamantes/i.test(command)) {
            await addWalletResource(cleanJid, 'limite', cantidad);
            return m.reply(`*≡ 💎 DIAMANTES AGREGADOS:*\n┏━━━━━━━━━━━━\n┃• *𝗍᥆𝗍ᥲᥣ:* ${cantidad}\n┗━━━━━━━━━━━━`);
        }

        if (/removelimit|quitardiamantes|sacardiamantes/i.test(command)) {
            await addWalletResource(cleanJid, 'limite', -cantidad);
            return m.reply(`*≡ 💎 DIAMANTES QUITADOS:*\n┏━━━━━━━━━━━━\n┃• *𝗍᥆𝗍ᥲ᥹:* ${cantidad}\n┗━━━━━━━━━━━━`);
        }

        if (/addexp|añadirxp|addxp/i.test(command)) {
            await addWalletResource(cleanJid, 'exp', cantidad);
            return m.reply(`*≡ ✨ EXP AGREGADO:*\n┏━━━━━━━━━━━━\n┃• *𝗍᥆𝗍ᥲᥣ:* ${cantidad}\n┗━━━━━━━━━━━━`);
        }

        if (/removexp|quitarxp|sacarexp/i.test(command)) {
            await addWalletResource(cleanJid, 'exp', -cantidad);
            return m.reply(`*≡ ✨ EXP QUITADO:*\n┏━━━━━━━━━━━━\n┃• *𝗍᥆𝗍ᥲ᥹:* ${cantidad}\n┗━━━━━━━━━━━━`);
        }
    } catch (e: unknown) {
        console.error(e);
        return m.reply("❌ Error al modificar datos.");
    }
    }
});

;
