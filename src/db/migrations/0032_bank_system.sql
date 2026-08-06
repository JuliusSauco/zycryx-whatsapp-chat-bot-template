ALTER TABLE "wallet_transactions" ADD COLUMN "operation_id" text;
--> statement-breakpoint
CREATE INDEX "wallet_transactions_operation_idx" ON "wallet_transactions" USING btree ("operation_id");
--> statement-breakpoint
CREATE TABLE "user_bank_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"limite" integer DEFAULT 0 NOT NULL,
	"coins" integer DEFAULT 0 NOT NULL,
	"botcoin" integer DEFAULT 0 NOT NULL,
	"zyxcoin" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_bank_accounts_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE cascade,
	CONSTRAINT "user_bank_accounts_limite_non_negative" CHECK ("limite" >= 0),
	CONSTRAINT "user_bank_accounts_coins_non_negative" CHECK ("coins" >= 0),
	CONSTRAINT "user_bank_accounts_botcoin_non_negative" CHECK ("botcoin" >= 0),
	CONSTRAINT "user_bank_accounts_zyxcoin_non_negative" CHECK ("zyxcoin" >= 0),
	CONSTRAINT "user_bank_accounts_status_check" CHECK ("status" in ('active', 'frozen', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "bank_reserves" (
	"resource" text PRIMARY KEY NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_reserves_resource_check" CHECK ("resource" in ('limite', 'coins', 'botcoin', 'zyxcoin')),
	CONSTRAINT "bank_reserves_balance_non_negative" CHECK ("balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bank_loans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" text NOT NULL,
	"principal" integer NOT NULL,
	"interest_amount" integer NOT NULL,
	"principal_outstanding" integer NOT NULL,
	"interest_outstanding" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp NOT NULL,
	"default_at" timestamp NOT NULL,
	"paid_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_loans_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE cascade,
	CONSTRAINT "bank_loans_status_check" CHECK ("status" in ('active', 'overdue', 'defaulted', 'paid')),
	CONSTRAINT "bank_loans_amounts_check" CHECK ("principal" > 0 and "interest_amount" >= 0 and "principal_outstanding" between 0 and "principal" and "interest_outstanding" between 0 and "interest_amount"),
	CONSTRAINT "bank_loans_paid_check" CHECK ("status" <> 'paid' or ("principal_outstanding" = 0 and "interest_outstanding" = 0))
);
--> statement-breakpoint
CREATE INDEX "bank_loans_user_status_idx" ON "bank_loans" USING btree ("user_id", "status");
--> statement-breakpoint
CREATE INDEX "bank_loans_due_status_idx" ON "bank_loans" USING btree ("status", "due_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "bank_loans_one_outstanding_per_user" ON "bank_loans" USING btree ("user_id") WHERE "status" in ('active', 'overdue', 'defaulted');
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"user_id" text,
	"actor_id" text,
	"resource" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"operation_id" text NOT NULL,
	"loan_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_transactions_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE set null,
	CONSTRAINT "bank_transactions_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "usuarios"("id") ON DELETE set null,
	CONSTRAINT "bank_transactions_loan_id_bank_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "bank_loans"("id") ON DELETE set null,
	CONSTRAINT "bank_transactions_resource_check" CHECK ("resource" in ('limite', 'coins', 'botcoin', 'zyxcoin')),
	CONSTRAINT "bank_transactions_balance_non_negative" CHECK ("balance_after" >= 0)
);
--> statement-breakpoint
CREATE INDEX "bank_transactions_user_created_at_idx" ON "bank_transactions" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "bank_transactions_operation_idx" ON "bank_transactions" USING btree ("operation_id");
--> statement-breakpoint
CREATE TABLE "bank_loan_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"loan_id" bigint NOT NULL,
	"amount" integer NOT NULL,
	"principal_paid" integer NOT NULL,
	"interest_paid" integer NOT NULL,
	"wallet_transaction_id" bigint NOT NULL,
	"bank_transaction_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_loan_payments_loan_id_bank_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "bank_loans"("id") ON DELETE cascade,
	CONSTRAINT "bank_loan_payments_wallet_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "wallet_transactions"("id"),
	CONSTRAINT "bank_loan_payments_bank_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id"),
	CONSTRAINT "bank_loan_payments_amount_check" CHECK ("amount" > 0 and "principal_paid" >= 0 and "interest_paid" >= 0 and "amount" = "principal_paid" + "interest_paid")
);
--> statement-breakpoint
CREATE INDEX "bank_loan_payments_loan_created_at_idx" ON "bank_loan_payments" USING btree ("loan_id", "created_at");
--> statement-breakpoint
INSERT INTO "user_bank_accounts" ("user_id", "limite")
SELECT "id", GREATEST(COALESCE("banco", 0), 0) FROM "usuarios";
--> statement-breakpoint
INSERT INTO "bank_transactions" ("user_id", "resource", "type", "amount", "balance_after", "operation_id")
SELECT "user_id", 'limite', 'opening_balance', "limite", "limite", 'migration_0032:' || "user_id"
FROM "user_bank_accounts" WHERE "limite" <> 0;
--> statement-breakpoint
INSERT INTO "bank_reserves" ("resource", "balance") VALUES
	('limite', 0), ('coins', 0), ('botcoin', 0), ('zyxcoin', 0);
--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "banco";
