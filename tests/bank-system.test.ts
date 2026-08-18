import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getTableColumns} from 'drizzle-orm';
import {
    allocateLoanPayment,
    calculateExchangeQuote,
    calculateLoanInterest,
    getLoanCreditLimit,
    getLoanStatus,
    isBankResource,
} from '../src/domain/bank.js';
import {
    bankExchangeRates,
    bankLoanPayments,
    bankLoans,
    bankReserves,
    bankTransactions,
    userBankAccounts,
    userWallets,
    usuarios,
    walletTransactions,
} from '../src/db/schema.js';
import bankPlugin from '../src/plugins/economy/economy-bank.js';
import depositPlugin, {DEPOSIT_COMMANDS} from '../src/plugins/economy/economy-deposit.js';
import withdrawPlugin, {WITHDRAW_COMMANDS} from '../src/plugins/economy/economy-withdraw.js';
import {parseCustodyArguments} from '../src/plugins/economy/economy-custody.helpers.js';
import loanPlugin from '../src/plugins/economy/economy-loan.js';
import reservePlugin from '../src/plugins/economy/economy-bank-reserve.js';
import {isPrivateCommandAllowed} from '../src/plugins/hooks/_antiprivado.js';
import exchangePlugin from '../src/plugins/economy/economy-exchange.js';
import buyPlugin from '../src/plugins/economy/economy-buy.js';
import walletPlugin from '../src/plugins/economy/economy-wallet.js';
import transferPlugin from '../src/plugins/economy/economy-transfer.js';
import addExpPlugin from '../src/plugins/economy/economy-add-exp.js';
import economyMenu from '../src/plugins/menus/menu-economy.js';
import rpgMenu from '../src/plugins/menus/menu-rpg.js';

assert.equal(isBankResource('exp'), false);
assert.equal(isBankResource('coins'), true);
assert.equal(getLoanCreditLimit(4), 0);
assert.equal(getLoanCreditLimit(5), 5_000);
assert.equal(getLoanCreditLimit(100), 50_000);
assert.equal(calculateLoanInterest(100), 5);
assert.equal(calculateLoanInterest(101), 6);
assert.deepEqual(allocateLoanPayment(50, 25, 100), {
    amount: 50, interestPaid: 25, principalPaid: 25, interestAfter: 0, principalAfter: 75,
});
assert.deepEqual(allocateLoanPayment(500, 25, 100), {
    amount: 125, interestPaid: 25, principalPaid: 100, interestAfter: 0, principalAfter: 0,
});

const expRate = {sourceResource: 'exp', targetResource: 'limite', sourceAmount: 1_000, targetAmount: 1, active: true} as const;
assert.deepEqual(calculateExchangeQuote(expRate, 5, 5_500), {
    kind: 'success', sourceSpent: 5_000, targetReceived: 5,
});
assert.deepEqual(calculateExchangeQuote(expRate, 'all', 5_500), {
    kind: 'success', sourceSpent: 5_000, targetReceived: 5,
});
assert.deepEqual(calculateExchangeQuote(expRate, 6, 5_500), {kind: 'insufficient_wallet'});
assert.deepEqual(calculateExchangeQuote(expRate, 0, 5_500), {kind: 'invalid_amount'});

const dueAt = new Date('2026-01-08T00:00:00Z');
const defaultAt = new Date('2026-01-15T00:00:00Z');
assert.equal(getLoanStatus('active', dueAt, defaultAt, new Date('2026-01-07T23:59:59Z')), 'active');
assert.equal(getLoanStatus('active', dueAt, defaultAt, dueAt), 'overdue');
assert.equal(getLoanStatus('overdue', dueAt, defaultAt, defaultAt), 'defaulted');
assert.equal(getLoanStatus('paid', dueAt, defaultAt, defaultAt), 'paid');

assert.deepEqual(parseCustodyArguments(['50']), {resource: 'limite', amount: 50});
assert.deepEqual(parseCustodyArguments(['all']), {resource: 'limite', amount: 'all'});
assert.deepEqual(parseCustodyArguments(['coins', '500']), {resource: 'coins', amount: 500});
assert.deepEqual(parseCustodyArguments(['botcoin', 'all']), {resource: 'botcoin', amount: 'all'});
assert.equal(parseCustodyArguments(['exp', '20']), null);

