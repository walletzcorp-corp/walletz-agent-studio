CREATE INDEX IF NOT EXISTS "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_message_logs_account_created_idx" ON "whatsapp_message_logs" USING btree ("account_id","created_at");--> statement-breakpoint
DROP INDEX IF EXISTS "messages_conversation_idx";
