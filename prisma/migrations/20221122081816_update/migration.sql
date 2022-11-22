/*
  Warnings:

  - You are about to drop the column `subscriptionStateId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `SubscriptionState` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `role` on table `Subscription` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channelId` on table `Subscription` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_subscriptionStateId_fkey";

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "hash" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "ReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "subscriptionStateId",
ADD COLUMN     "blockedUntil" TIMESTAMP(3),
ADD COLUMN     "state" "eSubscriptionState" NOT NULL DEFAULT 'WHITELISTED',
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "channelId" SET NOT NULL;

-- DropTable
DROP TABLE "SubscriptionState";

-- CreateIndex
CREATE INDEX "Message_CreatedAt_ReceivedAt_userId_idx" ON "Message"("CreatedAt", "ReceivedAt", "userId");
