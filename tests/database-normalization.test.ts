import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const schemaSource = readFileSync('src/db/schema.ts', 'utf8');
const ensureSchemaSource = readFileSync('src/db/ensure-schema.ts', 'utf8');
const sql = readFileSync('database/schema.sql', 'utf8');
const expectedSchemas = [
    'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
    'bot_content', 'bot_ai', 'bot_audit', 'bot_security', 'bot_sessions',
];

for (const schema of expectedSchemas) {
    assert.match(schemaSource, new RegExp(`pgSchema\\('${schema}'\\)`));
    assert.match(sql, new RegExp(`CREATE SCHEMA "${schema}"`));
    assert.match(sql, new RegExp(`COMMENT ON SCHEMA ${schema}`));
}

for (const table of [
    'user_identities', 'user_profiles', 'user_registrations', 'user_warnings',
    'resources', 'financial_accounts', 'account_balances', 'financial_operations', 'ledger_entries',
    'store_products', 'user_product_subscriptions', 'subscription_charge_events', 'user_product_entitlements',
    'roleplay_roles', 'roleplay_sessions', 'roleplay_contracts', 'roleplay_charge_events', 'roleplay_action_messages',
    'raffles', 'raffle_tickets', 'raffle_entries',
    'group_moderation_settings', 'group_greetings', 'group_command_access_rules',
    'group_daily_reminder_settings', 'group_daily_reminder_deliveries',
    'subbot_prefixes', 'subbot_owners', 'bot_chat_memberships',
    'character_ownerships', 'character_price_events', 'character_market_listings',
    'chat_memory_messages', 'audio_response_assets', 'encryption_key_versions',
    'encrypted_secrets', 'auth_sessions', 'auth_credentials', 'signal_keys',
]) {
    assert.match(sql, new RegExp(`CREATE TABLE "[^"]+"\\."${table}"`), `missing normalized table ${table}`);
}

for (const legacyTable of [
    'usuarios', 'user_wallets', 'wallet_transactions', 'user_bank_accounts',
    'bank_reserves', 'bank_transactions',
]) {
    assert.doesNotMatch(sql, new RegExp(`CREATE TABLE (?:"[^"]+"\\.)?"?${legacyTable}"?`));
}

assert.match(sql, /server_version_num'[)]?::integer < 180000/);
assert.match(sql, /DEFAULT uuidv7\(\)/);
assert.match(sql, /GENERATED ALWAYS AS .* STORED/);
assert.match(sql, /valid_during WITHOUT OVERLAPS/);
assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
assert.match(sql, /REVOKE ALL ON SCHEMA/);
assert.match(sql, /bootstrap:reserve-capitalization/);
assert.match(sql, /'zyxcoin'.*100000.*false.*false/s);
assert.doesNotMatch(schemaSource, /\bjsonb\s*\(/i);
assert.doesNotMatch(schemaSource, /\.array\s*\(\)/i);
assert.doesNotMatch(schemaSource, /serial\s*\(/i);
assert.doesNotMatch(sql, /CREATE TABLE "bot_runtime"\."api_tokens"/);
assert.match(schemaSource, /nationality: text\('nationality'\)/);
assert.match(schemaSource, /botIdentitySchema\.enum\('profile_gender'/);
assert.match(schemaSource, /'Masculino', 'Femenino', 'No Binario', 'Otro'/);
assert.match(schemaSource, /user_profiles_nationality_check/);
assert.match(sql, /"nationality" text/);
assert.match(sql, /CREATE TYPE "bot_identity"\."profile_gender" AS ENUM\('Masculino', 'Femenino', 'No Binario', 'Otro'\)/);
assert.match(sql, /"gender" "bot_identity"\."profile_gender"/);
assert.doesNotMatch(sql, /user_profiles_gender_check/);
assert.match(sql, /user_profiles_birthday_check/);
assert.match(ensureSchemaSource, /bot_identity\.user_profiles\.nationality/);
assert.match(ensureSchemaSource, /REQUIRED_PROFILE_GENDERS/);
assert.doesNotMatch(sql, /"token_b64"/);
assert.match(sql, /"ciphertext" bytea NOT NULL/);
assert.match(sql, /"auth_tag" bytea NOT NULL/);

console.log('database-normalization.test.ts OK');
