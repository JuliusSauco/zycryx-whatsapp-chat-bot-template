import type {CharacterRecord} from '../../domain/characters.js';

export interface CharacterRow {
    id: number;
    name: string;
    url: string;
    tipo: string | null;
    anime: string | null;
    rareza: string | null;
    price: number | null;
    previousPrice: number | null;
    claimedBy: string | null;
    forSale: boolean | null;
    seller: string | null;
    votes: number | null;
    lastRemovedTime: number | null;
}

export function mapCharacter(row: CharacterRow): CharacterRecord {
    return {
        id: row.id,
        name: row.name,
        url: row.url,
        tipo: row.tipo,
        anime: row.anime,
        rareza: row.rareza,
        price: row.price ?? 0,
        previous_price: row.previousPrice,
        claimed_by: row.claimedBy,
        for_sale: row.forSale ?? false,
        seller: row.seller,
        votes: row.votes ?? 0,
        last_removed_time: row.lastRemovedTime,
    };
}
