ALTER TABLE "chat"."conversations" ADD COLUMN "owner_key" text;--> statement-breakpoint
CREATE INDEX "conversations_owner_idx" ON "chat"."conversations" USING btree ("owner_key","updated_at");