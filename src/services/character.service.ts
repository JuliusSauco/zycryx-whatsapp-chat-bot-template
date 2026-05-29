import type {CharacterRecord} from '../ports/repositories.js';
import {repositories} from './data-source.js';

export async function findCharacterByUrl(url: string): Promise<CharacterRecord | null> {
    return repositories.characters.findByUrl(url);
}

export async function findCharacterByName(name: string): Promise<CharacterRecord | null> {
    return repositories.characters.findByName(name);
}

export async function findOwnedCharacterByName(name: string, ownerId: string): Promise<CharacterRecord | null> {
    return repositories.characters.findOwnedByName(name, ownerId);
}

export async function listCharactersByOwner(ownerId: string): Promise<CharacterRecord[]> {
    return repositories.characters.listByOwner(ownerId);
}

export async function listCharacterClaimOwners(): Promise<Array<{claimed_by: string | null}>> {
    return repositories.characters.listClaimOwners();
}

export async function createCharacter(input: Omit<CharacterRecord, 'id'>): Promise<CharacterRecord> {
    return repositories.characters.create(input);
}

export async function claimCharacter(characterId: number, ownerId: string): Promise<void> {
    await repositories.characters.setOwner(characterId, ownerId);
}

export async function putCharacterForSale(
    characterId: number,
    price: number,
    seller: string,
    previousPrice: number | null,
): Promise<void> {
    await repositories.characters.setForSale(characterId, {price, seller, previousPrice});
}

export async function withdrawCharacterFromSale(characterId: number, removedAt = Date.now()): Promise<void> {
    await repositories.characters.withdrawFromSale(characterId, removedAt);
}

export async function completeCharacterSale(characterId: number, buyer: string, price?: number): Promise<void> {
    await repositories.characters.completeSale(characterId, {buyer, price});
}

export async function voteCharacter(characterId: number, votes: number, price: number): Promise<void> {
    await repositories.characters.vote(characterId, votes, price);
}
