CREATE TABLE "bank_exchange_rates" (
	"source_resource" text NOT NULL,
	"target_resource" text NOT NULL,
	"source_amount" integer NOT NULL,
	"target_amount" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_exchange_rates_source_resource_target_resource_pk" PRIMARY KEY("source_resource", "target_resource"),
	CONSTRAINT "bank_exchange_rates_source_check" CHECK ("source_resource" in ('limite', 'exp', 'coins', 'botcoin', 'zyxcoin')),
	CONSTRAINT "bank_exchange_rates_target_check" CHECK ("target_resource" in ('limite', 'coins', 'botcoin', 'zyxcoin')),
	CONSTRAINT "bank_exchange_rates_amount_check" CHECK ("source_amount" > 0 and "target_amount" > 0),
	CONSTRAINT "bank_exchange_rates_pair_check" CHECK ("source_resource" <> "target_resource")
);
--> statement-breakpoint
INSERT INTO "bank_exchange_rates" ("source_resource", "target_resource", "source_amount", "target_amount") VALUES
	('exp', 'limite', 1000, 1),
	('coins', 'limite', 10, 1),
	('limite', 'botcoin', 10, 1),
	('limite', 'zyxcoin', 100, 1);
--> statement-breakpoint
WITH "capitalization"("resource", "amount") AS (VALUES
	('limite', 10000000000::bigint),
	('coins', 10000000000::bigint),
	('botcoin', 1000000000::bigint),
	('zyxcoin', 1000000::bigint)
), "updated" AS (
	UPDATE "bank_reserves" AS "reserve"
	SET "balance" = "reserve"."balance" + "capitalization"."amount", "updated_at" = now()
	FROM "capitalization"
	WHERE "reserve"."resource" = "capitalization"."resource"
	RETURNING "reserve"."resource", "capitalization"."amount", "reserve"."balance"
)
INSERT INTO "bank_transactions" ("resource", "type", "amount", "balance_after", "operation_id")
SELECT "resource", 'initial_capitalization', "amount", "balance", 'migration_0033_initial_capital'
FROM "updated";
