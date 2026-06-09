import {logError} from '../../lib/logger.js';
import {definePlugin} from '../../core/define-plugin.js'
//Código elaborado por: https://github.com/elrebelde21

import {completeCharacterSale, listCharactersByOwner, putCharacterForSale} from '../../services/character.service.js';
import {addWalletResource, getWallet} from '../../services/wallet.service.js';
import type {CharacterRecord} from '../../ports/repositories.js';
import {getRequiredPluginMessage, renderTemplate} from '../../lib/message-template.js';

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
                return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.saleNotEnoughExp'), m);
            }

            const sellerExp = Math.round(price * 0.75);
            await addWalletResource(buyer, 'exp', -price);
            await addWalletResource(seller, 'exp', sellerExp);
            await completeCharacterSale(character.id, buyer, price);
            clearTimeout(sale.timer);
            pendingSales.delete(buyerId);

            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.saleAccepted'), {
                buyer: buyer.split('@')[0],
                name: character.name,
                seller: seller.split('@')[0],
                price
            }), m, {mentions: [buyer, seller]});
        } catch (e: unknown) {
            clearTimeout(sale.timer);
            pendingSales.delete(buyerId);
            return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.processBuyError'), m);
        }
    } else if (response === 'rechazar') {
        clearTimeout(sale.timer);
        pendingSales.delete(buyerId);
        return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.saleRejected'), {name: sale.character.name}), m);
    }
    },
    async execute(m, {conn, args, usedPrefix, command}) {
    try {
        const userCharacters = await listCharactersByOwner(m.sender);

        if (args.length < 2) {
            if (userCharacters.length === 0) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.noCharacters'), m);
            let characterList = getRequiredPluginMessage('rpg.rw.characterListHeader');
            userCharacters.forEach((character, index) => {
                characterList += renderTemplate(getRequiredPluginMessage('rpg.rw.characterListLine'), {
                    position: index + 1,
                    name: character.name,
                    price: character.price
                });
            });
            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.saleUsage'), {
                command: usedPrefix + command,
                characterList
            }), m);
        }

        const mentioned = m.mentionedJid[0] || null;
        const mentionIndex = args.findIndex(arg => arg.startsWith('@'));
        let priceText = args[args.length - 1];
        if (mentioned && mentionIndex !== -1) {
            priceText = args[args.length - 2];
        }

        const price = parseInt(priceText || '');
        if (isNaN(price) || price <= 0) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.invalidPrice'), m);

        const nameParts = args.slice(0, mentioned ? -2 : -1);
        const characterName = nameParts.join(' ').trim();
        if (!characterName) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.missingCharacterName'), m);

        const characterToSell = userCharacters.find(
            c => c.name.toLowerCase() === characterName.toLowerCase()
        );

        if (!characterToSell) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.sellNotFound'), m);
        if (characterToSell.for_sale) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.alreadyForSale'), m);

        if (characterToSell.last_removed_time) {
            const timeSinceRemoval = Date.now() - characterToSell.last_removed_time;
            if (timeSinceRemoval < cooldownTime) {
                const remainingTime = Math.ceil((cooldownTime - timeSinceRemoval) / 60000);
                return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.publishCooldown'), {
                    minutes: remainingTime,
                    name: characterToSell.name
                }), m);
            }
        }

        const minPrice = calculateMinPrice(characterToSell.price);
        const maxPrice = calculateMaxPrice(characterToSell.price, characterToSell.votes || 0);
        if (price < minPrice) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.minPrice'), {name: characterToSell.name, price: minPrice}), m);
        if (price > maxPrice) return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.maxPrice'), {name: characterToSell.name, price: maxPrice}), m);

        if (mentioned) {
            if (pendingSales.has(mentioned)) return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.pendingBuyer'), m);

            pendingSales.set(mentioned, {
                seller: m.sender,
                buyer: mentioned,
                character: characterToSell,
                price,
                timer: setTimeout(() => {
                    pendingSales.delete(mentioned);
                    conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.offerExpired'), {
                        buyer: mentioned.split('@')[0],
                        name: characterToSell.name
                    }), m, {mentions: [mentioned]});
                }, 60000), // 1 minuto
            });

            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.directOffer'), {
                buyer: mentioned.split('@')[0],
                seller: m.sender.split('@')[0],
                name: characterToSell.name,
                price
            }), m, {mentions: [mentioned, m.sender]});
        } else {
            const previousPrice = characterToSell.price;
            await putCharacterForSale(characterToSell.id, price, m.sender, previousPrice);
            return conn.reply(m.chat, renderTemplate(getRequiredPluginMessage('rpg.rw.marketPublished'), {
                name: characterToSell.name,
                price
            }), m);
        }
    } catch (e: unknown) {
        logError(e);
        return conn.reply(m.chat, getRequiredPluginMessage('rpg.rw.saleError'), m);
    }
    }
});

;
