-- Zycryx WhatsApp Bot - fresh database bootstrap
-- Target: Supabase PostgreSQL 18+. This script is intentionally not a migration.
-- Run once from the Supabase SQL editor or with: npm run db:setup

BEGIN;

DO $$
BEGIN
    IF current_setting('server_version_num')::integer < 180000 THEN
        RAISE EXCEPTION 'PostgreSQL 18 or newer is required. Server version: %', version();
    END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE SCHEMA "bot_ai";

CREATE SCHEMA "bot_audit";

CREATE SCHEMA "bot_content";

CREATE SCHEMA "bot_economy";

CREATE SCHEMA "bot_groups";

CREATE SCHEMA "bot_identity";

CREATE SCHEMA "bot_runtime";

CREATE TABLE "bot_economy"."account_balances" (
	"account_id" uuid NOT NULL,
	"resource_code" text NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_balances_account_id_resource_code_pk" PRIMARY KEY("account_id","resource_code"),
	CONSTRAINT "account_balances_non_negative" CHECK ("bot_economy"."account_balances"."balance" >= 0)
);

CREATE TABLE "bot_runtime"."api_tokens" (
	"name" text PRIMARY KEY NOT NULL,
	"token_b64" text NOT NULL
);

CREATE TABLE "bot_content"."audio_response_assets" (
	"response_id" uuid NOT NULL,
	"media_url" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "audio_response_assets_response_id_media_url_pk" PRIMARY KEY("response_id","media_url"),
	CONSTRAINT "audio_response_assets_position_non_negative" CHECK ("bot_content"."audio_response_assets"."position" >= 0)
);

CREATE TABLE "bot_content"."audio_responses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"scope" text NOT NULL,
	"phrase" text NOT NULL,
	"regex" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_economy"."bank_exchange_rates" (
	"source_resource" text NOT NULL,
	"target_resource" text NOT NULL,
	"source_amount" integer NOT NULL,
	"target_amount" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_exchange_rates_source_resource_target_resource_pk" PRIMARY KEY("source_resource","target_resource"),
	CONSTRAINT "bank_exchange_rates_amount_check" CHECK ("bot_economy"."bank_exchange_rates"."source_amount" > 0 and "bot_economy"."bank_exchange_rates"."target_amount" > 0),
	CONSTRAINT "bank_exchange_rates_pair_check" CHECK ("bot_economy"."bank_exchange_rates"."source_resource" <> "bot_economy"."bank_exchange_rates"."target_resource")
);

CREATE TABLE "bot_economy"."bank_loan_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_economy"."bank_loan_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"loan_id" bigint NOT NULL,
	"amount" integer NOT NULL,
	"principal_paid" integer NOT NULL,
	"interest_paid" integer NOT NULL,
	"wallet_ledger_entry_id" bigint NOT NULL,
	"reserve_ledger_entry_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_loan_payments_amount_check" CHECK ("bot_economy"."bank_loan_payments"."amount" > 0 and "bot_economy"."bank_loan_payments"."principal_paid" >= 0 and "bot_economy"."bank_loan_payments"."interest_paid" >= 0 and "bot_economy"."bank_loan_payments"."amount" = "bot_economy"."bank_loan_payments"."principal_paid" + "bot_economy"."bank_loan_payments"."interest_paid")
);

CREATE TABLE "bot_economy"."bank_loans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_economy"."bank_loans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"principal" integer NOT NULL,
	"interest_amount" integer NOT NULL,
	"principal_outstanding" integer NOT NULL,
	"interest_outstanding" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"default_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_loans_status_check" CHECK ("bot_economy"."bank_loans"."status" in ('active', 'overdue', 'defaulted', 'paid')),
	CONSTRAINT "bank_loans_amounts_check" CHECK ("bot_economy"."bank_loans"."principal" > 0 and "bot_economy"."bank_loans"."interest_amount" >= 0 and "bot_economy"."bank_loans"."principal_outstanding" between 0 and "bot_economy"."bank_loans"."principal" and "bot_economy"."bank_loans"."interest_outstanding" between 0 and "bot_economy"."bank_loans"."interest_amount"),
	CONSTRAINT "bank_loans_paid_check" CHECK ("bot_economy"."bank_loans"."status" <> 'paid' or ("bot_economy"."bank_loans"."principal_outstanding" = 0 and "bot_economy"."bank_loans"."interest_outstanding" = 0))
);

