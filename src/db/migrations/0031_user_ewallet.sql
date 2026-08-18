CREATE TABLE "user_wallets" (
	"user_id" text PRIMARY KEY NOT NULL,
	"limite" integer DEFAULT 10 NOT NULL,
	"exp" integer DEFAULT 0 NOT NULL,
	"coins" integer DEFAULT 100 NOT NULL,
	"botcoin" integer DEFAULT 0 NOT NULL,
	"zyxcoin" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallets_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE cascade,
	CONSTRAINT "user_wallets_limite_non_negative" CHECK ("limite" >= 0),
	CONSTRAINT "user_wallets_exp_non_negative" CHECK ("exp" >= 0),
	CONSTRAINT "user_wallets_coins_non_negative" CHECK ("coins" >= 0),
	CONSTRAINT "user_wallets_botcoin_non_negative" CHECK ("botcoin" >= 0),
	CONSTRAINT "user_wallets_zyxcoin_non_negative" CHECK ("zyxcoin" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"resource" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"operation" text,
	"counterparty_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_transactions_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE cascade,
	CONSTRAINT "wallet_transactions_counterparty_id_usuarios_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "usuarios"("id") ON DELETE set null,
	CONSTRAINT "wallet_transactions_resource_check" CHECK ("resource" in ('limite', 'exp', 'coins', 'botcoin', 'zyxcoin')),
	CONSTRAINT "wallet_transactions_balance_non_negative" CHECK ("balance_after" >= 0)
);
--> statement-breakpoint
CREATE INDEX "wallet_transactions_user_created_at_idx" ON "wallet_transactions" USING btree ("user_id", "created_at");
--> statement-breakpoint
INSERT INTO "user_wallets" ("user_id", "limite", "exp", "coins", "botcoin", "zyxcoin")
SELECT "id", GREATEST(COALESCE("limite", 0), 0), GREATEST(COALESCE("exp", 0), 0), GREATEST(COALESCE("money", 0), 0), 0, 0
FROM "usuarios";
--> statement-breakpoint
INSERT INTO "wallet_transactions" ("user_id", "resource", "amount", "balance_after", "reason", "operation")
SELECT "user_id", "resource", "balance", "balance", 'opening_balance', 'migration_0031'
FROM "user_wallets"
CROSS JOIN LATERAL (VALUES
	('limite', "limite"),
	('exp', "exp"),
	('coins', "coins")
) AS opening("resource", "balance")
WHERE "balance" <> 0;
--> statement-breakpoint
ALTER TABLE "command_resource_reservations" RENAME COLUMN "money_amount" TO "coins_amount";
--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "money";
--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "limite";
--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "exp";
