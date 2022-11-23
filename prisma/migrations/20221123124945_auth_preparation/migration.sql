/*
  Warnings:

  - You are about to drop the column `avatar_large` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_medium` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_thumbnail` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Avatar" ALTER COLUMN "linkThumbnail" SET DEFAULT 'avatars/default.thumbnail.svg',
ALTER COLUMN "linkMedium" SET DEFAULT 'avatars/default.medium.svg',
ALTER COLUMN "linkLarge" SET DEFAULT 'avatars/default.large.svg';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar_large",
DROP COLUMN "avatar_medium",
DROP COLUMN "avatar_thumbnail",
DROP COLUMN "hash",
ADD COLUMN     "identification_token" TEXT,
ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'null',
ADD COLUMN     "refresh_token" TEXT;
