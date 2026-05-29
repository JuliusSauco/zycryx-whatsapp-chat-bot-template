import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {characters} from '../../db/schema.js';
import type {CharacterRepository} from '../../ports/repositories.js';

function mapCharacter(row: typeof characters.$inferSelect) {
    return {
        id: row.id,
        name: row.name,
        url: row.url,
        tipo: row.tipo,
        anime: row.anime,
        rareza: row.rareza,
        price: row.price,
        previous_price: row.previousPrice,
        claimed_by: row.claimedBy,
        for_sale: row.forSale ?? false,
        seller: row.seller,
        votes: row.votes ?? 0,
        last_removed_time: row.lastRemovedTime,
    };
}

export const charactersRepository: CharacterRepository = {
    async findByUrl(url) {
        const [row] = await orm.select().from(characters).where(eq(characters.url, url)).limit(1);
        return row ? mapCharacter(row) : null;
    },

    async findByName(name) {
        const [row] = await orm.select()
            .from(characters)
            .where(sql`LOWER(${characters.name}) = ${name.toLowerCase()}`)
            .limit(1);
        return row ? mapCharacter(row) : null;
    },

    async findOwnedByName(name, ownerId) {
        const [row] = await orm.select()
            .from(characters)
            .where(and(sql`LOWER(${characters.name}) = ${name.toLowerCase()}`, eq(characters.claimedBy, ownerId)))
            .limit(1);
        return row ? mapCharacter(row) : null;
    },

    async listByOwner(ownerId) {
        const rows = await orm.select().from(characters).where(eq(characters.claimedBy, ownerId)).orderBy(characters.name);
        return rows.map(mapCharacter);
    },

    async listClaimOwners() {
        return orm.select({claimed_by: characters.claimedBy}).from(characters);
    },

    async create(input) {
        const [row] = await orm.insert(characters)
            .values({
                name: input.name,
                url: input.url,
                tipo: input.tipo,
                anime: input.anime,
                rareza: input.rareza,
                price: input.price,
                previousPrice: input.previous_price,
                claimedBy: input.claimed_by,
                forSale: input.for_sale,
                seller: input.seller,
                votes: input.votes,
                lastRemovedTime: input.last_removed_time,
            })
            .returning();
        return mapCharacter(row);
    },

    async setOwner(characterId, ownerId) {
        await orm.update(characters)
            .set({claimedBy: ownerId})
            .where(eq(characters.id, characterId));
    },

    async setForSale(characterId, {price, seller, previousPrice}) {
        await orm.update(characters)
            .set({price, forSale: true, seller, previousPrice})
            .where(eq(characters.id, characterId));
    },

    async withdrawFromSale(characterId, removedAt) {
        await orm.update(characters)
            .set({forSale: false, seller: null, lastRemovedTime: removedAt})
            .where(eq(characters.id, characterId));
    },

    async completeSale(characterId, {buyer, price}) {
        const set: Record<string, unknown> = {claimedBy: buyer, forSale: false, seller: null};
        if (typeof price === 'number') set.price = price;
        await orm.update(characters)
            .set(set)
            .where(eq(characters.id, characterId));
    },

    async vote(characterId, votes, price) {
        await orm.update(characters)
            .set({votes, price})
            .where(eq(characters.id, characterId));
    },
};
