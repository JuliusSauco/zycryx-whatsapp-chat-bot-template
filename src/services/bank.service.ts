import {randomUUID} from 'node:crypto';
import type {BankResource, ExchangeAmount} from '../domain/bank.js';
import type {WalletResource} from '../domain/users.js';
import {repositories} from './data-source.js';

export async function getBankOverview(userId: string, now = new Date()) {
    await repositories.banks.ensureAccount(userId);
    return repositories.banks.getOverview(userId, now);
}

export async function transferBankCustody(input: {
    userId: string;
    resource: BankResource;
    direction: 'deposit' | 'withdraw';
    amount: number | 'all';
}) {
    await repositories.banks.ensureAccount(input.userId);
    return repositories.banks.transferCustody({...input, operationId: randomUUID()});
}

export function getBankReserves() {
    return repositories.banks.getReserves();
}

export function adjustBankReserve(actorId: string, resource: BankResource, amount: number) {
    return repositories.banks.adjustReserve({actorId, resource, amount, operationId: randomUUID()});
}

export function listBankExchangeRates() {
    return repositories.banks.listExchangeRates();
}

export function exchangeBankCurrency(input: {
    userId: string;
    sourceResource: WalletResource;
    targetResource: BankResource;
    amount: ExchangeAmount;
}) {
    return repositories.banks.exchangeCurrency({...input, operationId: randomUUID()});
}

export function requestBankLoan(userId: string, amount: number, now = new Date()) {
    return repositories.banks.requestLoan({userId, amount, now, operationId: randomUUID()});
}

export function payBankLoan(userId: string, amount: number | 'all', now = new Date()) {
    return repositories.banks.payLoan({userId, amount, now, operationId: randomUUID()});
}

export function refreshBankLoanStatuses(now = new Date()) {
    return repositories.banks.refreshLoanStatuses(now);
}
