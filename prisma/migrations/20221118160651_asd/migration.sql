/*
  Warnings:

  - You are about to drop the column `userName` on the `Friend` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Friend" DROP CONSTRAINT "Friend_userName_fkey";

-- AlterTable
ALTER TABLE "Friend" DROP COLUMN "userName",
ADD COLUMN     "FriendName" TEXT,
ADD COLUMN     "FriendedByName" TEXT;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_FriendedByName_fkey" FOREIGN KEY ("FriendedByName") REFERENCES "User"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_FriendName_fkey" FOREIGN KEY ("FriendName") REFERENCES "User"("name") ON DELETE SET NULL ON UPDATE CASCADE;
