/*
  Warnings:

  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - Made the column `updatedAt` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar",
ADD COLUMN     "avatar_100" BYTEA,
ADD COLUMN     "avatar_250" BYTEA,
ADD COLUMN     "avatar_500" BYTEA,
ADD COLUMN     "avatar_original" BYTEA,
ALTER COLUMN "updatedAt" SET NOT NULL;
