import assert from 'node:assert/strict';
import {
    calculateCharacterMaxSalePrice,
    calculateCharacterMinSalePrice,
} from '../src/domain/characters.js';
import {mapCharacter, type CharacterRow} from '../src/adapters/drizzle/character.mapper.js';

const baseCharacterRow: CharacterRow = {
    id: 1,
    name: 'Test Hero',
    url: 'https://example.com/hero.jpg',
    tipo: null,
    anime: null,
    rareza: null,
    price: 1000,
    previousPrice: null,
    claimedBy: null,
    forSale: null,
    seller: null,
    votes: null,
    lastRemovedTime: null,
};

{
    const character = mapCharacter(baseCharacterRow);
    assert.equal(character.name, 'Test Hero');
    assert.equal(character.previous_price, null);
    assert.equal(character.claimed_by, null);
    assert.equal(character.for_sale, false);
    assert.equal(character.votes, 0);
}

{
    assert.equal(calculateCharacterMinSalePrice(1000), 950);
    assert.equal(calculateCharacterMaxSalePrice(1000, 0), 1050);
    assert.equal(calculateCharacterMaxSalePrice(1000, 2), 1600);
}

console.log('character-domain.test.ts OK');
