import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {completeCharacterSale, listCharactersByOwner, putCharacterForSale} from '../../services/character.service.js';
import {addWalletResource, getWallet} from '../../services/wallet.service.js';
import type {CharacterRecord} from '../../ports/repositories.js';

interface PendingSale {
    seller: string;
    buyer: string;
    character: CharacterRecord;
    price: number;
    timer: ReturnType<typeof setTimeout>;
}

const pendingSales = new Map<string, PendingSale>();
const cooldownTime = 3600000; // 1 hora

function calculateMaxPrice(basePrice: number, votes: number) {
    if (votes === 0) {
        return Math.round(basePrice * 1.05);
    }
    const maxIncreasePercentage = 0.3;
    const maxPrice = basePrice * (1 + maxIncreasePercentage * votes);
    return Math.round(maxPrice);
}

function calculateMinPrice(basePrice: number) {
    return Math.round(basePrice * 0.95);
}

export default definePlugin({
    help: ['rw-vender'],
    tags: ['gacha'],
    command: ['rw-vender', 'vender'],
    register: true,
    async before(m, {conn}) {
    const buyerId = m.sender;
    const sale = pendingSales.get(buyerId);
    if (!sale) return;

    const response = m.originalText.toLowerCase();
    if (response === 'aceptar') {
        const {seller, buyer, character, price} = sale;
        try {
            const buyerData = await getWallet(buyer);
            if (!buyerData || buyerData.exp < price) {
                pendingSales.delete(buyerId);
                clearTimeout(sale.timer);
                return conn.reply(m.chat, '⚠️ No tienes suficiente exp para comprar este personaje.', m);
            }

            const sellerExp = Math.round(price * 0.75);
            await addWalletResource(buyer, 'exp', -price);
            await addWalletResource(seller, 'exp', sellerExp);
            await completeCharacterSale(character.id, buyer, price);
            clearTimeout(sale.timer);
            pendingSales.delete(buyerId);

            return conn.reply(m.chat, `✅ @${buyer.split('@')[0]} ha comprado *${character.name}* de @${seller.split('@')[0]} por ${price} exp.`, m, {mentions: [buyer, seller]});
        } catch (e: unknown) {
            clearTimeout(sale.timer);
            pendingSales.delete(buyerId);
            return conn.reply(m.chat, '⚠️ Error al procesar la compra. Intenta de nuevo.', m);
        }
    } else if (response === 'rechazar') {
        clearTimeout(sale.timer);
        pendingSales.delete(buyerId);
        return conn.reply(m.chat, `⚠️ Has rechazado la oferta de compra para *${sale.character.name}*.`, m);
    }
    },
    async execute(m, {conn, args, usedPrefix, command}) {
    try {
        const userCharacters = await listCharactersByOwner(m.sender);

        if (args.length < 2) {
            if (userCharacters.length === 0) return conn.reply(m.chat, '⚠️ No tienes personajes registrados. Reclama uno primero.', m);
            let characterList = 'Lista de tus personajes:\n';
            userCharacters.forEach((character, index) => {
                characterList += `${index + 1}. ${character.name} - ${character.price} exp\n`;
            });
            return conn.reply(m.chat, `*⚠️ Pendejo no sabes como usar estos? Usa de la siguiente manera:*\n\n• Puedes vender un personaje a un usuario con:\n${usedPrefix + command} <nombre del personaje> <precio> @tag\n\n• O puedes poner tu personaje en el mercado:\nEj: ${usedPrefix + command} goku 9500\n\n` + characterList, m);
        }

        const mentioned = m.mentionedJid[0] || null;
        const mentionIndex = args.findIndex(arg => arg.startsWith('@'));
        let priceText = args[args.length - 1];
        if (mentioned && mentionIndex !== -1) {
            priceText = args[args.length - 2];
        }

        const price = parseInt(priceText || '');
        if (isNaN(price) || price <= 0) return conn.reply(m.chat, '⚠️ Por favor, especifica un precio válido para tu personaje.', m);

        const nameParts = args.slice(0, mentioned ? -2 : -1);
        const characterName = nameParts.join(' ').trim();
        if (!characterName) return conn.reply(m.chat, '⚠️ No se encontró el nombre del personaje. Verifica e intenta nuevamente.', m);

        const characterToSell = userCharacters.find(
            c => c.name.toLowerCase() === characterName.toLowerCase()
        );

        if (!characterToSell) return conn.reply(m.chat, '⚠️ No se encontró el personaje que intentas vender.', m);
        if (characterToSell.for_sale) return conn.reply(m.chat, '⚠️ Este personaje ya está en venta. Usa el comando `.rf-retirar` para retirarlo antes de volver a publicarlo.', m);

        if (characterToSell.last_removed_time) {
            const timeSinceRemoval = Date.now() - characterToSell.last_removed_time;
            if (timeSinceRemoval < cooldownTime) {
                const remainingTime = Math.ceil((cooldownTime - timeSinceRemoval) / 60000);
                return conn.reply(m.chat, `⚠️ Debes esperar ${remainingTime} minutos antes de volver a publicar a *${characterToSell.name}*.`, m);
            }
        }

        const minPrice = calculateMinPrice(characterToSell.price);
        const maxPrice = calculateMaxPrice(characterToSell.price, characterToSell.votes || 0);
        if (price < minPrice) return conn.reply(m.chat, `⚠️ El precio mínimo permitido para ${characterToSell.name} es ${minPrice} exp.`, m);
        if (price > maxPrice) return conn.reply(m.chat, `⚠️ El precio máximo permitido para ${characterToSell.name} es ${maxPrice} exp.`, m);

        if (mentioned) {
            if (pendingSales.has(mentioned)) return conn.reply(m.chat, '⚠️ El comprador ya tiene una solicitud pendiente. Por favor, espera.', m);

            pendingSales.set(mentioned, {
                seller: m.sender,
                buyer: mentioned,
                character: characterToSell,
                price,
                timer: setTimeout(() => {
                    pendingSales.delete(mentioned);
                    conn.reply(m.chat, `⏰ @${mentioned.split('@')[0]} no respondió a la oferta de *${characterToSell.name}*. La solicitud fue cancelada.`, m, {mentions: [mentioned]});
                }, 60000), // 1 minuto
            });

            return conn.reply(m.chat, `📜 Hey @${mentioned.split('@')[0]}, el usuario @${m.sender.split('@')[0]} quiere venderte *${characterToSell.name}* por ${price} exp.\n\nResponde con:\n- *Aceptar* para comprar.\n- *Rechazar* para cancelar.`, m, {mentions: [mentioned, m.sender]});
        } else {
            const previousPrice = characterToSell.price;
            await putCharacterForSale(characterToSell.id, price, m.sender, previousPrice);
            return conn.reply(m.chat, `✅ Has puesto a la venta *${characterToSell.name}* en el mercado por ${price} exp.`, m);
        }
    } catch (e: unknown) {
        console.error(e);
        return conn.reply(m.chat, '⚠️ Error al procesar la venta. Intenta de nuevo.', m);
    }
    }
});

;
