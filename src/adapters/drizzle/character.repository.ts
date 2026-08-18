import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {characterMarketListings, characterOwnerships, characterPriceEvents, characters} from '../../db/schema.js';
import type {CharacterRepository} from '../../ports/repositories.js';
import {mapCharacter, type CharacterRow} from './character.mapper.js';

const projection = {
    id: characters.id,
    name: characters.name,
    url: characters.url,
    tipo: characters.tipo,
    anime: characters.anime,
    rareza: characters.rareza,
    price: sql<number | null>`(
        SELECT price FROM bot_content.character_price_events
        WHERE character_id = ${characters.id} ORDER BY created_at DESC, id DESC LIMIT 1
    )`,
    previousPrice: sql<number | null>`(
        SELECT previous_price FROM bot_content.character_market_listings
        WHERE character_id = ${characters.id} AND status = 'active' LIMIT 1
    )`,
    claimedBy: sql<string | null>`(
        SELECT owner_id FROM bot_content.character_ownerships WHERE character_id = ${characters.id}
    )`,
    forSale: sql<boolean>`EXISTS(
        SELECT 1 FROM bot_content.character_market_listings
        WHERE character_id = ${characters.id} AND status = 'active'
    )`,
    seller: sql<string | null>`(
        SELECT seller_id FROM bot_content.character_market_listings
        WHERE character_id = ${characters.id} AND status = 'active' LIMIT 1
    )`,
    votes: sql<number>`(
        SELECT COUNT(*)::int FROM bot_content.character_price_events
        WHERE character_id = ${characters.id} AND event_type = 'vote'
    )`,
    lastRemovedTime: sql<number | null>`(
        SELECT (EXTRACT(EPOCH FROM MAX(closed_at)) * 1000)::bigint
        FROM bot_content.character_market_listings
        WHERE character_id = ${characters.id} AND status = 'withdrawn'
    )`.mapWith(value => value === null ? null : Number(value)),
};

export const charactersRepository: CharacterRepository = {
    async findByUrl(url) {
        const [row] = await orm.select(projection).from(characters).where(eq(characters.url, url)).limit(1);
        return row ? mapCharacter(row as CharacterRow) : null;
    },

    async findByName(name) {
        const [row] = await orm.select(projection).from(characters)
            .where(sql`casefold(${characters.name}) = casefold(${name})`).limit(1);
        return row ? mapCharacter(row as CharacterRow) : null;
    },

    async findOwnedByName(name, ownerId) {
        const [row] = await orm.select(projection).from(characters)
            .innerJoin(characterOwnerships, eq(characterOwnerships.characterId, characters.id))
            .where(and(sql`casefold(${characters.name}) = casefold(${name})`, eq(characterOwnerships.ownerId, ownerId)))
            .limit(1);
        return row ? mapCharacter(row as CharacterRow) : null;
    },

    async listByOwner(ownerId) {
        const rows = await orm.select(projection).from(characters)
            .innerJoin(characterOwnerships, eq(characterOwnerships.characterId, characters.id))
            .where(eq(characterOwnerships.ownerId, ownerId)).orderBy(characters.name);
        return rows.map(row => mapCharacter(row as CharacterRow));
    },

    async listClaimOwners() {
        return orm.select({claimed_by: characterOwnerships.ownerId}).from(characterOwnerships);
    },

    async create(input) {
        return orm.transaction(async tx => {
            const [character] = await tx.insert(characters).values({
                name: input.name, url: input.url, tipo: input.tipo, anime: input.anime, rareza: input.rareza,
            }).returning();
            await tx.insert(characterPriceEvents).values({
                characterId: character.id, eventType: 'initial', price: input.price,
            });
            if (input.claimed_by) await tx.insert(characterOwnerships).values({
                characterId: character.id, ownerId: input.claimed_by,
            });
            if (input.for_sale && input.seller) await tx.insert(characterMarketListings).values({
                characterId: character.id,
                sellerId: input.seller,
                askingPrice: input.price,
                previousPrice: input.previous_price,
            });
            return mapCharacter({
                ...character,
                price: input.price,
                previousPrice: input.previous_price,
                claimedBy: input.claimed_by,
                forSale: input.for_sale,
                seller: input.seller,
                votes: input.votes,
                lastRemovedTime: input.last_removed_time,
            });
        });
    },

    async setOwner(characterId, ownerId) {
        await orm.insert(characterOwnerships).values({characterId, ownerId}).onConflictDoUpdate({
            target: characterOwnerships.characterId,
            set: {ownerId, acquiredAt: new Date()},
        });
    },

    async setForSale(characterId, {price, seller, previousPrice}) {
        await orm.transaction(async tx => {
            await tx.insert(characterMarketListings).values({
                characterId, sellerId: seller, askingPrice: price, previousPrice,
            });
            await tx.insert(characterPriceEvents).values({characterId, eventType: 'listing', price, actorId: seller});
        });
    },

    async withdrawFromSale(characterId, removedAt) {
        await orm.update(characterMarketListings).set({status: 'withdrawn', closedAt: new Date(removedAt)})
            .where(and(eq(characterMarketListings.characterId, characterId), eq(characterMarketListings.status, 'active')));
    },

    async completeSale(characterId, {buyer, price}) {
        await orm.transaction(async tx => {
            const [listing] = await tx.update(characterMarketListings)
                .set({status: 'sold', buyerId: buyer, closedAt: new Date()})
                .where(and(eq(characterMarketListings.characterId, characterId), eq(characterMarketListings.status, 'active')))
                .returning({askingPrice: characterMarketListings.askingPrice});
            await tx.insert(characterOwnerships).values({characterId, ownerId: buyer}).onConflictDoUpdate({
                target: characterOwnerships.characterId, set: {ownerId: buyer, acquiredAt: new Date()},
            });
            const finalPrice = price ?? listing?.askingPrice;
            if (typeof finalPrice === 'number') await tx.insert(characterPriceEvents).values({
                characterId, eventType: 'sale', price: finalPrice, actorId: buyer,
            });
        });
    },

    async vote(characterId, actorId, price) {
        await orm.insert(characterPriceEvents).values({characterId, eventType: 'vote', price, actorId});
    },
};
