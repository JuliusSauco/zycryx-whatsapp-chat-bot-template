export const BANK_RESOURCES = ['limite', 'coins', 'botcoin', 'zyxcoin'] as const;
export type BankResource = typeof BANK_RESOURCES[number];
export type BankLoanStatus = 'active' | 'overdue' | 'defaulted' | 'paid';
export type ExchangeAmount = number | 'all';

export interface BankExchangeRate {
    sourceResource: import('./users.js').WalletResource;
    targetResource: BankResource;
    sourceAmount: number;
    targetAmount: number;
    active: boolean;
}

export const MIN_LOAN_LEVEL = 5;
export const MIN_LOAN_AMOUNT = 100;
export const LOAN_COINS_PER_LEVEL = 1_000;
export const MAX_LOAN_AMOUNT = 50_000;
export const LOAN_INTEREST_PERCENT = 5;
export const LOAN_TERM_MS = 7 * 24 * 60 * 60 * 1000;
export const LOAN_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export interface BankBalances {
    limite: number;
    coins: number;
    botcoin: number;
    zyxcoin: number;
}

export interface BankLoan {
    id: number;
    userId: string;
    principal: number;
    interestAmount: number;
    principalOutstanding: number;
    interestOutstanding: number;
    status: BankLoanStatus;
    issuedAt: Date;
    dueAt: Date;
    defaultAt: Date;
    paidAt: Date | null;
}

export interface BankOverview {
    balances: BankBalances;
    loan: BankLoan | null;
}

export interface BankTransferHistoryItem {
    id: number;
    resource: BankResource;
    amount: number;
    balanceAfter: number;
    counterpartyId: string | null;
    operationId: string | null;
    createdAt: Date;
}

export interface BankTransferHistoryPage {
    items: BankTransferHistoryItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export type BankTransferResult =
    | {kind: 'success'; amount: number; walletBalance: number; bankBalance: number}
    | {kind: 'missing_account' | 'inactive_account' | 'insufficient_wallet' | 'insufficient_bank' | 'overflow'};

export type BankAccountTransferResult =
    | {kind: 'success'; amount: number; senderBankBalance: number; receiverBankBalance: number}
    | {kind: 'same_user' | 'missing_account' | 'inactive_account' | 'invalid_amount' | 'insufficient_bank' | 'overflow'};

export type LoanRequestResult =
    | {kind: 'success'; loan: BankLoan; walletBalance: number; reserveBalance: number}
    | {kind: 'not_registered' | 'existing_loan' | 'insufficient_reserve'}
    | {kind: 'level_too_low'; level: number}
    | {kind: 'invalid_amount'; minimum: number}
    | {kind: 'over_credit_limit'; creditLimit: number};

export type LoanPaymentResult =
    | {kind: 'success'; loan: BankLoan; amount: number; interestPaid: number; principalPaid: number; walletBalance: number}
    | {kind: 'no_loan' | 'insufficient_wallet'};

export type CurrencyExchangeResult =
    | {
        kind: 'success';
        rate: BankExchangeRate;
        sourceSpent: number;
        targetReceived: number;
        sourceBalance: number;
        targetBalance: number;
    }
    | {kind: 'unavailable_pair' | 'invalid_amount' | 'insufficient_wallet' | 'insufficient_reserve' | 'overflow'};

export function isBankResource(value: string): value is BankResource {
    return BANK_RESOURCES.includes(value as BankResource);
}

export function calculateExchangeQuote(
    rate: BankExchangeRate,
    requested: ExchangeAmount,
    sourceBalance: number,
): {kind: 'success'; sourceSpent: number; targetReceived: number} | {kind: 'invalid_amount' | 'insufficient_wallet' | 'overflow'} {
    if (!Number.isSafeInteger(sourceBalance) || sourceBalance < 0) return {kind: 'overflow'};
    if (requested !== 'all' && (
        !Number.isSafeInteger(requested)
        || requested <= 0
        || requested % rate.targetAmount !== 0
    )) return {kind: 'invalid_amount'};
    const lots = requested === 'all'
        ? Math.floor(sourceBalance / rate.sourceAmount)
        : requested / rate.targetAmount;
    if (!Number.isSafeInteger(lots) || lots <= 0) return {kind: 'insufficient_wallet'};
    const sourceSpent = lots * rate.sourceAmount;
    const targetReceived = lots * rate.targetAmount;
    if (!Number.isSafeInteger(sourceSpent) || !Number.isSafeInteger(targetReceived)) return {kind: 'overflow'};
    if (sourceBalance < sourceSpent) return {kind: 'insufficient_wallet'};
    return {kind: 'success', sourceSpent, targetReceived};
}

export function getLoanCreditLimit(level: number): number {
    if (!Number.isFinite(level) || level < MIN_LOAN_LEVEL) return 0;
    return Math.min(Math.floor(level) * LOAN_COINS_PER_LEVEL, MAX_LOAN_AMOUNT);
}

export function calculateLoanInterest(principal: number): number {
    return Math.ceil(principal * LOAN_INTEREST_PERCENT / 100);
}

export function getLoanStatus(status: BankLoanStatus, dueAt: Date, defaultAt: Date, now: Date): BankLoanStatus {
    if (status === 'paid') return status;
    if (now >= defaultAt) return 'defaulted';
    if (now >= dueAt) return 'overdue';
    return 'active';
}

export function allocateLoanPayment(
    amount: number,
    interestOutstanding: number,
    principalOutstanding: number,
): {amount: number; interestPaid: number; principalPaid: number; interestAfter: number; principalAfter: number} {
    const total = interestOutstanding + principalOutstanding;
    const applied = Math.min(Math.max(0, Math.floor(amount)), total);
    const interestPaid = Math.min(applied, interestOutstanding);
    const principalPaid = applied - interestPaid;
    return {
        amount: applied,
        interestPaid,
        principalPaid,
        interestAfter: interestOutstanding - interestPaid,
        principalAfter: principalOutstanding - principalPaid,
    };
}