CREATE TABLE "bot_runtime"."bot_chat_memberships" (
	"bot_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"joined" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_chat_memberships_bot_id_chat_id_pk" PRIMARY KEY("bot_id","chat_id"),
	CONSTRAINT "bot_chat_memberships_state_check" CHECK (("bot_runtime"."bot_chat_memberships"."joined" AND "bot_runtime"."bot_chat_memberships"."left_at" IS NULL) OR (NOT "bot_runtime"."bot_chat_memberships"."joined" AND "bot_runtime"."bot_chat_memberships"."left_at" IS NOT NULL))
);

CREATE TABLE "bot_content"."character_market_listings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"character_id" integer NOT NULL,
	"seller_id" text NOT NULL,
	"buyer_id" text,
	"asking_price" integer NOT NULL,
	"previous_price" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"listed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "character_market_listings_price_positive" CHECK ("bot_content"."character_market_listings"."asking_price" > 0),
	CONSTRAINT "character_market_listings_status_check" CHECK ("bot_content"."character_market_listings"."status" in ('active', 'withdrawn', 'sold')),
	CONSTRAINT "character_market_listings_closed_state_check" CHECK (("bot_content"."character_market_listings"."status" = 'active' AND "bot_content"."character_market_listings"."closed_at" IS NULL) OR ("bot_content"."character_market_listings"."status" <> 'active' AND "bot_content"."character_market_listings"."closed_at" IS NOT NULL))
);

CREATE TABLE "bot_content"."character_ownerships" (
	"character_id" integer PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_content"."character_price_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"character_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"price" integer NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_price_events_type_check" CHECK ("bot_content"."character_price_events"."event_type" in ('initial', 'vote', 'listing', 'sale', 'adjustment')),
	CONSTRAINT "character_price_events_price_non_negative" CHECK ("bot_content"."character_price_events"."price" >= 0)
);

CREATE TABLE "bot_content"."characters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_content"."characters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"url" text NOT NULL,
	"tipo" text,
	"anime" text,
	"rareza" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_ai"."chat_memory" (
	"chat_id" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_ai"."chat_memory_messages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"chat_id" text NOT NULL,
	"position" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_memory_messages_position_non_negative" CHECK ("bot_ai"."chat_memory_messages"."position" >= 0),
	CONSTRAINT "chat_memory_messages_role_check" CHECK ("bot_ai"."chat_memory_messages"."role" in ('system', 'user', 'assistant'))
);

CREATE TABLE "bot_groups"."chats" (
	"id" text PRIMARY KEY NOT NULL,
	"is_group" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_economy"."command_reservation_items" (
	"reservation_id" text NOT NULL,
	"resource_code" text NOT NULL,
	"item_type" text DEFAULT 'charged' NOT NULL,
	"amount" bigint NOT NULL,
	CONSTRAINT "command_reservation_items_pk" PRIMARY KEY("reservation_id","resource_code","item_type"),
	CONSTRAINT "command_reservation_items_amount_positive" CHECK ("bot_economy"."command_reservation_items"."amount" > 0),
	CONSTRAINT "command_reservation_items_type_check" CHECK ("bot_economy"."command_reservation_items"."item_type" in ('charged', 'alternative'))
);

CREATE TABLE "bot_economy"."command_resource_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"message_id" text NOT NULL,
	"payment_resource" text DEFAULT 'none' NOT NULL,
	"required_level" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "command_resource_reservations_payment_resource_check" CHECK ("bot_economy"."command_resource_reservations"."payment_resource" in ('limite', 'coins', 'mixed', 'none')),
	CONSTRAINT "command_resource_reservations_status_check" CHECK ("bot_economy"."command_resource_reservations"."status" in ('pending', 'committed', 'released')),
	CONSTRAINT "command_resource_reservations_level_non_negative" CHECK ("bot_economy"."command_resource_reservations"."required_level" >= 0),
	CONSTRAINT "command_resource_reservations_release_state_check" CHECK (("bot_economy"."command_resource_reservations"."status" = 'released' AND "bot_economy"."command_resource_reservations"."release_reason" IS NOT NULL) OR ("bot_economy"."command_resource_reservations"."status" <> 'released' AND "bot_economy"."command_resource_reservations"."release_reason" IS NULL))
);

CREATE TABLE "bot_economy"."resources" (
	"code" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"default_wallet_balance" bigint DEFAULT 0 NOT NULL,
	"wallet_enabled" boolean DEFAULT true NOT NULL,
	"bank_enabled" boolean DEFAULT false NOT NULL,
	"transferable" boolean DEFAULT false NOT NULL,
	CONSTRAINT "resources_category_check" CHECK ("bot_economy"."resources"."category" in ('currency', 'experience', 'quota')),
	CONSTRAINT "resources_default_non_negative" CHECK ("bot_economy"."resources"."default_wallet_balance" >= 0)
);

