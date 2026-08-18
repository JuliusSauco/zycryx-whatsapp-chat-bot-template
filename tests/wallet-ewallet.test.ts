import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getTableColumns} from 'drizzle-orm';
import {
    accountBalances, economyResources, financialAccounts, financialOperations, ledgerEntries, usuarios,
} from '../src/db/schema.js';
import type {UserWallet} from '../src/domain/users.js';
import balancePlugin, {buildWalletMessage, WALLET_COMMANDS} from '../src/plugins/economy/economy-wallet.js';
import {before as antiPrivateBefore, isPrivateCommandAllowed} from '../src/plugins/hooks/_antiprivado.js';
import type {BeforePluginContext} from '../src/types/context.js';
import type {BotMessage} from '../src/types/message.js';
import {
    isTransferableWalletResource,
    isWalletResource,
    TRANSFERABLE_WALLET_RESOURCES,
    WALLET_RESOURCES,
    transferWalletResource,
} from '../src/services/wallet.service.js';
import {configureServiceRepositories, repositories} from '../src/services/data-source.js';
import {createDrizzleRepositories} from '../src/adapters/drizzle/repositories.js';

configureServiceRepositories(createDrizzleRepositories());
import {isEconomyInfoRequest} from '../src/plugins/economy/economy-info.helpers.js';
import {formatTransferDate, isTransferHistoryRequest, parseHistoryPage} from '../src/plugins/economy/economy-transfer.js';

const userColumns = getTableColumns(usuarios);
const accountColumns = getTableColumns(financialAccounts);
const balanceColumns = getTableColumns(accountBalances);
const operationColumns = getTableColumns(financialOperations);
const ledgerColumns = getTableColumns(ledgerEntries);

assert.deepEqual(WALLET_RESOURCES, ['limite', 'exp', 'coins', 'botcoin', 'zyxcoin']);
assert.deepEqual(TRANSFERABLE_WALLET_RESOURCES, ['limite', 'exp', 'coins']);
assert.equal(isWalletResource('money'), false);
assert.equal(isWalletResource('botcoin'), true);
assert.equal(isTransferableWalletResource('botcoin'), false);
assert.equal(isTransferableWalletResource('coins'), true);
assert.equal(isEconomyInfoRequest(['--info']), true);
assert.equal(isEconomyInfoRequest(['help']), true);
assert.equal(isEconomyInfoRequest(['ayuda']), true);
assert.equal(isEconomyInfoRequest(['info']), false, 'plain info must remain available to loan and exchange');
assert.equal(isTransferHistoryRequest(['history']), true);
assert.equal(isTransferHistoryRequest(['historial']), true);
assert.equal(parseHistoryPage(undefined), 1);
assert.equal(parseHistoryPage('2'), 2);
assert.equal(parseHistoryPage('0'), null);
assert.match(formatTransferDate(new Date('2026-01-01T05:00:00Z')), /1\/01\/26/);

assert.equal('money' in userColumns, false);
assert.equal('limite' in userColumns, false);
assert.equal('exp' in userColumns, false);
assert.equal('banco' in userColumns, false);
assert.ok(getTableColumns(economyResources).code);
assert.ok(accountColumns.accountType);
assert.ok(balanceColumns.resourceCode);
assert.ok(balanceColumns.balance);
assert.ok(operationColumns.reason);
assert.ok(ledgerColumns.balanceAfter);
assert.equal(balancePlugin.private, true, 'wallet balances must only be visible in private chats');
assert.deepEqual(WALLET_COMMANDS, ['wallet', 'ewallet', 'balance', 'bal', 'diamantes', 'diamond']);
assert.deepEqual(balancePlugin.command, [...WALLET_COMMANDS]);

const wallet: UserWallet = {
    id: 'user@s.whatsapp.net', nombre: 'User', limite: 12, exp: 345, coins: 678,
    botcoin: 9, zyxcoin: 2, level: 7, role: 'PRO', wait: 0,
    lastclaim: 0, dailystreak: 0, lastcofre: 0, lastmiming: 0, lastwork: 0,
    crime: 0, lastrob: 0, lastslut: 0, timevot: 0, ryTime: 0,
};
const publicMessage = buildWalletMessage(wallet, wallet.id, '.', true);
assert.equal(publicMessage.key, 'economy.wallet.public');
assert.deepEqual(publicMessage.values, {user: 'user', level: 7, exp: 345, diamonds: 12});
for (const privateKey of ['coins', 'botcoin', 'zyxcoin', 'bank']) {
    assert.equal(privateKey in publicMessage.values, false, `${privateKey} leaked into public values`);
}
const privateMessage = buildWalletMessage(wallet, wallet.id, '.', false, {
    balances: {limite: 4, coins: 30, botcoin: 2, zyxcoin: 1}, loan: null,
});
assert.equal(privateMessage.key, 'economy.wallet.private');
assert.deepEqual(privateMessage.values, {
    user: 'user', level: 7, exp: 345, diamonds: 12,
    coins: 678, botcoin: 9, zyxcoin: 2,
    bankLimit: 4, bankCoins: 30, bankBotcoin: 2, bankZyxcoin: 1,
    loanBlock: '\n\n✅ _Sin préstamos pendientes._', prefix: '.',
});

