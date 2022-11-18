/*
  Warnings:

  - You are about to drop the column `userId` on the `Friend` table. All the data in the column will be lost.
  - Added the required column `userName` to the `Friend` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Friend" DROP CONSTRAINT "Friend_userId_fkey";

-- AlterTable
ALTER TABLE "Friend" DROP COLUMN "userId",
ADD COLUMN     "userName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_userName_fkey" FOREIGN KEY ("userName") REFERENCES "User"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
