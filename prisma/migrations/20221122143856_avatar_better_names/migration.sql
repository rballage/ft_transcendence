/*
  Warnings:

  - You are about to drop the column `avatar_100` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_250` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_500` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_original` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar_100",
DROP COLUMN "avatar_250",
DROP COLUMN "avatar_500",
DROP COLUMN "avatar_original",
ADD COLUMN     "avatar_large" BYTEA,
ADD COLUMN     "avatar_medium" BYTEA,
ADD COLUMN     "avatar_thumbnail" BYTEA;