for (const alias of WALLET_COMMANDS) {
    assert.equal(isPrivateCommandAllowed(alias), true, `${alias} must bypass anti_private`);
    const result = await antiPrivateBefore({
        sender: wallet.id,
        originalText: `.${alias}`,
        text: `.${alias}`,
        isGroup: false,
        fromMe: false,
    } as BotMessage, {
        isOwner: false,
        botConfig: {anti_private: true, prefix: ['.']},
    } as BeforePluginContext);
    assert.equal(result, undefined, `${alias} was blocked by anti_private`);
}

const schemaSql = readFileSync('database/schema.sql', 'utf8');
assert.match(schemaSql, /CREATE TABLE "bot_economy"\."financial_accounts"/);
assert.match(schemaSql, /CREATE TABLE "bot_economy"\."account_balances"/);
assert.match(schemaSql, /CREATE TABLE "bot_economy"\."financial_operations"/);
assert.match(schemaSql, /CREATE TABLE "bot_economy"\."ledger_entries"/);
assert.doesNotMatch(schemaSql, /CREATE TABLE .*user_wallets/);
assert.doesNotMatch(schemaSql, /CREATE TABLE .*user_bank_accounts/);

const messages = readFileSync('resources/data/messages.json', 'utf8');
assert.doesNotMatch(messages, /LoliCoins?/i);
assert.match(messages, /\{coins\}/);
assert.match(messages, /\{botcoin\}/);
assert.match(messages, /\{zyxcoin\}/);
assert.doesNotMatch(messages, /moneyRanking|bankRanking/);
assert.doesNotMatch(messages, /EWALLET/);
assert.doesNotMatch(messages, /\*\.balance\*/);
assert.match(messages, /E - WALLET PÚBLICA/);
assert.match(messages, /E - WALLET/);
assert.match(messages, /comando \*\.wallet\*/);
const messageManifest = JSON.parse(messages) as {pluginMessages: {economy: Record<string, Record<string, unknown>>}};
for (const namespace of ['wallet', 'bank', 'deposit', 'withdraw', 'loan', 'buy', 'exchange', 'transfer']) {
    assert.ok(messageManifest.pluginMessages.economy[namespace]?.guide, `missing guide economy.${namespace}.guide`);
}
assert.ok(messageManifest.pluginMessages.economy.transfer?.history);

const commandCatalog = JSON.parse(readFileSync('resources/data/commands.json', 'utf8')) as {
    commands: Record<string, {aliases?: string[]}>;
};
assert.ok(commandCatalog.commands.wallet);
assert.deepEqual(commandCatalog.commands.wallet.aliases, ['ewallet', 'balance', 'bal', 'diamantes', 'diamond']);
assert.equal(commandCatalog.commands.bal, undefined);
for (const command of ['wallet', 'bank', 'deposit', 'withdraw', 'loan', 'buy', 'exchange', 'transfer']) {
    assert.match(JSON.stringify(commandCatalog.commands[command]), /--info/, `${command} must document --info`);
}

const pluginSource = readFileSync('src/plugins/economy/economy-wallet.ts', 'utf8');
assert.doesNotMatch(pluginSource, /mentionedJid|m\.quoted/, 'wallet must ignore mentions and quoted users');

const repositorySource = readFileSync('src/adapters/drizzle/user-wallet.repository.ts', 'utf8');
assert.match(repositorySource, /eq\(financialOperations\.reason, 'transfer'\)/);
assert.match(repositorySource, /orderBy\(desc\(ledgerEntries\.createdAt\), desc\(ledgerEntries\.id\)\)/);
assert.match(repositorySource, /externalId, actorId: from, counterpartyId: to/);
const transferPluginSource = readFileSync('src/plugins/economy/economy-transfer.ts', 'utf8');
assert.match(transferPluginSource, /if \(isGroup\).*historyPrivate/);
assert.match(transferPluginSource, /listWalletTransferHistory\(m\.sender, page\)/);
assert.doesNotMatch(transferPluginSource.slice(
    transferPluginSource.indexOf('if (isTransferHistoryRequest'),
    transferPluginSource.indexOf('if (confirmations.get'),
), /mentionedJid|m\.quoted/);

const originalUsers = repositories.users;
let capturedOperationId = '';
repositories.users = {
    ...originalUsers,
    async transferWalletResource(input) {
        capturedOperationId = input.operationId;
        return true;
    },
};
try {
    assert.equal(await transferWalletResource({from: 'a', to: 'b', resource: 'coins', amount: 5}), true);
    assert.match(capturedOperationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
} finally {
    repositories.users = originalUsers;
}

console.log('wallet-ewallet.test.ts OK');
