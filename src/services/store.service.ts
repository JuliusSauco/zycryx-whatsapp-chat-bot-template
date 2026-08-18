import {randomUUID} from 'node:crypto';
import {
    MAX_RAFFLE_TICKETS_PER_PURCHASE, RAFFLE_PAGE_SIZE, type TicketPaymentResource,
} from '../domain/store.js';
import {repositories} from './data-source.js';

export function listEconomicResources() {
    return repositories.store.listEconomicResources();
}

export function getSecurityOverview(userId: string) {
    return repositories.store.getSecurityOverview(userId);
}

export function buySecurity(userId: string, now = new Date()) {
    return repositories.store.buySecurity(userId, now, randomUUID());
}

export function deactivateSecurity(userId: string, now = new Date()) {
    return repositories.store.deactivateSecurity(userId, now);
}

export function renewDueSecuritySubscriptions(now = new Date(), limit = 100) {
    return repositories.store.renewDueSecuritySubscriptions(now, limit);
}

export function buyRaffleTickets(input: {userId: string; quantity: number; paymentResource?: TicketPaymentResource}) {
    const validQuantity = Number.isSafeInteger(input.quantity)
        && input.quantity > 0
        && input.quantity <= MAX_RAFFLE_TICKETS_PER_PURCHASE;
    const codes = validQuantity
        ? Array.from({length: input.quantity}, () => `RFL-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`)
        : [];
    return repositories.store.buyRaffleTickets({...input, codes, operationId: randomUUID()});
}

export function listAvailableRaffleTickets(page: number) {
    return repositories.store.listAvailableRaffleTickets(page, RAFFLE_PAGE_SIZE);
}

export function drawRaffle(title: string, ownerId: string) {
    return repositories.store.drawRaffle({title, ownerId});
}
