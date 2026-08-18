ALTER TABLE "command_resource_reservations"
    ADD COLUMN "alternative_coins_amount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "command_resource_reservations"
    ADD COLUMN "payment_resource" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
UPDATE "command_resource_reservations"
SET "payment_resource" = CASE
    WHEN "limit_amount" > 0 AND "coins_amount" > 0 THEN 'mixed'
    WHEN "limit_amount" > 0 THEN 'limite'
    WHEN "coins_amount" > 0 THEN 'coins'
    ELSE 'none'
END;
--> statement-breakpoint
ALTER TABLE "command_resource_reservations"
    ADD CONSTRAINT "command_resource_reservations_alternative_coins_non_negative"
    CHECK ("alternative_coins_amount" >= 0);
--> statement-breakpoint
ALTER TABLE "command_resource_reservations"
    ADD CONSTRAINT "command_resource_reservations_payment_resource_check"
    CHECK ("payment_resource" in ('limite', 'coins', 'mixed', 'none'));
