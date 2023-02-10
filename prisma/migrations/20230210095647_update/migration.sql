/*
  Warnings:

  - A unique constraint covering the columns `[channelId,username]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Subscription_channelId_username_key" ON "Subscription"("channelId", "username");
