import type {characters} from '../../db/schema.js';
import type {CharacterRecord} from '../../domain/characters.js';

export type CharacterRow = typeof characters.$inferSelect;

export function mapCharacter(row: CharacterRow): CharacterRecord {
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
