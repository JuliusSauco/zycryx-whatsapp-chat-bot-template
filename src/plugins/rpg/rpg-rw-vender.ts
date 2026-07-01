import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/plugin-sdk.js';
//Código elaborado por: https://github.com/elrebelde21

import {completeCharacterSale, listCharactersByOwner, putCharacterForSale} from '../../services/character.service.js';
import {addWalletResource, getWallet} from '../../services/wallet.service.js';
import type {CharacterRecord} from '../../ports/repositories.js';
import {createPendingActionStore} from '../../lib/ephemeral-state.js';
import {content} from '../../services/content.service.js';

interface PendingSale {
    seller: string;
    buyer: string;
    character: CharacterRecord;
    price: number;
    notifyExpired: () => Promise<unknown>;
}

const pendingSales = createPendingActionStore<PendingSale>({
    ttlMs: 60_000,
    onExpire: (_buyer, sale) => {
        void sale.notifyExpired();
    },
});
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

export default defineSdkPlugin({
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
                pendingSales.cancel(buyerId);
                return conn.reply(m.chat, content.message('rpg.rw.saleNotEnoughExp'), m);
            }

            const sellerExp = Math.round(price * 0.75);
            await addWalletResource(buyer, 'exp', -price);
            await addWalletResource(seller, 'exp', sellerExp);
            await completeCharacterSale(character.id, buyer, price);
            pendingSales.cancel(buyerId);

            return conn.reply(m.chat, content.renderMessage('rpg.rw.saleAccepted', {
                buyer: buyer.split('@')[0],
                name: character.name,
                seller: seller.split('@')[0],
                price
            }), m, {mentions: [buyer, seller]});
        } catch (e: unknown) {
            pendingSales.cancel(buyerId);
            return conn.reply(m.chat, content.message('rpg.rw.processBuyError'), m);
        }
    } else if (response === 'rechazar') {
        pendingSales.cancel(buyerId);
        return conn.reply(m.chat, content.renderMessage('rpg.rw.saleRejected', {name: sale.character.name}), m);
    }
    },
    async execute(m, {conn, args, usedPrefix, command, sdk}) {
    try {
        const userCharacters = await listCharactersByOwner(m.sender);

        if (args.length < 2) {
            if (userCharacters.length === 0) return sdk.reply.message('rpg.rw.noCharacters');
            let characterList = sdk.content.message('rpg.rw.characterListHeader');
            userCharacters.forEach((character, index) => {
                characterList += sdk.content.renderMessage('rpg.rw.characterListLine', {
                    position: index + 1,
                    name: character.name,
                    price: character.price
                });
            });
            return sdk.reply.message('rpg.rw.saleUsage', {
                command: usedPrefix + command,
                characterList
            });
        }

        const mentioned = m.mentionedJid[0] || null;
        const mentionIndex = args.findIndex(arg => arg.startsWith('@'));
        let priceText = args[args.length - 1];
        if (mentioned && mentionIndex !== -1) {
            priceText = args[args.length - 2];
        }

        const price = parseInt(priceText || '');
        if (isNaN(price) || price <= 0) return sdk.reply.message('rpg.rw.invalidPrice');

        const nameParts = args.slice(0, mentioned ? -2 : -1);
        const characterName = nameParts.join(' ').trim();
        if (!characterName) return sdk.reply.message('rpg.rw.missingCharacterName');

        const characterToSell = userCharacters.find(
            c => c.name.toLowerCase() === characterName.toLowerCase()
        );

        if (!characterToSell) return sdk.reply.message('rpg.rw.sellNotFound');
        if (characterToSell.for_sale) return sdk.reply.message('rpg.rw.alreadyForSale');

        if (characterToSell.last_removed_time) {
            const timeSinceRemoval = Date.now() - characterToSell.last_removed_time;
            if (timeSinceRemoval < cooldownTime) {
                const remainingTime = Math.ceil((cooldownTime - timeSinceRemoval) / 60000);
                return sdk.reply.message('rpg.rw.publishCooldown', {
                    minutes: remainingTime,
                    name: characterToSell.name
                });
            }
        }

        const minPrice = calculateMinPrice(characterToSell.price);
        const maxPrice = calculateMaxPrice(characterToSell.price, characterToSell.votes || 0);
        if (price < minPrice) return sdk.reply.message('rpg.rw.minPrice', {name: characterToSell.name, price: minPrice});
        if (price > maxPrice) return sdk.reply.message('rpg.rw.maxPrice', {name: characterToSell.name, price: maxPrice});

        if (mentioned) {
            if (pendingSales.get(mentioned)) return sdk.reply.message('rpg.rw.pendingBuyer');

            pendingSales.start(mentioned, {
                seller: m.sender,
                buyer: mentioned,
                character: characterToSell,
                price,
                notifyExpired: () => conn.reply(m.chat, sdk.content.renderMessage('rpg.rw.offerExpired', {
                    buyer: mentioned.split('@')[0],
                    name: characterToSell.name
                }), m, {mentions: [mentioned]}),
            });

            return conn.reply(m.chat, sdk.content.renderMessage('rpg.rw.directOffer', {
                buyer: mentioned.split('@')[0],
                seller: m.sender.split('@')[0],
                name: characterToSell.name,
                price
            }), m, {mentions: [mentioned, m.sender]});
        } else {
            const previousPrice = characterToSell.price;
            await putCharacterForSale(characterToSell.id, price, m.sender, previousPrice);
            return sdk.reply.message('rpg.rw.marketPublished', {
                name: characterToSell.name,
                price
            });
        }
    } catch (e: unknown) {
        logError(e);
        return sdk.reply.message('rpg.rw.saleError');
    }
    }
});

;
