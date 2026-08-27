ALTER TABLE "identity"."account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "identity"."account"
SET "issuer" = 'local:credential'
WHERE "provider_id" = 'credential';--> statement-breakpoint
DO $account_issuer_backfill$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "identity"."account"
    WHERE "issuer" IS NULL
  ) THEN
    RAISE EXCEPTION 'account issuer backfill requires an explicit issuer for non-credential accounts';
  END IF;
END
$account_issuer_backfill$;--> statement-breakpoint
ALTER TABLE "identity"."account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."account" DROP CONSTRAINT "identity_account_provider_unique";--> statement-breakpoint
ALTER TABLE "identity"."account" ADD CONSTRAINT "identity_account_issuer_unique" UNIQUE("issuer","account_id");