assert.equal(bankPlugin.private, true);
assert.equal(depositPlugin.private, true);
assert.equal(withdrawPlugin.private, true);
assert.equal(loanPlugin.private, true);
assert.equal(reservePlugin.private, true);
assert.equal(exchangePlugin.private, true);
assert.equal(buyPlugin.private, true);
for (const plugin of [bankPlugin, depositPlugin, withdrawPlugin, loanPlugin, exchangePlugin, buyPlugin, walletPlugin, transferPlugin]) {
    assert.deepEqual(plugin.tags, ['economy']);
    assert.equal(plugin.feature, 'rpg');
}
assert.deepEqual(reservePlugin.tags, ['owner']);
assert.deepEqual(addExpPlugin.tags, ['owner']);
assert.equal(addExpPlugin.owner, true);
assert.ok(economyMenu.command instanceof RegExp && economyMenu.command.test('menueconomia'));
assert.ok(rpgMenu.command instanceof RegExp && rpgMenu.command.test('menurpg'));
assert.equal(rpgMenu.command instanceof RegExp && rpgMenu.command.test('menueconomia'), false);
assert.deepEqual(bankPlugin.command, ['bank']);
assert.deepEqual(depositPlugin.command, [...DEPOSIT_COMMANDS]);
assert.deepEqual(withdrawPlugin.command, [...WITHDRAW_COMMANDS]);
for (const command of ['bank', ...DEPOSIT_COMMANDS, ...WITHDRAW_COMMANDS, 'loan', 'bankreserve', 'buy', 'buyall', 'exchange']) {
    assert.equal(isPrivateCommandAllowed(command), true, `${command} must bypass anti_private`);
}

for (const table of [userBankAccounts, bankReserves, bankExchangeRates, bankLoans, bankTransactions, bankLoanPayments]) {
    assert.ok(Object.keys(getTableColumns(table)).length > 0);
}
assert.equal('banco' in getTableColumns(usuarios), false);
assert.ok(getTableColumns(walletTransactions).operationId);
assert.equal(getTableColumns(userWallets).botcoin.default, 0);
assert.equal(getTableColumns(userWallets).zyxcoin.default, 0);

const migration = readFileSync('src/db/migrations/0032_bank_system.sql', 'utf8');
assert.match(migration, /CREATE TABLE "user_bank_accounts"/);
assert.match(migration, /CREATE TABLE "bank_reserves"/);
assert.match(migration, /CREATE TABLE "bank_loans"/);
assert.match(migration, /CREATE TABLE "bank_loan_payments"/);
assert.match(migration, /'limite', 0\), \('coins', 0\), \('botcoin', 0\), \('zyxcoin', 0\)/);
assert.match(migration, /ALTER TABLE "usuarios" DROP COLUMN "banco"/);
const exchangeMigration = readFileSync('src/db/migrations/0033_bank_exchange_rates.sql', 'utf8');
assert.match(exchangeMigration, /\('exp', 'limite', 1000, 1\)/);
assert.match(exchangeMigration, /\('coins', 'limite', 10, 1\)/);
assert.match(exchangeMigration, /\('limite', 'botcoin', 10, 1\)/);
assert.match(exchangeMigration, /\('limite', 'zyxcoin', 100, 1\)/);
assert.match(exchangeMigration, /10000000000::bigint/g);
assert.match(exchangeMigration, /1000000000::bigint/);
assert.match(exchangeMigration, /1000000::bigint/);
assert.match(exchangeMigration, /initial_capitalization/);

const repositorySource = readFileSync('src/adapters/drizzle/bank.repository.ts', 'utf8');
assert.match(repositorySource, /for\('update'\)/);
assert.match(repositorySource, /reason: 'loan_disbursement'/);
assert.match(repositorySource, /reason: 'loan_payment'/);
assert.match(repositorySource, /reason: 'currency_exchange'/);
assert.match(repositorySource, /type: 'currency_exchange_in'/);
assert.match(repositorySource, /type: 'currency_exchange_out'/);
const custodyMethod = repositorySource.slice(
    repositorySource.indexOf('async transferCustody'),
    repositorySource.indexOf('async getReserves'),
);
assert.doesNotMatch(custodyMethod, /bankReserves/);

const walletPluginSource = readFileSync('src/plugins/economy/economy-wallet.ts', 'utf8');
assert.match(walletPluginSource, /isGroup \? undefined : await getBankOverview/);

const messageManifest = JSON.parse(readFileSync('resources/data/messages.json', 'utf8')) as {
    pluginMessages: {economy: Record<string, unknown>; rpg: Record<string, unknown>; owner: Record<string, unknown>};
};
for (const namespace of ['wallet', 'bank', 'loan', 'buy', 'exchange', 'transfer', 'adminAdd', 'bankReserve']) {
    assert.ok(namespace in messageManifest.pluginMessages.economy, `missing economy.${namespace}`);
}
for (const namespace of ['wallet', 'bank', 'loan', 'exchange', 'shop', 'transfer', 'adminAdd']) {
    assert.equal(namespace in messageManifest.pluginMessages.rpg, false, `legacy rpg.${namespace} remains`);
}
assert.equal('bankReserve' in messageManifest.pluginMessages.owner, false);

console.log('bank-system.test.ts OK');