CREATE TABLE "bot_economy"."financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text,
	"account_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_accounts_type_check" CHECK ("bot_economy"."financial_accounts"."account_type" in ('wallet', 'bank', 'reserve')),
	CONSTRAINT "financial_accounts_status_check" CHECK ("bot_economy"."financial_accounts"."status" in ('active', 'frozen', 'closed')),
	CONSTRAINT "financial_accounts_owner_check" CHECK (("bot_economy"."financial_accounts"."account_type" = 'reserve' AND "bot_economy"."financial_accounts"."user_id" IS NULL) OR ("bot_economy"."financial_accounts"."account_type" <> 'reserve' AND "bot_economy"."financial_accounts"."user_id" IS NOT NULL))
);

CREATE TABLE "bot_economy"."financial_operations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"external_id" text,
	"reason" text NOT NULL,
	"operation" text,
	"actor_id" text,
	"counterparty_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_operations_external_id_unique" UNIQUE("external_id")
);

CREATE TABLE "bot_groups"."group_autoresponder_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"access_mode" text DEFAULT 'all' NOT NULL,
	"trigger" text DEFAULT 'mention' NOT NULL,
	"prompt" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_autoresponder_access_mode_check" CHECK ("bot_groups"."group_autoresponder_settings"."access_mode" in ('all', 'admin', 'superadmin', 'owner')),
	CONSTRAINT "group_autoresponder_trigger_check" CHECK ("bot_groups"."group_autoresponder_settings"."trigger" in ('mention', 'all'))
);

CREATE TABLE "bot_groups"."group_censored_users" (
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"censored_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_censored_users_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);

CREATE TABLE "bot_groups"."group_command_access_rules" (
	"group_id" text NOT NULL,
	"scope" text NOT NULL,
	"target" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"access_mode" text DEFAULT 'all' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_command_access_rules_group_id_scope_target_pk" PRIMARY KEY("group_id","scope","target"),
	CONSTRAINT "group_command_access_rules_scope_check" CHECK ("bot_groups"."group_command_access_rules"."scope" in ('family', 'command')),
	CONSTRAINT "group_command_access_rules_access_mode_check" CHECK ("bot_groups"."group_command_access_rules"."access_mode" in ('all', 'admin', 'superadmin', 'owner'))
);

CREATE TABLE "bot_groups"."group_greetings" (
	"group_id" text NOT NULL,
	"event_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"message_template" text,
	"photo_enabled" boolean DEFAULT true NOT NULL,
	"hidetag_mode" text DEFAULT 'off' NOT NULL,
	"use_group_photo" boolean DEFAULT false NOT NULL,
	"registered_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_greetings_group_id_event_type_pk" PRIMARY KEY("group_id","event_type"),
	CONSTRAINT "group_greetings_event_type_check" CHECK ("bot_groups"."group_greetings"."event_type" in ('welcome', 'bye', 'promote', 'demote')),
	CONSTRAINT "group_greetings_hidetag_mode_check" CHECK ("bot_groups"."group_greetings"."hidetag_mode" in ('off', 'admin', 'all'))
);

CREATE TABLE "bot_groups"."group_memory_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"ttl_seconds" integer DEFAULT 86400 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_memory_settings_ttl_non_negative" CHECK ("bot_groups"."group_memory_settings"."ttl_seconds" >= 0)
);

CREATE TABLE "bot_groups"."group_moderation_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"detect" boolean DEFAULT true NOT NULL,
	"antifake" boolean DEFAULT false NOT NULL,
	"antilink" boolean DEFAULT false NOT NULL,
	"antilink2" boolean DEFAULT false NOT NULL,
	"virustotal" boolean DEFAULT false NOT NULL,
	"antistatus" boolean DEFAULT false NOT NULL,
	"antiporn" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_groups"."group_nsfw_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"schedule" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_groups"."group_rpg_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"auto_level_up" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_groups"."group_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"primary_bot" text,
	"autoaccept_mode" text DEFAULT 'off' NOT NULL,
	"bot_access_mode" text DEFAULT 'all' NOT NULL,
	"message_logging" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_settings_autoaccept_mode_check" CHECK ("bot_groups"."group_settings"."autoaccept_mode" in ('off', 'on', 'on_hidetag_admin', 'on_hidetag_all', 'off_hidetag_admin', 'off_hidetag_all')),
	CONSTRAINT "group_settings_bot_access_mode_check" CHECK ("bot_groups"."group_settings"."bot_access_mode" in ('all', 'admin', 'superadmin', 'owner'))
);

