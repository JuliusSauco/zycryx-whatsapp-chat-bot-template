import {isBankResource, type BankResource} from '../../domain/bank.js';

export function parseCustodyArguments(args: readonly string[]): {resource: BankResource; amount: number | 'all'} | null {
    const hasResource = !!args[0] && isBankResource(args[0].toLowerCase());
    const resource = hasResource ? args[0]!.toLowerCase() as BankResource : 'limite';
    const rawAmount = args[hasResource ? 1 : 0]?.toLowerCase();
    if (!rawAmount) return null;
    if (rawAmount === 'all') return {resource, amount: 'all'};
    const amount = Number(rawAmount);
    return Number.isInteger(amount) && amount > 0 ? {resource, amount} : null;
}
