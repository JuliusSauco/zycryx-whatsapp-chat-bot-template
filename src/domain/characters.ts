export interface CharacterRecord {
    id: number;
    name: string;
    url: string;
    tipo: string | null;
    anime: string | null;
    rareza: string | null;
    price: number;
    previous_price: number | null;
    claimed_by: string | null;
    for_sale: boolean;
    seller: string | null;
    votes: number;
    last_removed_time: number | null;
}

export type CreateCharacterInput = Omit<CharacterRecord, 'id'>;

export interface CharacterClaimOwner {
    claimed_by: string | null;
}

export interface CharacterSaleInput {
    price: number;
    seller: string;
    previousPrice: number | null;
}

export interface CompleteCharacterSaleInput {
    buyer: string;
    price?: number;
}

export function calculateCharacterMinSalePrice(basePrice: number): number {
    return Math.round(basePrice * 0.95);
}

export function calculateCharacterMaxSalePrice(basePrice: number, votes: number): number {
    if (votes === 0) {
        return Math.round(basePrice * 1.05);
    }
    const maxIncreasePercentage = 0.3;
    return Math.round(basePrice * (1 + maxIncreasePercentage * votes));
}