CREATE TABLE "bot_economy"."ledger_entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_economy"."ledger_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"operation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"resource_code" text NOT NULL,
	"amount" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_balance_non_negative" CHECK ("bot_economy"."ledger_entries"."balance_after" >= 0),
	CONSTRAINT "ledger_entries_amount_non_zero" CHECK ("bot_economy"."ledger_entries"."amount" <> 0)
);

CREATE TABLE "bot_identity"."marriage_members" (
	"marriage_id" uuid NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL
);

CREATE TABLE "bot_identity"."marriage_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"requester_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"valid_during" "tstzrange" GENERATED ALWAYS AS (tstzrange("created_at", COALESCE("resolved_at", 'infinity'::timestamptz), '[)')) STORED,
	CONSTRAINT "marriage_requests_status_check" CHECK ("bot_identity"."marriage_requests"."status" in ('pending', 'accepted', 'rejected', 'cancelled')),
	CONSTRAINT "marriage_requests_different_users" CHECK ("bot_identity"."marriage_requests"."requester_id" <> "bot_identity"."marriage_requests"."recipient_id")
);

CREATE TABLE "bot_identity"."marriages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_audit"."message_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	"message_text" text NOT NULL,
	"message_type" text NOT NULL,
	"is_reply" boolean DEFAULT false NOT NULL,
	"reply_to_message_id" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_groups"."user_group_activity_counters" (
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_group_activity_counters_user_id_group_id_pk" PRIMARY KEY("user_id","group_id"),
	CONSTRAINT "user_group_activity_count_non_negative" CHECK ("bot_groups"."user_group_activity_counters"."message_count" >= 0)
);

CREATE TABLE "bot_runtime"."reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bot_runtime"."reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sender_id" text NOT NULL,
	"sender_name" text,
	"mensaje" text NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado" boolean DEFAULT false NOT NULL,
	"tipo" text DEFAULT 'reporte' NOT NULL
);

CREATE TABLE "bot_runtime"."stats" (
	"command" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stats_count_non_negative" CHECK ("bot_runtime"."stats"."count" >= 0)
);

CREATE TABLE "bot_runtime"."subbot_owners" (
	"bot_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "subbot_owners_bot_id_owner_id_pk" PRIMARY KEY("bot_id","owner_id"),
	CONSTRAINT "subbot_owners_position_non_negative" CHECK ("bot_runtime"."subbot_owners"."position" >= 0)
);

CREATE TABLE "bot_runtime"."subbot_prefixes" (
	"bot_id" text NOT NULL,
	"prefix" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "subbot_prefixes_bot_id_prefix_pk" PRIMARY KEY("bot_id","prefix"),
	CONSTRAINT "subbot_prefixes_position_non_negative" CHECK ("bot_runtime"."subbot_prefixes"."position" >= 0)
);

CREATE TABLE "bot_runtime"."subbots" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text DEFAULT 'null' NOT NULL,
	"name" text,
	"logo_url" text,
	"mode" text DEFAULT 'public' NOT NULL,
	"anti_private" boolean DEFAULT false NOT NULL,
	"anti_call" boolean DEFAULT true NOT NULL,
	"privacy" boolean DEFAULT false NOT NULL,
	"prestar" boolean DEFAULT false NOT NULL,
	CONSTRAINT "subbots_mode_check" CHECK ("bot_runtime"."subbots"."mode" in ('public', 'private'))
);

CREATE TABLE "bot_identity"."user_bans" (
	"user_id" text PRIMARY KEY NOT NULL,
	"reason" text,
	"notice_count" integer DEFAULT 0 NOT NULL,
	"banned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_bans_notice_non_negative" CHECK ("bot_identity"."user_bans"."notice_count" >= 0)
);

CREATE TABLE "bot_identity"."user_cooldowns" (
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"last_used_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_cooldowns_user_id_action_pk" PRIMARY KEY("user_id","action")
);

CREATE TABLE "bot_identity"."user_daily_rewards" (
	"user_id" text PRIMARY KEY NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_daily_rewards_streak_non_negative" CHECK ("bot_identity"."user_daily_rewards"."streak" >= 0)
);

