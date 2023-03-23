/*
  Warnings:

  - You are about to drop the column `channel_type` on the `Channel` table. All the data in the column will be lost.
  - You are about to drop the column `passwordProtected` on the `Channel` table. All the data in the column will be lost.
  - The `role` column on the `Subscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `state` column on the `Subscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "State" AS ENUM ('BANNED', 'MUTED', 'OK');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'ONE_TO_ONE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'USER');

-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "channel_type",
DROP COLUMN "passwordProtected",
ADD COLUMN     "channelType" "ChannelType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "passwordProtected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
DROP COLUMN "state",
ADD COLUMN     "state" "State" NOT NULL DEFAULT 'OK';

-- DropEnum
DROP TYPE "eChannelType";

-- DropEnum
DROP TYPE "eRole";

-- DropEnum
DROP TYPE "eSubscriptionState";
