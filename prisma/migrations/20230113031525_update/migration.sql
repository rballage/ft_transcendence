/*
  Warnings:

  - The values [BLACKLISTED,WHITELISTED] on the enum `eSubscriptionState` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `public` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `salt` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `blockedUntil` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `identification_token` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `salt` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "eChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'ONE_TO_ONE');

-- AlterEnum
BEGIN;
CREATE TYPE "eSubscriptionState_new" AS ENUM ('BANNED', 'MUTED', 'OK');
ALTER TABLE "Subscription" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "state" TYPE "eSubscriptionState_new" USING ("state"::text::"eSubscriptionState_new");
ALTER TYPE "eSubscriptionState" RENAME TO "eSubscriptionState_old";
ALTER TYPE "eSubscriptionState_new" RENAME TO "eSubscriptionState";
DROP TYPE "eSubscriptionState_old";
ALTER TABLE "Subscription" ALTER COLUMN "state" SET DEFAULT 'OK';
COMMIT;

-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "public",
DROP COLUMN "salt",
ADD COLUMN     "channel_type" "eChannelType" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "blockedUntil",
ADD COLUMN     "stateActiveUntil" TIMESTAMP(3),
ALTER COLUMN "state" SET DEFAULT 'OK';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "identification_token",
DROP COLUMN "salt";
