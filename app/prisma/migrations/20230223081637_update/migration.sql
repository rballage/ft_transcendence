-- DropIndex
DROP INDEX "Message_CreatedAt_ReceivedAt_username_idx";

-- CreateIndex
CREATE INDEX "Message_CreatedAt_idx" ON "Message"("CreatedAt");