CREATE TABLE "bot_groups"."user_group_roles" (
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"role_description" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_group_roles_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);

CREATE TABLE "bot_identity"."user_identities" (
	"user_id" text NOT NULL,
	"identity_type" text NOT NULL,
	"identity_value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_user_id_identity_type_pk" PRIMARY KEY("user_id","identity_type"),
	CONSTRAINT "user_identities_type_check" CHECK ("bot_identity"."user_identities"."identity_type" in ('phone', 'lid', 'username'))
);

CREATE TABLE "bot_identity"."user_private_chat_states" (
	"user_id" text PRIMARY KEY NOT NULL,
	"warned" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_identity"."user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"gender" text,
	"birthday" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_identity"."user_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"role" text DEFAULT 'novato' NOT NULL,
	"role_description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_progress_level_non_negative" CHECK ("bot_identity"."user_progress"."level" >= 0)
);

CREATE TABLE "bot_identity"."user_registrations" (
	"user_id" text PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_registrations_serial_number_unique" UNIQUE("serial_number")
);

CREATE TABLE "bot_identity"."user_robbery_states" (
	"user_id" text PRIMARY KEY NOT NULL,
	"activity_day" date,
	"daily_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_robbery_states_count_non_negative" CHECK ("bot_identity"."user_robbery_states"."daily_count" >= 0)
);

CREATE TABLE "bot_identity"."user_sticker_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"packname" text NOT NULL,
	"author" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bot_identity"."user_warnings" (
	"user_id" text NOT NULL,
	"warning_type" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_warnings_user_id_warning_type_pk" PRIMARY KEY("user_id","warning_type"),
	CONSTRAINT "user_warnings_count_non_negative" CHECK ("bot_identity"."user_warnings"."count" >= 0),
	CONSTRAINT "user_warnings_type_check" CHECK ("bot_identity"."user_warnings"."warning_type" in ('general', 'antiporn', 'status'))
);

CREATE TABLE "bot_identity"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "bot_economy"."account_balances" ADD CONSTRAINT "account_balances_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "bot_economy"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."account_balances" ADD CONSTRAINT "account_balances_resource_code_resources_code_fk" FOREIGN KEY ("resource_code") REFERENCES "bot_economy"."resources"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "bot_content"."audio_response_assets" ADD CONSTRAINT "audio_response_assets_response_id_audio_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "bot_content"."audio_responses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."bank_exchange_rates" ADD CONSTRAINT "bank_exchange_rates_source_resource_resources_code_fk" FOREIGN KEY ("source_resource") REFERENCES "bot_economy"."resources"("code") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."bank_exchange_rates" ADD CONSTRAINT "bank_exchange_rates_target_resource_resources_code_fk" FOREIGN KEY ("target_resource") REFERENCES "bot_economy"."resources"("code") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."bank_loan_payments" ADD CONSTRAINT "bank_loan_payments_loan_id_bank_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "bot_economy"."bank_loans"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."bank_loan_payments" ADD CONSTRAINT "bank_loan_payments_wallet_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("wallet_ledger_entry_id") REFERENCES "bot_economy"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bot_economy"."bank_loan_payments" ADD CONSTRAINT "bank_loan_payments_reserve_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("reserve_ledger_entry_id") REFERENCES "bot_economy"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bot_economy"."bank_loans" ADD CONSTRAINT "bank_loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_runtime"."bot_chat_memberships" ADD CONSTRAINT "bot_chat_memberships_bot_id_subbots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "bot_runtime"."subbots"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_runtime"."bot_chat_memberships" ADD CONSTRAINT "bot_chat_memberships_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "bot_groups"."chats"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_content"."character_market_listings" ADD CONSTRAINT "character_market_listings_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "bot_content"."characters"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_content"."character_market_listings" ADD CONSTRAINT "character_market_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "bot_identity"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "bot_content"."character_market_listings" ADD CONSTRAINT "character_market_listings_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_content"."character_ownerships" ADD CONSTRAINT "character_ownerships_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "bot_content"."characters"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_content"."character_ownerships" ADD CONSTRAINT "character_ownerships_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_content"."character_price_events" ADD CONSTRAINT "character_price_events_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "bot_content"."characters"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_content"."character_price_events" ADD CONSTRAINT "character_price_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_ai"."chat_memory_messages" ADD CONSTRAINT "chat_memory_messages_chat_id_chat_memory_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "bot_ai"."chat_memory"("chat_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."command_reservation_items" ADD CONSTRAINT "command_reservation_items_reservation_fk" FOREIGN KEY ("reservation_id") REFERENCES "bot_economy"."command_resource_reservations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."command_reservation_items" ADD CONSTRAINT "command_reservation_items_resource_code_resources_code_fk" FOREIGN KEY ("resource_code") REFERENCES "bot_economy"."resources"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "bot_economy"."command_resource_reservations" ADD CONSTRAINT "command_resource_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."financial_operations" ADD CONSTRAINT "financial_operations_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_economy"."financial_operations" ADD CONSTRAINT "financial_operations_counterparty_id_users_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_groups"."group_autoresponder_settings" ADD CONSTRAINT "group_autoresponder_settings_group_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_censored_users" ADD CONSTRAINT "group_censored_users_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_censored_users" ADD CONSTRAINT "group_censored_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_censored_users" ADD CONSTRAINT "group_censored_users_censored_by_users_id_fk" FOREIGN KEY ("censored_by") REFERENCES "bot_identity"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "bot_groups"."group_command_access_rules" ADD CONSTRAINT "group_command_access_rules_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_greetings" ADD CONSTRAINT "group_greetings_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_greetings" ADD CONSTRAINT "group_greetings_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_groups"."group_memory_settings" ADD CONSTRAINT "group_memory_settings_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_moderation_settings" ADD CONSTRAINT "group_moderation_settings_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_nsfw_settings" ADD CONSTRAINT "group_nsfw_settings_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."group_rpg_settings" ADD CONSTRAINT "group_rpg_settings_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."ledger_entries" ADD CONSTRAINT "ledger_entries_operation_id_financial_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "bot_economy"."financial_operations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_economy"."ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "bot_economy"."financial_accounts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "bot_economy"."ledger_entries" ADD CONSTRAINT "ledger_entries_resource_code_resources_code_fk" FOREIGN KEY ("resource_code") REFERENCES "bot_economy"."resources"("code") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "bot_identity"."marriage_members" ADD CONSTRAINT "marriage_members_marriage_id_marriages_id_fk" FOREIGN KEY ("marriage_id") REFERENCES "bot_identity"."marriages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."marriage_members" ADD CONSTRAINT "marriage_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."marriage_requests" ADD CONSTRAINT "marriage_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."marriage_requests" ADD CONSTRAINT "marriage_requests_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_audit"."message_logs" ADD CONSTRAINT "message_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_audit"."message_logs" ADD CONSTRAINT "message_logs_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_groups"."user_group_activity_counters" ADD CONSTRAINT "user_group_activity_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."user_group_activity_counters" ADD CONSTRAINT "user_group_activity_counters_group_id_chats_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."chats"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_runtime"."reports" ADD CONSTRAINT "reports_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_runtime"."subbot_owners" ADD CONSTRAINT "subbot_owners_bot_id_subbots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "bot_runtime"."subbots"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_runtime"."subbot_owners" ADD CONSTRAINT "subbot_owners_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_runtime"."subbot_prefixes" ADD CONSTRAINT "subbot_prefixes_bot_id_subbots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "bot_runtime"."subbots"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_bans" ADD CONSTRAINT "user_bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_cooldowns" ADD CONSTRAINT "user_cooldowns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_daily_rewards" ADD CONSTRAINT "user_daily_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."user_group_roles" ADD CONSTRAINT "user_group_roles_group_id_group_settings_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "bot_groups"."group_settings"("group_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."user_group_roles" ADD CONSTRAINT "user_group_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_groups"."user_group_roles" ADD CONSTRAINT "user_group_roles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "bot_identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "bot_identity"."user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_private_chat_states" ADD CONSTRAINT "user_private_chat_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_registrations" ADD CONSTRAINT "user_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_robbery_states" ADD CONSTRAINT "user_robbery_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_sticker_preferences" ADD CONSTRAINT "user_sticker_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bot_identity"."user_warnings" ADD CONSTRAINT "user_warnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "bot_identity"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "audio_response_assets_response_position_uidx" ON "bot_content"."audio_response_assets" USING btree ("response_id","position");
CREATE UNIQUE INDEX "audio_responses_scope_phrase_uidx" ON "bot_content"."audio_responses" USING btree ("scope","phrase");
CREATE INDEX "bank_loan_payments_loan_created_at_idx" ON "bot_economy"."bank_loan_payments" USING btree ("loan_id","created_at");
CREATE INDEX "bank_loans_user_status_idx" ON "bot_economy"."bank_loans" USING btree ("user_id","status");
CREATE INDEX "bank_loans_due_status_idx" ON "bot_economy"."bank_loans" USING btree ("status","due_at");
CREATE UNIQUE INDEX "bank_loans_one_outstanding_per_user" ON "bot_economy"."bank_loans" USING btree ("user_id") WHERE "bot_economy"."bank_loans"."status" in ('active', 'overdue', 'defaulted');
CREATE INDEX "bot_chat_memberships_bot_joined_idx" ON "bot_runtime"."bot_chat_memberships" USING btree ("bot_id","joined");
CREATE INDEX "character_market_listings_character_status_idx" ON "bot_content"."character_market_listings" USING btree ("character_id","status");
CREATE UNIQUE INDEX "character_market_listings_one_active_uidx" ON "bot_content"."character_market_listings" USING btree ("character_id") WHERE "bot_content"."character_market_listings"."status" = 'active';
CREATE INDEX "character_price_events_character_created_idx" ON "bot_content"."character_price_events" USING btree ("character_id","created_at");
CREATE UNIQUE INDEX "characters_url_uidx" ON "bot_content"."characters" USING btree ("url");
CREATE UNIQUE INDEX "chat_memory_messages_chat_position_uidx" ON "bot_ai"."chat_memory_messages" USING btree ("chat_id","position");
CREATE INDEX "chat_memory_messages_chat_created_at_idx" ON "bot_ai"."chat_memory_messages" USING btree ("chat_id","created_at");
CREATE INDEX "command_resource_reservations_pending_expiry_idx" ON "bot_economy"."command_resource_reservations" USING btree ("status","expires_at");
CREATE INDEX "command_resource_reservations_user_idx" ON "bot_economy"."command_resource_reservations" USING btree ("user_id");
CREATE UNIQUE INDEX "financial_accounts_user_type_uidx" ON "bot_economy"."financial_accounts" USING btree ("user_id","account_type");
CREATE UNIQUE INDEX "financial_accounts_one_reserve_uidx" ON "bot_economy"."financial_accounts" USING btree ("account_type") WHERE "bot_economy"."financial_accounts"."user_id" IS NULL AND "bot_economy"."financial_accounts"."account_type" = 'reserve';
CREATE INDEX "group_command_access_rules_group_scope_idx" ON "bot_groups"."group_command_access_rules" USING btree ("group_id","scope");
CREATE INDEX "ledger_entries_account_created_idx" ON "bot_economy"."ledger_entries" USING btree ("account_id","created_at");
CREATE INDEX "ledger_entries_operation_idx" ON "bot_economy"."ledger_entries" USING btree ("operation_id");
CREATE INDEX "marriage_members_marriage_idx" ON "bot_identity"."marriage_members" USING btree ("marriage_id");
CREATE INDEX "marriage_requests_recipient_status_idx" ON "bot_identity"."marriage_requests" USING btree ("recipient_id","status");
CREATE INDEX "message_logs_group_created_at_idx" ON "bot_audit"."message_logs" USING btree ("group_id","created_at");
CREATE INDEX "message_logs_group_message_id_idx" ON "bot_audit"."message_logs" USING btree ("group_id","message_id");
CREATE UNIQUE INDEX "message_logs_group_message_uidx" ON "bot_audit"."message_logs" USING btree ("group_id","message_id");
CREATE INDEX "message_logs_user_idx" ON "bot_audit"."message_logs" USING btree ("user_id");
CREATE UNIQUE INDEX "subbot_owners_bot_position_uidx" ON "bot_runtime"."subbot_owners" USING btree ("bot_id","position");
CREATE UNIQUE INDEX "subbot_prefixes_bot_position_uidx" ON "bot_runtime"."subbot_prefixes" USING btree ("bot_id","position");
CREATE INDEX "user_cooldowns_action_idx" ON "bot_identity"."user_cooldowns" USING btree ("action","last_used_at");
CREATE INDEX "user_group_roles_group_idx" ON "bot_groups"."user_group_roles" USING btree ("group_id");
CREATE INDEX "user_group_roles_user_idx" ON "bot_groups"."user_group_roles" USING btree ("user_id");
CREATE UNIQUE INDEX "user_identities_type_value_uidx" ON "bot_identity"."user_identities" USING btree ("identity_type","identity_value");

-- PostgreSQL 18 temporal uniqueness: a recipient cannot have overlapping requests.
ALTER TABLE bot_identity.marriage_requests
    ADD CONSTRAINT marriage_requests_recipient_valid_during_uq
    UNIQUE (recipient_id, valid_during WITHOUT OVERLAPS);

-- Catalog data replaces repeated resource columns and hard-coded exchange metadata.
INSERT INTO bot_economy.resources
    (code, category, default_wallet_balance, wallet_enabled, bank_enabled, transferable)
VALUES
    ('limite',  'quota',      10,  true, true,  true),
    ('exp',     'experience', 0,   true, false, true),
    ('coins',   'currency',   100, true, true,  true),
    ('botcoin', 'currency',   0,   true, true,  false),
    ('zyxcoin', 'currency',   0,   true, true,  false);

INSERT INTO bot_economy.bank_exchange_rates
    (source_resource, target_resource, source_amount, target_amount)
VALUES
    ('exp', 'limite', 1000, 1),
    ('coins', 'limite', 10, 1),
    ('limite', 'botcoin', 10, 1),
    ('limite', 'zyxcoin', 100, 1);

-- The institutional reserve is an account, not another resource-shaped table.
WITH reserve_account AS (
    INSERT INTO bot_economy.financial_accounts (account_type)
    VALUES ('reserve')
    RETURNING id
), seed(resource_code, balance) AS (
    VALUES
        ('limite'::text, 10000000000::bigint),
        ('coins'::text, 10000000000::bigint),
        ('botcoin'::text, 1000000000::bigint),
        ('zyxcoin'::text, 1000000::bigint)
), balance_rows AS (
    INSERT INTO bot_economy.account_balances (account_id, resource_code, balance)
    SELECT reserve_account.id, seed.resource_code, seed.balance
    FROM reserve_account CROSS JOIN seed
    RETURNING account_id, resource_code, balance
), initial_operation AS (
    INSERT INTO bot_economy.financial_operations (external_id, reason, operation)
    VALUES ('bootstrap:reserve-capitalization', 'initial_capitalization', 'database_setup')
    RETURNING id
)
INSERT INTO bot_economy.ledger_entries
    (operation_id, account_id, resource_code, amount, balance_after)
SELECT initial_operation.id, balance_rows.account_id, balance_rows.resource_code,
       balance_rows.balance, balance_rows.balance
FROM initial_operation CROSS JOIN balance_rows;

-- Database-owned timestamps protect invariants when writes do not pass through Drizzle.
CREATE FUNCTION bot_runtime.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END
$$;

DO $$
DECLARE
    item record;
BEGIN
    FOR item IN
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = ANY (ARRAY[
              'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
              'bot_content', 'bot_ai', 'bot_audit'
          ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I.%I
             FOR EACH ROW EXECUTE FUNCTION bot_runtime.set_updated_at()',
            item.table_schema,
            item.table_name
        );
    END LOOP;
END
$$;

COMMENT ON SCHEMA bot_identity IS 'Canonical users, identities, registration, progression and relationships.';
COMMENT ON SCHEMA bot_economy IS 'Resource catalog, accounts, balances, immutable financial operations and ledger.';
COMMENT ON SCHEMA bot_groups IS 'Chats, group configuration modules, roles and aggregate activity.';
COMMENT ON SCHEMA bot_runtime IS 'Bot instances, memberships, operational reports, counters and protected tokens.';
COMMENT ON SCHEMA bot_content IS 'Characters, ownership, market history and audio-response assets.';
COMMENT ON SCHEMA bot_ai IS 'Normalized AI chat sessions and ordered messages.';
COMMENT ON SCHEMA bot_audit IS 'Append-oriented message audit records.';

-- Custom schemas are private by default. Direct PostgreSQL owner connections still work.
DO $$
DECLARE
    schema_name text;
    table_item record;
BEGIN
    FOREACH schema_name IN ARRAY ARRAY[
        'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
        'bot_content', 'bot_ai', 'bot_audit'
    ]
    LOOP
        EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', schema_name);
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC', schema_name);
        EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC', schema_name);

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE format('REVOKE ALL ON SCHEMA %I FROM anon', schema_name);
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon', schema_name);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM anon', schema_name);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE format('REVOKE ALL ON SCHEMA %I FROM authenticated', schema_name);
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM authenticated', schema_name);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM authenticated', schema_name);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role', schema_name);
            EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role', schema_name);
            EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO service_role', schema_name);
        END IF;
    END LOOP;

    FOR table_item IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = ANY (ARRAY[
            'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
            'bot_content', 'bot_ai', 'bot_audit'
        ])
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
            table_item.schemaname,
            table_item.tablename
        );
    END LOOP;
END
$$;

COMMIT;
